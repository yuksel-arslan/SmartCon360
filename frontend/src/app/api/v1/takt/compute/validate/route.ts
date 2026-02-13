import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getPlan } from '@/lib/stores/takt-plans';
import {
  generateTaktGrid,
  detectTradeStacking,
  type ZoneInput,
  type WagonInput,
} from '@/lib/core/takt-calculator';

// POST /api/v1/takt/compute/validate
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { planId } = await request.json();
    const plan = getPlan(planId);

    if (!plan) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      );
    }

    const zones = (plan.zones as Record<string, unknown>[]).map((z) => ({
      id: z.id as string,
      name: z.name as string,
      sequence: z.sequence as number,
    })) as ZoneInput[];

    const wagons = (plan.wagons as Record<string, unknown>[]).map((w) => ({
      id: w.id as string,
      tradeId: w.tradeId as string,
      sequence: w.sequence as number,
      durationDays: w.durationDays as number,
      bufferAfter: (w.bufferAfter as number) || 0,
    })) as WagonInput[];

    const assignments = generateTaktGrid(
      zones, wagons,
      new Date(plan.startDate as string),
      plan.taktTime as number
    );

    const stacking = detectTradeStacking(assignments);

    return NextResponse.json({
      data: {
        valid: stacking.length === 0,
        tradeStacking: stacking,
        totalConflicts: stacking.length,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
