import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getRelationshipsForTrades } from '@/lib/templates/activity-relationship-templates';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/projects/:id/relationships/apply-templates
 * Apply all relationship templates to the project (idempotent)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectType: true },
    });

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 },
      );
    }

    const trades = await prisma.trade.findMany({
      where: { projectId, isActive: true },
      select: { id: true, code: true },
    });

    const codeToId = new Map(trades.map((t) => [t.code, t.id]));
    const tradeCodes = trades.map((t) => t.code);
    const templates = getRelationshipsForTrades(tradeCodes, project.projectType);

    const created = [];
    let skipped = 0;

    for (const rel of templates) {
      const predId = codeToId.get(rel.predecessorCode);
      const succId = codeToId.get(rel.successorCode);
      if (!predId || !succId) {
        skipped++;
        continue;
      }

      try {
        const relationship = await prisma.tradeRelationship.create({
          data: {
            projectId,
            predecessorTradeId: predId,
            successorTradeId: succId,
            type: rel.type,
            lagDays: rel.lagDays,
            mandatory: rel.mandatory,
            description: rel.description,
            source: 'template',
          },
        });
        created.push(relationship);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
          skipped++;
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json(
      {
        data: created,
        meta: {
          templatesAvailable: templates.length,
          created: created.length,
          skipped,
        },
        error: null,
      },
      { status: 201 },
    );
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
