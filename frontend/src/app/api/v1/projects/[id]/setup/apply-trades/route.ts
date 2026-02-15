import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getTradesForProjectType } from '@/lib/templates/trade-discipline-templates';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/setup/apply-trades
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { selectedDisciplines, selectedTradeCodes } = await request.json();

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

    const created = [];
    for (const template of tradesToApply) {
      try {
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
          },
        });
        created.push(trade);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== 'P2002') throw err;
      }
    }

    return NextResponse.json(
      { data: created, meta: { requested: tradesToApply.length, created: created.length }, error: null },
      { status: 201 },
    );
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
