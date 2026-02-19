import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { RegisterInput, LoginInput, UpdateProfileInput } from '../validators/auth.validator';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export class AuthService {
  async register(input: RegisterInput) {
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

    const tokens = await this.generateTokens(user.id, user.email);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(input: LoginInput) {
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

    const tokens = await this.generateTokens(user.id, user.email);
    return {
      user: {
        ...this.sanitizeUser(user),
        roles: user.userRoles.map(ur => ({
          role: ur.role.name,
          projectId: ur.projectId,
        })),
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const session = await prisma.session.findFirst({
      where: { refreshToken, expiresAt: { gt: new Date() } },
    });

    if (!session) {
      throw new AppError('Invalid or expired refresh token', 'INVALID_REFRESH', 401);
    }

    // Rotate refresh token
    await prisma.session.delete({ where: { id: session.id } });

    const tokens = await this.generateTokens(session.userId, '');
    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);

    return {
      ...this.sanitizeUser(user),
      roles: user.userRoles.map(ur => ({
        role: ur.role.name,
        projectId: ur.projectId,
      })),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
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

    return this.sanitizeUser(user);
  }

  // ── Private helpers ──

  private async generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign(
      { sub: userId, email },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY as string }
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: { userId, refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, authProviderId, ...safe } = user;
    return {
      id: safe.id,
      email: safe.email,
      firstName: safe.firstName,
      lastName: safe.lastName,
      company: safe.company,
      avatarUrl: safe.avatarUrl,
      locale: safe.locale,
      timezone: safe.timezone,
      createdAt: safe.createdAt,
    };
  }
}

// ── Custom Error ──
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}
