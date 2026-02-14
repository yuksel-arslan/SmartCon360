import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1).max(50),
  trade: z.string().max(100).optional(),
});

// GET /api/v1/projects/:id/members
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch user details for each member
    const userIds = members.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true, company: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = members.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      userId: m.userId,
      role: m.role,
      trade: m.trade,
      status: m.status,
      createdAt: m.createdAt,
      user: userMap.get(m.userId) || null,
    }));

    return NextResponse.json({ data, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects/:id/members — add member by email
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const body = await request.json();
    const input = addMemberSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new AppError('No user found with this email. Register them first.', 'USER_NOT_FOUND', 404);

    // Check project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError('Project not found', 'PROJECT_NOT_FOUND', 404);

    // Check duplicate
    const existing = await prisma.projectMember.findFirst({
      where: { projectId, userId: user.id },
    });
    if (existing) throw new AppError('User is already a member of this project', 'ALREADY_MEMBER', 409);

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: input.role,
        trade: input.trade,
      },
    });

    return NextResponse.json({
      data: {
        id: member.id,
        projectId: member.projectId,
        userId: member.userId,
        role: member.role,
        trade: member.trade,
        status: member.status,
        createdAt: member.createdAt,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email },
      },
      error: null,
    }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
