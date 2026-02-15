import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

function buildTree(nodes: Record<string, unknown>[]): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  const roots: Record<string, unknown>[] = [];

  nodes.forEach((n) => map.set(n.id as string, { ...n, children: [] }));
  nodes.forEach((n) => {
    const node = map.get(n.id as string)!;
    if (n.parentId && map.has(n.parentId as string)) {
      (map.get(n.parentId as string)!.children as Record<string, unknown>[]).push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// GET /api/v1/projects/:id/wbs — Get WBS tree
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const nodes = await prisma.wbsNode.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });

    const tree = buildTree(nodes as unknown as Record<string, unknown>[]);
    return NextResponse.json({ data: tree, meta: { total: nodes.length, flat: nodes }, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects/:id/wbs — Create single WBS node (manual)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const input = await request.json();

    let parentPath = '';
    let level = 1;
    if (input.parentId) {
      const parent = await prisma.wbsNode.findUnique({ where: { id: input.parentId } });
      if (parent) {
        parentPath = parent.path || '';
        level = parent.level + 1;
      }
    }

    const count = await prisma.wbsNode.count({
      where: { projectId, parentId: input.parentId || null },
    });

    const node = await prisma.wbsNode.create({
      data: {
        projectId,
        parentId: input.parentId || null,
        code: input.code,
        name: input.name,
        description: input.description,
        standard: input.standard || 'uniclass',
        level,
        sortOrder: count,
        path: parentPath ? `${parentPath}/${input.code}` : `/${input.code}`,
        locationId: input.locationId || null,
        tradeId: input.tradeId || null,
      },
    });

    return NextResponse.json({ data: node, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
