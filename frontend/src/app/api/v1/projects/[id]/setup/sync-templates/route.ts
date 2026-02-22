import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getTradesForProjectType } from '@/lib/templates/trade-discipline-templates';
import { getRelationshipsForTrades } from '@/lib/templates/activity-relationship-templates';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/projects/:id/setup/sync-templates
 *
 * Synchronize existing project trades with the latest template definitions.
 * ONLY updates trades that already exist in the project (matched by code).
 * Never creates new trades — trade selection is done in Project Setup.
 *
 * - Updates name, color, sortOrder, discipline for existing trades
 * - Rebuilds predecessorTradeIds from template definitions
 * - Re-applies activity relationships for existing trades
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

    const templates = getTradesForProjectType(project.projectType);
    const templateByCode = new Map(templates.map((t) => [t.code, t]));

    // Get existing project trades — these are what the user selected in Project Setup
    const existingTrades = await prisma.trade.findMany({
      where: { projectId, isActive: true },
    });

    const updated: string[] = [];

    // Update existing trades to match latest template definitions
    for (const trade of existingTrades) {
      const template = templateByCode.get(trade.code);
      if (template) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            name: template.name,
            color: template.color,
            sortOrder: template.sortOrder,
            discipline: template.discipline,
            defaultCrewSize: template.defaultCrewSize,
          },
        });
        updated.push(trade.code);
      }
    }

    // Rebuild code → id map with active trades only
    const codeToId = new Map(existingTrades.map((t) => [t.code, t.id]));
    const tradeCodes = existingTrades.map((t) => t.code);

    // Resolve predecessorTradeIds from template predecessorCodes
    for (const trade of existingTrades) {
      const template = templateByCode.get(trade.code);
      if (!template) continue;

      const resolvedIds = template.predecessorCodes
        .map((code) => codeToId.get(code))
        .filter((id): id is string => !!id);

      await prisma.trade.update({
        where: { id: trade.id },
        data: { predecessorTradeIds: resolvedIds },
      });
    }

    // Re-apply activity relationships for existing trades only
    await prisma.tradeRelationship.deleteMany({
      where: { projectId, source: 'template' },
    });

    const relationshipTemplates = getRelationshipsForTrades(tradeCodes, project.projectType);
    let relCreated = 0;

    for (const rel of relationshipTemplates) {
      const predId = codeToId.get(rel.predecessorCode);
      const succId = codeToId.get(rel.successorCode);
      if (!predId || !succId) continue;

      try {
        await prisma.tradeRelationship.create({
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
        relCreated++;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== 'P2002') throw err;
      }
    }

    return NextResponse.json({
      data: {
        updated,
        relationshipsCreated: relCreated,
      },
      meta: {
        templateCount: templates.length,
        totalActive: existingTrades.length,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
