import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { getPlan } from '@/lib/stores/takt-plans';

type Params = { params: Promise<{ planId: string }> };

// GET /api/v1/takt/compute/summary/:planId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const plan = getPlan(planId);

    if (!plan) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      );
    }

    const assignments = plan.assignments as Record<string, unknown>[];
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === 'completed').length;
    const inProgress = assignments.filter((a) => a.status === 'in_progress').length;
    const delayed = assignments.filter((a) => a.status === 'delayed').length;
    const planned = assignments.filter((a) => a.status === 'planned').length;

    return NextResponse.json({
      data: {
        totalPeriods: plan.totalPeriods,
        totalDays: (plan.totalPeriods as number) * (plan.taktTime as number),
        startDate: plan.startDate,
        endDate: plan.endDate,
        numZones: plan.numZones,
        numTrades: plan.numTrades,
        completedAssignments: completed,
        inProgressAssignments: inProgress,
        plannedAssignments: planned,
        delayedAssignments: delayed,
        overallProgressPct: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}
