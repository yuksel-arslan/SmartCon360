import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/hub/dashboard/:id — Cross-module dashboard summary
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

    // Gather constraint stats as the primary available data source
    const [openConstraints, criticalConstraints] = await Promise.all([
      prisma.constraint.count({ where: { projectId, status: { in: ['open', 'in_progress'] } } }),
      prisma.constraint.count({ where: { projectId, status: 'open', priority: 'critical' } }),
    ]);

    // Return dashboard summary with available data and zero-defaults for unimplemented modules
    return NextResponse.json({
      data: {
        quality: { openNcrs: 0, ftrRate: 0, totalInspections: 0 },
        safety: { openIncidents: 0, activePermits: 0 },
        cost: { cpi: null, spi: null, budgetVariance: null },
        resources: { activeCrews: 0, totalWorkers: 0 },
        supply: { openPOs: 0, overdueDeliveries: 0 },
        risk: { activeRisks: 0, highRisks: 0 },
        claims: { openClaims: 0, pendingChangeOrders: 0 },
        communication: { openRfis: 0 },
        constraints: { open: openConstraints, critical: criticalConstraints },
        sustainability: { certifications: 0 },
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
