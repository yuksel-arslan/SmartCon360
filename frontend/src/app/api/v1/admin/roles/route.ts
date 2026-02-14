import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z_]+$/, 'Only lowercase letters and underscores'),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1),
});

// GET /api/v1/admin/roles — list all roles
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const isAdmin = await prisma.userRole.findFirst({
      where: { userId, role: { name: 'admin' }, projectId: null },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { userRoles: true } } },
    });

    return NextResponse.json({
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        isSystem: r.isSystem,
        userCount: r._count.userRoles,
        createdAt: r.createdAt,
      })),
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/admin/roles — create role
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const isAdmin = await prisma.userRole.findFirst({
      where: { userId, role: { name: 'admin' }, projectId: null },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = createRoleSchema.parse(body);

    const existing = await prisma.role.findUnique({ where: { name: input.name } });
    if (existing) throw new AppError('Role name already exists', 'ROLE_EXISTS', 409);

    const role = await prisma.role.create({
      data: {
        name: input.name,
        description: input.description,
        permissions: input.permissions,
        isSystem: false,
      },
    });

    return NextResponse.json({
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
      },
      error: null,
    }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
