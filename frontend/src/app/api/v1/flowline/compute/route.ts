import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { computeFlowline, saveFlowline } from '@/lib/services/flowline.service';

// POST /api/v1/flowline/compute
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const { zones, trades, takt_time = 1, buffer_size = 1 } = await request.json();

    if (!zones?.length || !trades?.length) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION', message: 'zones and trades are required' } },
        { status: 400 }
      );
    }

    const planId = uuidv4();
    const flowline = computeFlowline(zones, trades, takt_time, buffer_size);
    const data = { planId, ...flowline };
    saveFlowline(planId, data);

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
