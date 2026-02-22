import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getTradesForProjectType } from '@/lib/templates/trade-discipline-templates';
import { getRelationshipsForTrades } from '@/lib/templates/activity-relationship-templates';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/setup/apply-trades
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { selectedDisciplines, selectedTradeCodes, tradeOverrides } = await request.json();

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

    let tradesToApply = getTradesForProjectType(project.projectType);

    if (selectedDisciplines?.length > 0) {
      tradesToApply = tradesToApply.filter((t) => selectedDisciplines.includes(t.discipline));
    }
    if (selectedTradeCodes?.length > 0) {
      tradesToApply = tradesToApply.filter((t) => selectedTradeCodes.includes(t.code));
    }

    // tradeOverrides: { [code]: { contractType, subcontractorGroup } }
    const overrides: Record<string, { contractType?: string; subcontractorGroup?: string }> = tradeOverrides || {};

    const created = [];
    for (const template of tradesToApply) {
      try {
        const override = overrides[template.code] || {};
        const trade = await prisma.trade.create({
          data: {
            projectId,
            name: template.name,
            code: template.code,
            color: template.color,
            defaultCrewSize: template.defaultCrewSize,
            discipline: template.discipline,
            sortOrder: template.sortOrder,
            predecessorTradeIds: [],
            contractType: override.contractType || template.defaultContractType || 'supply_and_fix',
            subcontractorGroup: override.subcontractorGroup || null,
          },
        });
        created.push(trade);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== 'P2002') throw err;
      }
    }

    // Build code → id map for resolving relationships
    const codeToId = new Map(created.map((t) => [t.code, t.id]));

    // Resolve predecessorTradeIds from template predecessorCodes
    for (const template of tradesToApply) {
      const tradeId = codeToId.get(template.code);
      if (!tradeId || template.predecessorCodes.length === 0) continue;

      const resolvedIds = template.predecessorCodes
        .map((code) => codeToId.get(code))
        .filter((id): id is string => !!id);

      if (resolvedIds.length > 0) {
        await prisma.trade.update({
          where: { id: tradeId },
          data: { predecessorTradeIds: resolvedIds },
        });
      }
    }

    // Create activity relationships from templates
    const tradeCodes = created.map((t) => t.code);
    const relationshipTemplates = getRelationshipsForTrades(tradeCodes, project.projectType);
    const createdRelationships = [];

    for (const rel of relationshipTemplates) {
      const predId = codeToId.get(rel.predecessorCode);
      const succId = codeToId.get(rel.successorCode);
      if (!predId || !succId) continue;

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
        createdRelationships.push(relationship);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== 'P2002') throw err;
      }
    }

    return NextResponse.json(
      {
        data: created,
        meta: {
          requested: tradesToApply.length,
          created: created.length,
          relationshipsCreated: createdRelationships.length,
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
