import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Full system access — all modules, all actions',
    permissions: ['*'],
    isSystem: true,
  },
  {
    name: 'project_manager',
    description: 'Project management — full access to all project modules',
    permissions: [
      'project:*', 'takt:*', 'constraint:*', 'progress:*', 'report:*', 'resource:*',
      'quality:*', 'safety:*', 'cost:*', 'risk:*', 'supply:*', 'claims:*',
      'comm:*', 'stakeholder:*', 'sustainability:*', 'vision:*',
    ],
    isSystem: true,
  },
  {
    name: 'superintendent',
    description: 'Field management — read plans, manage constraints & progress',
    permissions: [
      'project:read', 'takt:read', 'constraint:*', 'progress:*', 'resource:read',
      'quality:write', 'quality:read', 'safety:write', 'safety:read',
      'comm:read', 'comm:write',
    ],
    isSystem: true,
  },
  {
    name: 'foreman',
    description: 'Trade crew leader — read plans, update progress',
    permissions: [
      'project:read', 'takt:read', 'constraint:read', 'progress:write', 'progress:read',
      'quality:read', 'safety:read',
    ],
    isSystem: true,
  },
  {
    name: 'viewer',
    description: 'Read-only access — view project data and reports',
    permissions: [
      'project:read', 'takt:read', 'constraint:read', 'progress:read', 'report:read',
    ],
    isSystem: true,
  },
];

async function main() {
  console.log('Seeding default roles...');

  for (const role of DEFAULT_ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });
    if (existing) {
      // Update permissions if role already exists
      await prisma.role.update({
        where: { name: role.name },
        data: {
          description: role.description,
          permissions: role.permissions,
          isSystem: role.isSystem,
        },
      });
      console.log(`  Updated: ${role.name}`);
    } else {
      await prisma.role.create({ data: role });
      console.log(`  Created: ${role.name}`);
    }
  }

  // Auto-assign admin role to platform admins
  const PLATFORM_ADMINS = ['contact@yukselarslan.com'];
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });

  if (adminRole) {
    for (const email of PLATFORM_ADMINS) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const existing = await prisma.userRole.findFirst({
          where: { userId: user.id, roleId: adminRole.id, projectId: null },
        });
        if (!existing) {
          await prisma.userRole.create({
            data: { userId: user.id, roleId: adminRole.id },
          });
          console.log(`  Admin role assigned to: ${email}`);
        }
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
