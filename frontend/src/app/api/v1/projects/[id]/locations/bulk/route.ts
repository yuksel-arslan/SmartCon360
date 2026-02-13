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
      let parentPath: string | null = null;
      let depth = 0;

      if (input.parentId) {
        const parent =
          (created.find((c) => c.id === input.parentId) as Record<string, unknown> | undefined) ||
          (await prisma.location.findUnique({ where: { id: input.parentId } }));
        if (parent) {
          parentPath = parent.path as string;
          depth = (parent.depth as number) + 1;
        }
      }

      const count =
        created.filter((c) => c.parentId === input.parentId).length +
        (await prisma.location.count({ where: { projectId, parentId: input.parentId || null } }));

      const cp = input.locationType.charAt(0).toUpperCase();
      const code = parentPath
        ? `${(parentPath as string).split('/').pop()}-${cp}${String(count + 1).padStart(2, '0')}`
        : `${cp}${String(count + 1)}`;
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
          sortOrder: count,
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
