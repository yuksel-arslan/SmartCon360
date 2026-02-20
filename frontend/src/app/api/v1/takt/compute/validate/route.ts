import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { forwardRequest } from '@/lib/backend-proxy';
import {
  generateTaktGrid,
  detectTradeStacking,
  type ZoneInput,
  type WagonInput,
} from '@/lib/core/takt-calculator';

// POST /api/v1/takt/compute/validate
// Accepts either a planId (to fetch from core-service) or inline zones/wagons
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const body = await request.json();

    // If planId provided, fetch from core-service
    if (body.planId) {
      const auth = request.headers.get('authorization');
      const res = await forwardRequest(`/takt/plans/${body.planId}`, 'GET', undefined, auth);
      if (!res.ok) {
        return NextResponse.json(
          { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
          { status: 404 }
        );
      }
      const { data: plan } = await res.json();

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
    }

    // Inline validation: zones and wagons provided directly
    const { zones, wagons, takt_time, start_date } = body;
    if (!zones || !wagons) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'zones and wagons are required' } },
        { status: 400 }
      );
    }

    const assignments = generateTaktGrid(
      zones as ZoneInput[],
      wagons as WagonInput[],
      new Date(start_date || new Date()),
      takt_time || 5
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
