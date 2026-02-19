import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
}

export class AuthService {
  // ── Register ──
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        locale: true,
        timezone: true,
        createdAt: true,
      },
    });

    // Assign default role
    const viewerRole = await prisma.role.findUnique({ where: { name: 'project_manager' } });
    if (viewerRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: viewerRole.id },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return { user, ...tokens };
  }

  // ── Login ──
  async login(email: string, password: string, deviceInfo?: Record<string, unknown>) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is disabled', 'ACCOUNT_DISABLED', 403);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, deviceInfo);

    const roles = user.userRoles.map((ur) => ({
      role: ur.role.name,
      projectId: ur.projectId,
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        locale: user.locale,
        timezone: user.timezone,
        avatarUrl: user.avatarUrl,
        roles,
      },
      ...tokens,
    };
  }

  // ── Refresh Tokens ──
  async refreshTokens(refreshToken: string) {
    const session = await prisma.session.findFirst({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      throw new AppError('Invalid or expired refresh token', 'INVALID_TOKEN', 401);
    }

    // Delete old session
    await prisma.session.delete({ where: { id: session.id } });

    // Generate new tokens
    return this.generateTokens(session.userId, session.user.email);
  }

  // ── Logout ──
  async logout(refreshToken: string) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }

  // ── Get Profile ──
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      jobTitle: user.jobTitle,
      phone: user.phone,
      locale: user.locale,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
      roles: user.userRoles.map((ur) => ({
        role: ur.role.name,
        projectId: ur.projectId,
      })),
    };
  }

  // ── Update Profile ──
  async updateProfile(userId: string, data: Record<string, unknown>) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        jobTitle: true,
        phone: true,
        locale: true,
        timezone: true,
        avatarUrl: true,
      },
    });
    return user;
  }

  // ── Token Generation ──
  private async generateTokens(userId: string, email: string, deviceInfo?: Record<string, unknown>) {
    const accessToken = jwt.sign(
      { sub: userId, email },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY as string }
    );

    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY as string }
    );

    // Store refresh token session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId,
        refreshToken,
        deviceInfo: deviceInfo || {},
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
