// Hub Routes — SmartCon360 Hub Orchestrator
// Cross-module aggregation, Project Health Score, unified dashboard data

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', module: 'hub', timestamp: new Date().toISOString() });
});

// ─── PROJECT HEALTH SCORE ────────────────────────────────────────────────────

/**
 * GET /hub/project-health/:projectId
 * Computes a 0-100 overall health score from all module KPIs.
 * Components: schedule, quality, safety, cost, resource, constraint, risk
 */
router.get('/project-health/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const [schedule, quality, safety, cost, resource, constraint, risk] = await Promise.all([
      getScheduleHealth(projectId),
      getQualityHealth(projectId),
      getSafetyHealth(projectId),
      getCostHealth(projectId),
      getResourceHealth(projectId),
      getConstraintHealth(projectId),
      getRiskHealth(projectId),
    ]);

    // Weighted composite: schedule 25%, quality 15%, safety 15%, cost 15%, resource 10%, constraint 10%, risk 10%
    const overall = Math.round(
      schedule.score * 0.25 +
      quality.score * 0.15 +
      safety.score * 0.15 +
      cost.score * 0.15 +
      resource.score * 0.10 +
      constraint.score * 0.10 +
      risk.score * 0.10
    );

    const recommendations = generateRecommendations({ schedule, quality, safety, cost, resource, constraint, risk });

    res.json({
      data: {
        projectId,
        overallScore: overall,
        components: { schedule, quality, safety, cost, resource, constraint, risk },
        recommendations,
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── DASHBOARD SUMMARY ──────────────────────────────────────────────────────

/**
 * GET /hub/dashboard/:projectId
 * Unified KPI summary for the main dashboard.
 */
router.get('/dashboard/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const [
      // Quality
      openNcrs,
      totalInspections,
      passedInspections,
      // Safety
      openIncidents,
      activePermits,
      // Cost
      latestEvm,
      // Resources
      activeCrews,
      totalWorkers,
      // Supply chain
      openPOs,
      overdueDeliveries,
      // Risk
      activeRisks,
      highRisks,
      // Claims
      openClaims,
      pendingChangeOrders,
      // Communication
      openRfis,
      // Constraints
      openConstraints,
      criticalConstraints,
      // Sustainability
      certifications,
    ] = await Promise.all([
      prisma.ncr.count({ where: { projectId, status: { not: 'closed' } } }),
      prisma.inspection.count({ where: { projectId } }),
      prisma.inspection.count({ where: { projectId, result: 'pass' } }),
      prisma.incident.count({ where: { projectId, status: { not: 'closed' } } }),
      prisma.permitToWork.count({ where: { projectId, status: 'approved' } }),
      prisma.evmSnapshot.findFirst({ where: { projectId }, orderBy: { snapshotDate: 'desc' } }),
      prisma.crew.count({ where: { projectId, status: 'active' } }),
      prisma.crew.aggregate({ where: { projectId, status: 'active' }, _sum: { workerCount: true } }),
      prisma.purchaseOrder.count({ where: { projectId, status: { in: ['draft', 'submitted', 'approved', 'ordered'] } } }),
      prisma.delivery.count({ where: { projectId, status: 'scheduled', scheduledDate: { lt: new Date() } } }),
      prisma.risk.count({ where: { projectId, status: 'open' } }),
      prisma.risk.count({ where: { projectId, status: 'open', severity: { in: ['critical', 'high'] } } }),
      prisma.claim.count({ where: { projectId, status: { in: ['draft', 'submitted', 'under_review'] } } }),
      prisma.changeOrder.count({ where: { projectId, status: { in: ['draft', 'submitted', 'under_review'] } } }),
      prisma.rfi.count({ where: { projectId, status: { not: 'closed' } } }),
      prisma.constraint.count({ where: { projectId, status: 'open' } }),
      prisma.constraint.count({ where: { projectId, status: 'open', priority: 'critical' } }),
      prisma.certification.count({ where: { projectId } }),
    ]);

    const ftrRate = totalInspections > 0
      ? Math.round((passedInspections / totalInspections) * 100)
      : 0;

    res.json({
      data: {
        quality: { openNcrs, ftrRate, totalInspections },
        safety: { openIncidents, activePermits },
        cost: {
          cpi: latestEvm?.cpi ?? null,
          spi: latestEvm?.spi ?? null,
          budgetVariance: latestEvm ? (latestEvm.earnedValue - latestEvm.actualCost) : null,
        },
        resources: { activeCrews, totalWorkers: totalWorkers._sum.workerCount ?? 0 },
        supply: { openPOs, overdueDeliveries },
        risk: { activeRisks, highRisks },
        claims: { openClaims, pendingChangeOrders },
        communication: { openRfis },
        constraints: { open: openConstraints, critical: criticalConstraints },
        sustainability: { certifications },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── MODULE STATUS ──────────────────────────────────────────────────────────

/**
 * GET /hub/modules/:projectId
 * Status overview for each module (has data or not, alert counts).
 */
router.get('/modules/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const [
      inspections, ncrs, incidents, permits,
      evmSnapshots, crews, purchaseOrders,
      risks, claims, changeOrders, rfis,
      stakeholders, carbonRecords, certifications,
    ] = await Promise.all([
      prisma.inspection.count({ where: { projectId } }),
      prisma.ncr.count({ where: { projectId } }),
      prisma.incident.count({ where: { projectId } }),
      prisma.permitToWork.count({ where: { projectId } }),
      prisma.evmSnapshot.count({ where: { projectId } }),
      prisma.crew.count({ where: { projectId } }),
      prisma.purchaseOrder.count({ where: { projectId } }),
      prisma.risk.count({ where: { projectId } }),
      prisma.claim.count({ where: { projectId } }),
      prisma.changeOrder.count({ where: { projectId } }),
      prisma.rfi.count({ where: { projectId } }),
      prisma.stakeholder.count({ where: { projectId } }),
      prisma.carbonRecord.count({ where: { projectId } }),
      prisma.certification.count({ where: { projectId } }),
    ]);

    res.json({
      data: [
        { id: 'quality', name: 'QualityGate', active: inspections + ncrs > 0, records: inspections + ncrs },
        { id: 'safety', name: 'SafeZone', active: incidents + permits > 0, records: incidents + permits },
        { id: 'cost', name: 'CostPilot', active: evmSnapshots > 0, records: evmSnapshots },
        { id: 'resources', name: 'CrewFlow', active: crews > 0, records: crews },
        { id: 'supply', name: 'SupplyChain', active: purchaseOrders > 0, records: purchaseOrders },
        { id: 'risk', name: 'RiskRadar', active: risks > 0, records: risks },
        { id: 'claims', name: 'ClaimShield', active: claims + changeOrders > 0, records: claims + changeOrders },
        { id: 'communication', name: 'CommHub', active: rfis > 0, records: rfis },
        { id: 'stakeholders', name: 'StakeHub', active: stakeholders > 0, records: stakeholders },
        { id: 'sustainability', name: 'GreenSite', active: carbonRecords + certifications > 0, records: carbonRecords + certifications },
      ],
    });
  } catch (error) {
    next(error);
  }
});

// ─── HEALTH SCORE HELPERS ───────────────────────────────────────────────────

interface HealthComponent {
  score: number;
  label: string;
  details: string;
}

async function getScheduleHealth(projectId: string): Promise<HealthComponent> {
  const latestPpc = await prisma.pPCRecord.findFirst({
    where: { projectId },
    orderBy: { weekEnd: 'desc' },
  });
  const ppc = latestPpc?.ppcPercent ?? 0;
  // PPC 85%+ = 100 score, linearly down to 0 at PPC 0%
  const score = Math.min(100, Math.round((ppc / 85) * 100));
  const details = ppc > 0 ? `PPC at ${ppc}%` : 'No PPC data';
  return { score, label: 'Schedule', details };
}

async function getQualityHealth(projectId: string): Promise<HealthComponent> {
  const [total, passed, openNcrs] = await Promise.all([
    prisma.inspection.count({ where: { projectId } }),
    prisma.inspection.count({ where: { projectId, result: 'pass' } }),
    prisma.ncr.count({ where: { projectId, status: { not: 'closed' } } }),
  ]);
  if (total === 0) return { score: 100, label: 'Quality', details: 'No inspections yet' };
  const ftr = (passed / total) * 100;
  const ncrPenalty = Math.min(30, openNcrs * 5);
  const score = Math.max(0, Math.round(ftr - ncrPenalty));
  return { score, label: 'Quality', details: `FTR ${Math.round(ftr)}%, ${openNcrs} open NCRs` };
}

async function getSafetyHealth(projectId: string): Promise<HealthComponent> {
  const [openIncidents, totalObservations] = await Promise.all([
    prisma.incident.count({ where: { projectId, status: { not: 'closed' } } }),
    prisma.safetyObservation.count({ where: { projectId } }),
  ]);
  if (openIncidents === 0 && totalObservations === 0) return { score: 100, label: 'Safety', details: 'No incidents' };
  const incidentPenalty = Math.min(60, openIncidents * 20);
  const score = Math.max(0, 100 - incidentPenalty);
  return { score, label: 'Safety', details: `${openIncidents} open incidents` };
}

async function getCostHealth(projectId: string): Promise<HealthComponent> {
  const latest = await prisma.evmSnapshot.findFirst({
    where: { projectId },
    orderBy: { snapshotDate: 'desc' },
  });
  if (!latest) return { score: 100, label: 'Cost', details: 'No EVM data' };
  const cpi = latest.cpi ?? 1;
  const spi = latest.spi ?? 1;
  // CPI 1.0 = perfect, >1 = under budget, <1 = over budget
  const cpiScore = Math.min(100, Math.round(Math.min(cpi, 1.2) / 1.2 * 100));
  const spiScore = Math.min(100, Math.round(Math.min(spi, 1.2) / 1.2 * 100));
  const score = Math.round((cpiScore + spiScore) / 2);
  return { score, label: 'Cost', details: `CPI ${cpi.toFixed(2)}, SPI ${spi.toFixed(2)}` };
}

async function getResourceHealth(projectId: string): Promise<HealthComponent> {
  const crews = await prisma.crew.findMany({
    where: { projectId, status: 'active' },
    select: { utilization: true },
  });
  if (crews.length === 0) return { score: 100, label: 'Resources', details: 'No active crews' };
  const avgUtil = crews.reduce((sum, c) => sum + (c.utilization ?? 0), 0) / crews.length;
  // 70-90% utilization is ideal
  const score = avgUtil >= 70 && avgUtil <= 90
    ? 100
    : avgUtil < 70
      ? Math.round((avgUtil / 70) * 100)
      : Math.max(0, Math.round(100 - (avgUtil - 90) * 5));
  return { score, label: 'Resources', details: `Avg utilization ${Math.round(avgUtil)}%` };
}

async function getConstraintHealth(projectId: string): Promise<HealthComponent> {
  const [open, total] = await Promise.all([
    prisma.constraint.count({ where: { projectId, status: 'open' } }),
    prisma.constraint.count({ where: { projectId } }),
  ]);
  if (total === 0) return { score: 100, label: 'Constraints', details: 'No constraints' };
  const resolved = total - open;
  const crr = (resolved / total) * 100;
  const score = Math.round(crr);
  return { score, label: 'Constraints', details: `CRR ${Math.round(crr)}%, ${open} open` };
}

async function getRiskHealth(projectId: string): Promise<HealthComponent> {
  const [total, critical, mitigated] = await Promise.all([
    prisma.risk.count({ where: { projectId } }),
    prisma.risk.count({ where: { projectId, status: 'open', severity: { in: ['critical', 'high'] } } }),
    prisma.risk.count({ where: { projectId, status: { in: ['mitigated', 'closed'] } } }),
  ]);
  if (total === 0) return { score: 100, label: 'Risk', details: 'No risks registered' };
  const critPenalty = Math.min(50, critical * 15);
  const mitRate = (mitigated / total) * 100;
  const score = Math.max(0, Math.round(mitRate - critPenalty));
  return { score, label: 'Risk', details: `${critical} high/critical open, ${Math.round(mitRate)}% mitigated` };
}

// ─── RECOMMENDATIONS ────────────────────────────────────────────────────────

function generateRecommendations(components: Record<string, HealthComponent>): string[] {
  const recs: string[] = [];

  if (components.schedule.score < 70) {
    recs.push('Schedule health is below target. Review delayed takt assignments and update the weekly work plan.');
  }
  if (components.quality.score < 70) {
    recs.push('Quality score is low. Focus on resolving open NCRs and improving First Time Right rate.');
  }
  if (components.safety.score < 80) {
    recs.push('Open safety incidents need immediate attention. Conduct toolbox talks and review PTW procedures.');
  }
  if (components.cost.score < 70) {
    recs.push('Cost performance is below target. Review EVM trends and identify budget variance root causes.');
  }
  if (components.resource.score < 70) {
    recs.push('Crew utilization is suboptimal. Consider rebalancing workload across takt zones.');
  }
  if (components.constraint.score < 60) {
    recs.push('Many unresolved constraints. Prioritize constraint removal in the lookahead planning session.');
  }
  if (components.risk.score < 60) {
    recs.push('Risk exposure is high. Update mitigation plans for critical and high-severity risks.');
  }

  if (recs.length === 0) {
    recs.push('Project health is strong across all areas. Maintain current momentum.');
  }

  return recs;
}

export default router;
