// EVM Service — Earned Value Management

import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { calculateEVM, type EVMMetrics } from '../utils/evm-calculator';
import { getCostPolicies } from '../utils/policy-client';

export class EvmService {
  /**
   * Calculate and save EVM snapshot for a project
   */
  async createSnapshot(
    projectId: string,
    snapshotDate: Date | string,
    pv: number,
    ev: number,
    ac: number,
    bac: number
  ): Promise<EVMMetrics> {
    // Calculate EVM metrics
    const metrics = calculateEVM({ pv, ev, ac, bac });

    // Save snapshot
    await prisma.evmSnapshot.create({
      data: {
        projectId,
        snapshotDate: new Date(snapshotDate),
        pv: metrics.pv,
        ev: metrics.ev,
        ac: metrics.ac,
        cv: metrics.cv,
        sv: metrics.sv,
        cpi: metrics.cpi,
        spi: metrics.spi,
        eac: metrics.eac,
        etc: metrics.etc,
        vac: metrics.vac,
        tcpi: metrics.tcpi,
      },
    });

    return metrics;
  }

  /**
   * Calculate EVM automatically from project data.
   * Checks contract policy — EVM may be disabled for certain commercial models
   * (e.g., build_share, revenue_share where traditional EVM is not applicable).
   */
  async calculateFromProject(projectId: string, snapshotDate: Date | string) {
    // Check if EVM is enabled by contract policy
    const policies = await getCostPolicies(projectId);
    if (!policies.evmEnabled) {
      return {
        disabled: true,
        reason: 'EVM is not applicable for this contract model. Use progress-based tracking instead.',
        progressMeasurement: policies.progressMeasurement,
      };
    }

    // Get budget (BAC)
    const budget = await prisma.budget.findFirst({
      where: { projectId, status: 'active' },
    });

    if (!budget) {
      throw new NotFoundError('Active budget for project', projectId);
    }

    const bac = parseFloat(budget.totalAmount.toString());

    // Get latest payment certificate for EV
    const latestPayment = await prisma.paymentCertificate.findFirst({
      where: {
        projectId,
        status: { in: ['approved', 'paid'] },
      },
      orderBy: { periodNumber: 'desc' },
    });

    const ev = latestPayment
      ? parseFloat(latestPayment.cumulativeAmount.toString())
      : 0;

    // Get actual costs (AC)
    const costRecords = await prisma.costRecord.findMany({
      where: {
        projectId,
        type: 'actual',
        date: { lte: new Date(snapshotDate) },
      },
    });

    const ac = costRecords.reduce(
      (sum, record) => sum + parseFloat(record.amount.toString()),
      0
    );

    // Calculate PV (planned value) based on schedule
    // TODO: Integrate with TaktFlow progress data
    // For now, use simple linear projection
    const today = new Date();
    const projectStart = new Date(2026, 0, 1); // TODO: Get from project
    const projectEnd = new Date(2026, 11, 31); // TODO: Get from project
    const totalDuration = projectEnd.getTime() - projectStart.getTime();
    const elapsed = today.getTime() - projectStart.getTime();
    const plannedProgressPct = Math.min((elapsed / totalDuration) * 100, 100);
    const pv = (bac * plannedProgressPct) / 100;

    return await this.createSnapshot(projectId, snapshotDate, pv, ev, ac, bac);
  }

  /**
   * Get latest EVM snapshot for project
   */
  async getLatest(projectId: string) {
    const snapshot = await prisma.evmSnapshot.findFirst({
      where: { projectId },
      orderBy: { snapshotDate: 'desc' },
    });

    if (!snapshot) {
      throw new NotFoundError('EVM snapshot for project', projectId);
    }

    return snapshot;
  }

  /**
   * Get EVM history (S-curve data)
   */
  async getHistory(projectId: string, startDate?: Date | string, endDate?: Date | string) {
    const where: any = { projectId };

    if (startDate || endDate) {
      where.snapshotDate = {};
      if (startDate) where.snapshotDate.gte = new Date(startDate);
      if (endDate) where.snapshotDate.lte = new Date(endDate);
    }

    return await prisma.evmSnapshot.findMany({
      where,
      orderBy: { snapshotDate: 'asc' },
    });
  }

  /**
   * Get S-curve data for chart
   */
  async getSCurveData(projectId: string) {
    const snapshots = await this.getHistory(projectId);

    return snapshots.map((snapshot) => ({
      date: snapshot.snapshotDate,
      pv: parseFloat(snapshot.pv.toString()),
      ev: parseFloat(snapshot.ev.toString()),
      ac: parseFloat(snapshot.ac.toString()),
    }));
  }
}

export const evmService = new EvmService();
