import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
