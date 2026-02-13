import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { createLocationSchema } from '@/lib/validators/project';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// ── Helpers ──

interface LocationNode {
  id: string;
  parentId: string | null;
  children: LocationNode[];
  [key: string]: unknown;
}

function buildLocationTree(locations: Record<string, unknown>[]): LocationNode[] {
  const map = new Map<string, LocationNode>();
  const roots: LocationNode[] = [];

  for (const loc of locations) {
    map.set(loc.id as string, { ...loc, children: [] } as unknown as LocationNode);
  }

  for (const loc of locations) {
    const node = map.get(loc.id as string)!;
    if (loc.parentId && map.has(loc.parentId as string)) {
      map.get(loc.parentId as string)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// GET /api/v1/projects/:id/locations
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id } = await params;

    const locations = await prisma.location.findMany({
      where: { projectId: id, isActive: true },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
    });

    const tree = buildLocationTree(locations as unknown as Record<string, unknown>[]);
    return NextResponse.json({ data: tree, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects/:id/locations
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const body = await request.json();
    const input = createLocationSchema.parse(body);

    let parentPath: string | null = null;
    let depth = 0;

    if (input.parentId) {
      const parent = await prisma.location.findUnique({ where: { id: input.parentId } });
      if (parent) {
        parentPath = parent.path;
        depth = parent.depth + 1;
      }
    }

    const count = await prisma.location.count({
      where: { projectId, parentId: input.parentId || null },
    });

    const codePrefix = input.locationType.charAt(0).toUpperCase();
    const code = parentPath
      ? `${parentPath.split('/').pop()}-${codePrefix}${String(count + 1).padStart(2, '0')}`
      : `${codePrefix}${String(count + 1).padStart(1, '0')}`;
    const path = parentPath ? `${parentPath}/${code}` : `/${code}`;

    const location = await prisma.location.create({
      data: {
        projectId,
        parentId: input.parentId,
        name: input.name,
        locationType: input.locationType,
        code,
        path,
        depth,
        areaSqm: input.areaSqm,
        sortOrder: input.sortOrder ?? count,
      },
    });

    return NextResponse.json({ data: location, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
