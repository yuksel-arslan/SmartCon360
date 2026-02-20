import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  generateTaktGrid,
  detectTradeStacking,
  calculateTotalPeriods,
  addWorkingDays,
  type ZoneInput,
  type WagonInput,
} from '@/lib/core/takt-calculator';

const wagonSchema = z.object({
  tradeId: z.string(),
  sequence: z.number().int().min(1),
  durationDays: z.number().int().min(1).max(30),
  crewSize: z.number().int().optional(),
  bufferAfter: z.number().int().min(0).default(0),
});

const createPlanSchema = z.object({
  projectId: z.string(),
  name: z.string().max(255),
  taktTime: z.number().int().min(1).max(30),
  startDate: z.string(),
  bufferType: z.string().default('time'),
  bufferSize: z.number().int().min(0).default(0),
  zoneIds: z.array(z.string()).min(1),
  zoneNames: z.array(z.string()).default([]),
  wagons: z.array(wagonSchema).min(1),
});

// POST /api/v1/takt/plans — Create a new takt plan
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const body = await request.json();
    const req = createPlanSchema.parse(body);
    const planId = uuidv4();

    // Build zones
    const zones: ZoneInput[] = req.zoneIds.map((zoneId, i) => ({
      id: zoneId,
      name: req.zoneNames[i] || `Zone ${String.fromCharCode(65 + i)}`,
      sequence: i + 1,
    }));

    // Build wagons
    const wagons: WagonInput[] = req.wagons.map((w) => ({
      id: uuidv4(),
      tradeId: w.tradeId,
      sequence: w.sequence,
      durationDays: w.durationDays,
      bufferAfter: w.bufferAfter,
    }));

    const startDate = new Date(req.startDate);
    const assignments = generateTaktGrid(zones, wagons, startDate, req.taktTime);
    const totalPeriods = calculateTotalPeriods(zones.length, wagons.length, req.bufferSize);
    const endDate = addWorkingDays(startDate, totalPeriods * req.taktTime);
    const stacking = detectTradeStacking(assignments);

    const plan = {
      id: planId,
      projectId: req.projectId,
      name: req.name,
      version: 1,
      status: 'draft',
      taktTime: req.taktTime,
      numZones: zones.length,
      numTrades: wagons.length,
      totalPeriods,
      startDate: req.startDate,
      endDate: endDate.toISOString().split('T')[0],
      bufferType: req.bufferType,
      bufferSize: req.bufferSize,
      generatedBy: 'manual',
      zones: zones.map((z) => ({
        id: z.id, planId, name: z.name,
        code: `Z${String.fromCharCode(64 + z.sequence)}`,
        sequence: z.sequence,
      })),
      wagons: wagons.map((w) => ({
        id: w.id, planId, tradeId: w.tradeId,
        sequence: w.sequence, durationDays: w.durationDays,
        bufferAfter: w.bufferAfter,
      })),
      assignments: assignments.map((a) => ({
        id: uuidv4(),
        planId,
        zoneId: a.zoneId,
        wagonId: a.wagonId,
        periodNumber: a.periodNumber,
        plannedStart: a.plannedStart.toISOString().split('T')[0],
        plannedEnd: a.plannedEnd.toISOString().split('T')[0],
        status: 'planned',
        progressPct: 0,
      })),
      tradeStackingWarnings: stacking,
    };

    // Persist to database via Prisma
    await prisma.$transaction(async (tx) => {
      await tx.taktPlan.create({
        data: {
          id: plan.id,
          projectId: plan.projectId,
          name: plan.name,
          version: plan.version,
          status: plan.status,
          taktTime: plan.taktTime,
          startDate: new Date(plan.startDate),
          endDate: new Date(plan.endDate),
          bufferType: plan.bufferType,
          bufferSize: plan.bufferSize,
          generatedBy: plan.generatedBy,
          totalPeriods: plan.totalPeriods,
        },
      });
      if (plan.zones.length) {
        await tx.taktZone.createMany({
          data: plan.zones.map((z: { id: string; name: string; code: string; sequence: number }) => ({
            id: z.id, planId: plan.id, name: z.name, code: z.code, sequence: z.sequence,
          })),
        });
      }
      if (plan.wagons.length) {
        await tx.taktWagon.createMany({
          data: plan.wagons.map((w: { id: string; tradeId: string; sequence: number; durationDays: number; bufferAfter: number }) => ({
            id: w.id, planId: plan.id, tradeId: w.tradeId, sequence: w.sequence, durationDays: w.durationDays, bufferAfter: w.bufferAfter,
          })),
        });
      }
      if (plan.assignments.length) {
        await tx.taktAssignment.createMany({
          data: plan.assignments.map((a: { id: string; zoneId: string; wagonId: string; periodNumber: number; plannedStart: string; plannedEnd: string; status: string; progressPct: number }) => ({
            id: a.id, planId: plan.id, zoneId: a.zoneId, wagonId: a.wagonId, periodNumber: a.periodNumber,
            plannedStart: new Date(a.plannedStart), plannedEnd: new Date(a.plannedEnd), status: a.status, progressPct: a.progressPct,
          })),
        });
      }
    });

    return NextResponse.json({ data: plan, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
