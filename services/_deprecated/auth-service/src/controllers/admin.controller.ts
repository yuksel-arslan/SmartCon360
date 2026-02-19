import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../services/auth.service';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// ── Validators ──────────────────────────────────────────

const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

const createRoleSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z_]+$/, 'Only lowercase letters and underscores'),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1),
});

const updateRoleSchema = z.object({
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1).optional(),
});

// ── Users ───────────────────────────────────────────────

// GET /admin/users — list all users with roles
router.get('/users', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = (req.query.search as string) || '';

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        userRoles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const sanitized = users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    company: u.company,
    jobTitle: u.jobTitle,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    roles: u.userRoles.map((ur) => ({
      id: ur.id,
      roleId: ur.roleId,
      roleName: ur.role.name,
      projectId: ur.projectId,
      grantedBy: ur.grantedBy,
      createdAt: ur.createdAt,
    })),
  }));

  res.json({
    data: sanitized,
    meta: { page, limit, total },
    error: null,
  });
}));

// POST /admin/users/:id/roles — assign role to user
router.post('/users/:id/roles', asyncHandler(async (req, res) => {
  const { id: userId } = req.params;
  const { roleId, projectId } = assignRoleSchema.parse(req.body);
  const grantedBy = (req as any).userId;

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);

  // Verify role exists
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError('Role not found', 'ROLE_NOT_FOUND', 404);

  // Check for existing assignment
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId, projectId: projectId || null },
  });
  if (existing) throw new AppError('Role already assigned', 'ROLE_ALREADY_ASSIGNED', 409);

  const userRole = await prisma.userRole.create({
    data: { userId, roleId, projectId: projectId || null, grantedBy },
    include: { role: true },
  });

  res.status(201).json({
    data: {
      id: userRole.id,
      roleId: userRole.roleId,
      roleName: userRole.role.name,
      projectId: userRole.projectId,
      grantedBy: userRole.grantedBy,
      createdAt: userRole.createdAt,
    },
    error: null,
  });
}));

// DELETE /admin/users/:id/roles/:userRoleId — remove role from user
router.delete('/users/:id/roles/:userRoleId', asyncHandler(async (req, res) => {
  const { id: userId, userRoleId } = req.params;

  const userRole = await prisma.userRole.findFirst({
    where: { id: userRoleId, userId },
  });
  if (!userRole) throw new AppError('User role not found', 'USER_ROLE_NOT_FOUND', 404);

  await prisma.userRole.delete({ where: { id: userRoleId } });

  res.status(204).send();
}));

// PATCH /admin/users/:id/status — activate/deactivate user
router.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const { id: userId } = req.params;
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  res.json({
    data: { id: user.id, isActive: user.isActive },
    error: null,
  });
}));

// ── Roles ───────────────────────────────────────────────

// GET /admin/roles — list all roles
router.get('/roles', asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { userRoles: true } },
    },
  });

  res.json({
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
}));

// POST /admin/roles — create custom role
router.post('/roles', asyncHandler(async (req, res) => {
  const input = createRoleSchema.parse(req.body);

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

  res.status(201).json({
    data: {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
    },
    error: null,
  });
}));

// PATCH /admin/roles/:id — update role
router.patch('/roles/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const input = updateRoleSchema.parse(req.body);

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('Role not found', 'ROLE_NOT_FOUND', 404);

  const updated = await prisma.role.update({
    where: { id },
    data: {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.permissions && { permissions: input.permissions }),
    },
  });

  res.json({
    data: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions,
      isSystem: updated.isSystem,
    },
    error: null,
  });
}));

// DELETE /admin/roles/:id — delete non-system role
router.delete('/roles/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('Role not found', 'ROLE_NOT_FOUND', 404);
  if (role.isSystem) throw new AppError('Cannot delete system role', 'SYSTEM_ROLE', 400);

  // Remove all assignments first
  await prisma.userRole.deleteMany({ where: { roleId: id } });
  await prisma.role.delete({ where: { id } });

  res.status(204).send();
}));

export default router;
