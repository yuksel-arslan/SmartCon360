import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleId: z.string().uuid(),
  company: z.string().max(255).optional(),
});

// POST /api/v1/admin/users/invite — admin creates a new user with a role
export async function POST(request: NextRequest) {
  try {
    const adminId = requireAuth(request);

    const isAdmin = await prisma.userRole.findFirst({
      where: { userId: adminId, role: { name: 'admin' }, projectId: null },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = inviteSchema.parse(body);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError('User with this email already exists', 'EMAIL_EXISTS', 409);

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw new AppError('Role not found', 'ROLE_NOT_FOUND', 404);

    // Create user with a temporary password (user must reset)
    const tempPassword = `SmartCon${Math.random().toString(36).slice(2, 10)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        company: input.company,
        passwordHash,
      },
    });

    // Assign role
    await prisma.userRole.create({
      data: { userId: user.id, roleId: input.roleId, grantedBy: adminId },
    });

    return NextResponse.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        tempPassword, // Admin sees this once to share with user
      },
      error: null,
    }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
