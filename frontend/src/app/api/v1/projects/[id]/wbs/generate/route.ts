import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getWbsTemplate, flattenWbsNodes } from '@/lib/templates/wbs-templates';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/wbs/generate — Generate WBS from template
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { standard, projectType } = await request.json();

    if (!standard || !projectType) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION', message: 'standard and projectType are required' } },
        { status: 400 },
      );
    }

    const template = getWbsTemplate(standard, projectType);
    if (!template) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_STANDARD', message: `Unknown WBS standard: ${standard}` } },
        { status: 400 },
      );
    }

    // Clear existing WBS nodes
    await prisma.wbsNode.deleteMany({ where: { projectId } });

    const flatNodes = flattenWbsNodes(template.nodes, standard);
    const codeToId = new Map<string, string>();
    const createdNodes = [];

    for (const node of flatNodes) {
      const parentId = node.parentCode ? codeToId.get(node.parentCode) || null : null;
      const parentPath = node.parentCode
        ? (await prisma.wbsNode.findFirst({ where: { projectId, code: node.parentCode } }))?.path || ''
        : '';

      const created = await prisma.wbsNode.create({
        data: {
          projectId,
          parentId,
          code: node.code,
          name: node.name,
          description: node.description,
          standard: node.standard,
          level: node.level,
          sortOrder: node.sortOrder,
          path: parentPath ? `${parentPath}/${node.code}` : `/${node.code}`,
        },
      });

      codeToId.set(node.code, created.id);
      createdNodes.push(created);
    }

    // Update project setup
    await prisma.projectSetup.upsert({
      where: { projectId },
      create: { projectId, classificationStandard: standard, wbsGenerated: true, wbsNodeCount: createdNodes.length },
      update: { classificationStandard: standard, wbsGenerated: true, wbsNodeCount: createdNodes.length },
    });

    return NextResponse.json(
      { data: createdNodes, meta: { standard: template.label, count: createdNodes.length }, error: null },
      { status: 201 },
    );
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
