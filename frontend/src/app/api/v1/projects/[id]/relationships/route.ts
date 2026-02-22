import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getRelationshipsForTrades, detectCircularDependencies, type ActivityRelationshipTemplate } from '@/lib/templates/activity-relationship-templates';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/projects/:id/relationships
 * List all activity relationships for a project
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const relationships = await prisma.tradeRelationship.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich with trade names
    const tradeIds = new Set<string>();
    for (const r of relationships) {
      tradeIds.add(r.predecessorTradeId);
      tradeIds.add(r.successorTradeId);
    }

    const trades = await prisma.trade.findMany({
      where: { id: { in: [...tradeIds] } },
      select: { id: true, name: true, code: true, color: true },
    });
    const tradeMap = new Map(trades.map((t) => [t.id, t]));

    const enriched = relationships.map((r) => {
      const pred = tradeMap.get(r.predecessorTradeId);
      const succ = tradeMap.get(r.successorTradeId);
      return {
        ...r,
        predecessorTradeName: pred?.name || '',
        predecessorTradeCode: pred?.code || '',
        predecessorTradeColor: pred?.color || '#999',
        successorTradeName: succ?.name || '',
        successorTradeCode: succ?.code || '',
        successorTradeColor: succ?.color || '#999',
      };
    });

    return NextResponse.json({
      data: enriched,
      meta: { total: enriched.length },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

/**
 * POST /api/v1/projects/:id/relationships
 * Create a single activity relationship
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const body = await request.json();

    const { predecessorTradeId, successorTradeId, type, lagDays, mandatory, description } = body;

    if (!predecessorTradeId || !successorTradeId || !type) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION', message: 'predecessorTradeId, successorTradeId, and type are required' } },
        { status: 400 },
      );
    }

    if (!['FS', 'SS', 'FF', 'SF'].includes(type)) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION', message: 'type must be FS, SS, FF, or SF' } },
        { status: 400 },
      );
    }

    if (predecessorTradeId === successorTradeId) {
      return NextResponse.json(
        { data: null, error: { code: 'SELF_REFERENCE', message: 'A trade cannot be its own predecessor' } },
        { status: 400 },
      );
    }

    const relationship = await prisma.tradeRelationship.create({
      data: {
        projectId,
        predecessorTradeId,
        successorTradeId,
        type,
        lagDays: lagDays ?? 0,
        mandatory: mandatory ?? true,
        description: description || null,
        source: 'manual',
      },
    });

    return NextResponse.json({ data: relationship, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
