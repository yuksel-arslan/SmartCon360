import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// Module definitions with their associated data counts
const MODULE_DEFS = [
  { id: 'taktflow', name: 'TaktFlow' },
  { id: 'qualitygate', name: 'QualityGate' },
  { id: 'safezone', name: 'SafeZone' },
  { id: 'costpilot', name: 'CostPilot' },
  { id: 'crewflow', name: 'CrewFlow' },
  { id: 'supplychain', name: 'SupplyChain' },
  { id: 'riskradar', name: 'RiskRadar' },
  { id: 'claimshield', name: 'ClaimShield' },
  { id: 'commhub', name: 'CommHub' },
  { id: 'stakehub', name: 'StakeHub' },
  { id: 'greensite', name: 'GreenSite' },
  { id: 'visionai', name: 'VisionAI' },
  { id: 'hub', name: 'SmartCon360 Hub' },
] as const;

// GET /api/v1/hub/modules/:id — Module status for a project
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 },
      );
    }

    // Count takt plans and constraints as indicators for active modules
    const [taktPlanCount, constraintCount, tradeCount, locationCount] = await Promise.all([
      prisma.taktPlan.count({ where: { projectId } }),
      prisma.constraint.count({ where: { projectId } }),
      prisma.trade.count({ where: { projectId, isActive: true } }),
      prisma.location.count({ where: { projectId, isActive: true } }),
    ]);

    const modules = MODULE_DEFS.map((mod) => {
      let active = false;
      let records = 0;

      switch (mod.id) {
        case 'taktflow':
          active = taktPlanCount > 0 || tradeCount > 0;
          records = taktPlanCount + tradeCount + locationCount;
          break;
        case 'commhub':
          active = constraintCount > 0;
          records = constraintCount;
          break;
        case 'hub':
          active = true;
          records = 1;
          break;
        default:
          active = false;
          records = 0;
      }

      return { id: mod.id, name: mod.name, active, records };
    });

    return NextResponse.json({ data: modules, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
