import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { getCbsTemplate, flattenCbsNodes, getDefaultCbsStandard } from '@/lib/templates/cbs-templates';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/cbs/generate — Generate CBS from template
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { standard: requestedStandard } = await request.json();

    const setup = await prisma.projectSetup.findUnique({ where: { projectId } });
    const wbsStandard = setup?.classificationStandard || 'uniclass';
    const cbsStandard = requestedStandard || getDefaultCbsStandard(wbsStandard);

    const template = getCbsTemplate(cbsStandard);
    if (!template) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_STANDARD', message: `Unknown CBS standard: ${cbsStandard}` } },
        { status: 400 },
      );
    }

    // Get existing WBS nodes for linking
    const wbsNodes = await prisma.wbsNode.findMany({
      where: { projectId, isActive: true },
      select: { id: true, code: true },
    });
    const wbsCodeToId = new Map(wbsNodes.map((n) => [n.code, n.id]));

    // Clear existing CBS nodes
    await prisma.cbsNode.deleteMany({ where: { projectId } });

    const flatNodes = flattenCbsNodes(template.nodes, cbsStandard);
    const codeToId = new Map<string, string>();
    const createdNodes = [];

    for (const node of flatNodes) {
      const parentId = node.parentCode ? codeToId.get(node.parentCode) || null : null;
      const parentPath = node.parentCode
        ? (await prisma.cbsNode.findFirst({ where: { projectId, code: node.parentCode } }))?.path || ''
        : '';

      // Link to WBS node
      let wbsNodeId: string | null = null;
      if (node.wbsCodes?.length) {
        for (const wbsCode of node.wbsCodes) {
          const id = wbsCodeToId.get(wbsCode);
          if (id) { wbsNodeId = id; break; }
        }
      }

      const created = await prisma.cbsNode.create({
        data: {
          projectId,
          parentId,
          wbsNodeId,
          code: node.code,
          name: node.name,
          description: node.description,
          standard: cbsStandard,
          level: node.level,
          sortOrder: node.sortOrder,
          path: parentPath ? `${parentPath}/${node.code}` : `/${node.code}`,
        },
      });

      codeToId.set(node.code, created.id);
      createdNodes.push(created);
    }

    // Update setup
    await prisma.projectSetup.upsert({
      where: { projectId },
      create: { projectId, cbsGenerated: true, cbsNodeCount: createdNodes.length },
      update: { cbsGenerated: true, cbsNodeCount: createdNodes.length },
    });

    return NextResponse.json(
      {
        data: createdNodes,
        meta: { standard: template.label, count: createdNodes.length, wbsLinked: createdNodes.filter((n) => n.wbsNodeId).length },
        error: null,
      },
      { status: 201 },
    );
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
