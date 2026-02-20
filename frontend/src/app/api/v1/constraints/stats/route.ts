import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/constraints/stats — Constraint statistics + CRR
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: Record<string, unknown> = {};
    if (userId) where.project = { ownerId: userId };
    if (projectId) where.projectId = projectId;

    const [total, open, inProgress, resolved] = await Promise.all([
      prisma.constraint.count({ where }),
      prisma.constraint.count({ where: { ...where, status: 'open' } }),
      prisma.constraint.count({ where: { ...where, status: 'in_progress' } }),
      prisma.constraint.count({ where: { ...where, status: 'resolved' } }),
    ]);

    // CRR = resolved / total (or 100% if no constraints)
    const crr = total > 0 ? Math.round((resolved / total) * 100) : 100;

    // Category breakdown
    const byCategory = await prisma.constraint.groupBy({
      by: ['category'],
      where,
      _count: true,
    });

    // Priority breakdown
    const byPriority = await prisma.constraint.groupBy({
      by: ['priority'],
      where,
      _count: true,
    });

    return NextResponse.json({
      data: {
        total,
        open,
        inProgress,
        resolved,
        crr,
        byCategory: byCategory.map((c) => ({ category: c.category, count: c._count })),
        byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
