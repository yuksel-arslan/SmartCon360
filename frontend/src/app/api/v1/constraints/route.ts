import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { createConstraintSchema } from '@/lib/validators/constraint';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/constraints — List constraints (filterable)
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Must belong to a project the user owns
    const where: Record<string, unknown> = {
      project: { ownerId: userId },
    };
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const [constraints, total] = await Promise.all([
      prisma.constraint.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.constraint.count({ where }),
    ]);

    return NextResponse.json({
      data: constraints,
      meta: { page, limit, total },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/constraints — Create constraint
export async function POST(request: NextRequest) {
  try {
    requireAuth(request);
    const body = await request.json();
    const input = createConstraintSchema.parse(body);

    const constraint = await prisma.constraint.create({
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      },
    });

    return NextResponse.json({ data: constraint, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
