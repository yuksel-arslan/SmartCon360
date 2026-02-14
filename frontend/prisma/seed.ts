import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Platform admin — full access, all modules free */
const PLATFORM_ADMIN = {
  email: 'contact@yukselarslan.com',
  password: 'SmartCon360!',
  firstName: 'Yuksel',
  lastName: 'Arslan',
  company: 'SmartCon360',
};

const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Full system access — all modules and operations',
    permissions: ['*'],
    isSystem: true,
  },
  {
    name: 'project_manager',
    description: 'Full project access — planning, cost, quality, resources, reports',
    permissions: [
      'project:*', 'takt:*', 'constraint:*', 'progress:*', 'report:*',
      'resource:*', 'quality:*', 'safety:*', 'cost:*', 'risk:*',
      'supply:*', 'claims:*', 'comm:*', 'stakeholder:*', 'sustainability:*',
    ],
    isSystem: true,
  },
  {
    name: 'superintendent',
    description: 'Field supervision — constraints, progress, quality, safety',
    permissions: [
      'project:read', 'takt:read', 'constraint:*', 'progress:*',
      'resource:read', 'quality:write', 'safety:write',
    ],
    isSystem: true,
  },
  {
    name: 'foreman',
    description: 'Trade foreman — read-only planning, progress updates',
    permissions: [
      'project:read', 'takt:read', 'constraint:read',
      'progress:write', 'quality:read', 'safety:read',
    ],
    isSystem: true,
  },
  {
    name: 'viewer',
    description: 'Read-only access to project data and reports',
    permissions: [
      'project:read', 'takt:read', 'constraint:read',
      'progress:read', 'report:read',
    ],
    isSystem: true,
  },
];

async function main() {
  console.log('Seeding roles...');

  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
      create: role,
    });
    console.log(`  ✓ ${role.name}`);
  }

  // ── Platform Admin User ──
  console.log('Seeding platform admin...');
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });

  const existingAdmin = await prisma.user.findUnique({ where: { email: PLATFORM_ADMIN.email } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(PLATFORM_ADMIN.password, 12);
    const admin = await prisma.user.create({
      data: {
        email: PLATFORM_ADMIN.email,
        passwordHash,
        firstName: PLATFORM_ADMIN.firstName,
        lastName: PLATFORM_ADMIN.lastName,
        company: PLATFORM_ADMIN.company,
        emailVerified: true,
      },
    });
    if (adminRole) {
      await prisma.userRole.create({
        data: { userId: admin.id, roleId: adminRole.id },
      });
    }
    console.log(`  ✓ ${PLATFORM_ADMIN.email} (admin)`);
  } else {
    console.log(`  ○ ${PLATFORM_ADMIN.email} (already exists)`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
