/**
 * Auth business logic.
 * Ported from auth-service/src/services/auth.service.ts
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { signAccessToken } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import type { RegisterInput, LoginInput, UpdateProfileInput } from '@/lib/validators/auth';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Email already registered', 'EMAIL_EXISTS', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
    },
  });

  // Assign default role
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
  if (viewerRole) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: viewerRole.id },
    });
  }

  const tokens = await generateTokens(user.id, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is disabled', 'ACCOUNT_DISABLED', 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await generateTokens(user.id, user.email);
  return {
    user: {
      ...sanitizeUser(user),
      roles: user.userRoles.map((ur) => ({
        role: ur.role.name,
        projectId: ur.projectId,
      })),
    },
    ...tokens,
  };
}

export async function refresh(refreshToken: string) {
  const session = await prisma.session.findFirst({
    where: { refreshToken, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!session) {
    throw new AppError('Invalid or expired refresh token', 'INVALID_REFRESH', 401);
  }

  // Rotate refresh token
  await prisma.session.delete({ where: { id: session.id } });

  return generateTokens(session.userId, session.user.email);
}

export async function logout(refreshToken: string) {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);

  return {
    ...sanitizeUser(user),
    roles: user.userRoles.map((ur) => ({
      role: ur.role.name,
      projectId: ur.projectId,
    })),
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.firstName && { firstName: input.firstName }),
      ...(input.lastName && { lastName: input.lastName }),
      ...(input.company !== undefined && { company: input.company }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
      ...(input.locale && { locale: input.locale }),
      ...(input.timezone && { timezone: input.timezone }),
    },
  });

  return sanitizeUser(user);
}

// ── Private helpers ──

async function generateTokens(userId: string, email: string) {
  const accessToken = signAccessToken(userId, email);
  const refreshToken = uuidv4();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: { userId, refreshToken, expiresAt },
  });

  return { accessToken, refreshToken };
}

function sanitizeUser(user: Record<string, unknown>) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    company: user.company,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}
