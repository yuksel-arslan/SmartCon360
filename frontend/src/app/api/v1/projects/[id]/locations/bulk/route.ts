import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { createLocationSchema } from '@/lib/validators/project';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/locations/bulk
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { locations } = await request.json();
    const created: Record<string, unknown>[] = [];

    for (const loc of locations) {
      const input = createLocationSchema.parse(loc);

      // Resolve parentName to parentId if parentId is not provided
      let resolvedParentId = input.parentId || null;
      if (!resolvedParentId && input.parentName) {
        const parentFromCreated = created.find((c) => c.name === input.parentName);
        if (parentFromCreated) {
          resolvedParentId = parentFromCreated.id as string;
        } else {
          const parentFromDb = await prisma.location.findFirst({
            where: { projectId, name: input.parentName },
          });
          if (parentFromDb) {
            resolvedParentId = parentFromDb.id;
          }
        }
      }

      let parentPath: string | null = null;
      let depth = 0;

      if (resolvedParentId) {
        const parent =
          (created.find((c) => c.id === resolvedParentId) as Record<string, unknown> | undefined) ||
          (await prisma.location.findUnique({ where: { id: resolvedParentId } }));
        if (parent) {
          parentPath = parent.path as string;
          depth = (parent.depth as number) + 1;
        }
      }

      const count =
        created.filter((c) => c.parentId === resolvedParentId).length +
        (await prisma.location.count({ where: { projectId, parentId: resolvedParentId } }));

      const cp = input.locationType.charAt(0).toUpperCase();
      const code = parentPath
        ? `${(parentPath as string).split('/').pop()}-${cp}${String(count + 1).padStart(2, '0')}`
        : `${cp}${String(count + 1)}`;
      const path = parentPath ? `${parentPath}/${code}` : `/${code}`;

      const location = await prisma.location.create({
        data: {
          projectId,
          parentId: resolvedParentId,
          name: input.name,
          locationType: input.locationType,
          code,
          path,
          depth,
          areaSqm: input.areaSqm,
          sortOrder: count,
          metadata: input.phase ? { phase: input.phase } : {},
        },
      });

      created.push(location as unknown as Record<string, unknown>);
    }

    return NextResponse.json({ data: created, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
