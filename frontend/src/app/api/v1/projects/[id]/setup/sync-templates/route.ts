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
 * - Updates name, color, sortOrder, discipline for existing trades (matched by code)
 * - Creates missing trades from templates
 * - Optionally removes trades no longer in templates
 * - Re-applies activity relationships from templates
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const body = await request.json().catch(() => ({}));
    const removeOrphans = body.removeOrphans ?? false;

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

    // Get existing trades
    const existingTrades = await prisma.trade.findMany({
      where: { projectId },
    });
    const existingByCode = new Map(existingTrades.map((t) => [t.code, t]));

    const updated: string[] = [];
    const created: string[] = [];
    const removed: string[] = [];

    // 1. Update existing trades to match templates
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
      } else if (removeOrphans) {
        // Trade no longer in templates — deactivate it
        await prisma.trade.update({
          where: { id: trade.id },
          data: { isActive: false },
        });
        removed.push(trade.code);
      }
    }

    // 2. Create missing trades from templates
    for (const template of templates) {
      if (!existingByCode.has(template.code)) {
        try {
          await prisma.trade.create({
            data: {
              projectId,
              name: template.name,
              code: template.code,
              color: template.color,
              defaultCrewSize: template.defaultCrewSize,
              discipline: template.discipline,
              sortOrder: template.sortOrder,
              predecessorTradeIds: [],
              contractType: template.defaultContractType || 'supply_and_fix',
            },
          });
          created.push(template.code);
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== 'P2002') throw err;
        }
      }
    }

    // 3. Rebuild code → id map with all active trades
    const allTrades = await prisma.trade.findMany({
      where: { projectId, isActive: true },
      select: { id: true, code: true },
    });
    const codeToId = new Map(allTrades.map((t) => [t.code, t.id]));
    const tradeCodes = allTrades.map((t) => t.code);

    // 4. Resolve predecessorTradeIds from template predecessorCodes
    for (const template of templates) {
      const tradeId = codeToId.get(template.code);
      if (!tradeId) continue;

      const resolvedIds = template.predecessorCodes
        .map((code) => codeToId.get(code))
        .filter((id): id is string => !!id);

      await prisma.trade.update({
        where: { id: tradeId },
        data: { predecessorTradeIds: resolvedIds },
      });
    }

    // 5. Re-apply activity relationships
    // Delete existing template-sourced relationships
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
        created,
        removed,
        relationshipsCreated: relCreated,
      },
      meta: {
        templateCount: templates.length,
        totalActive: allTrades.length,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
