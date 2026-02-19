// Seed International Standards — MasterFormat & UNIFORMAT II
// Run: ts-node src/scripts/seed-international-standards.ts

import { prisma } from '../utils/prisma';
import masterformatData from '../data/masterformat-divisions.json';
import uniformatData from '../data/uniformat-ii-elements.json';

async function seedMasterFormat() {
  console.log('🔄 Seeding MasterFormat divisions...');

  // Check if MasterFormat catalog already exists
  const existing = await prisma.priceCatalog.findFirst({
    where: {
      source: 'masterformat',
      standard: 'masterformat',
      name: 'MasterFormat 2020 - CSI Divisions',
    },
  });

  if (existing) {
    console.log('ℹ️  MasterFormat catalog already exists. Skipping.');
    return existing;
  }

  // Create global catalog (projectId = null for shared/global)
  const catalog = await prisma.priceCatalog.create({
    data: {
      name: 'MasterFormat 2020 - CSI Divisions',
      source: 'masterformat',
      standard: 'masterformat',
      year: 2020,
      region: 'North America',
      currency: 'USD',
      description: `${masterformatData.version} - Complete 50 Division Structure`,
      itemCount: 0,
      isActive: true,
    },
  });

  console.log(`✅ Created MasterFormat catalog: ${catalog.id}`);

  // Import divisions as catalog items
  const items = masterformatData.divisions.map((div) => ({
    catalogId: catalog.id,
    code: div.code,
    name: div.title,
    unit: 'LS', // Lump Sum
    unitPrice: 0, // Division headers have no price
    category: 'Division',
    csiCode: div.code,
    divisionCode: div.code,
    divisionName: div.title,
    notes: div.description,
  }));

  await prisma.priceCatalogItem.createMany({
    data: items,
  });

  // Update item count
  await prisma.priceCatalog.update({
    where: { id: catalog.id },
    data: { itemCount: items.length },
  });

  console.log(`✅ Imported ${items.length} MasterFormat divisions`);
  return catalog;
}

async function seedUNIFORMAT() {
  console.log('🔄 Seeding UNIFORMAT II elements...');

  // Check if UNIFORMAT catalog already exists
  const existing = await prisma.priceCatalog.findFirst({
    where: {
      source: 'uniformat',
      standard: 'uniformat',
      name: 'UNIFORMAT II - ASTM E1557',
    },
  });

  if (existing) {
    console.log('ℹ️  UNIFORMAT II catalog already exists. Skipping.');
    return existing;
  }

  // Create global catalog
  const catalog = await prisma.priceCatalog.create({
    data: {
      name: 'UNIFORMAT II - ASTM E1557',
      source: 'uniformat',
      standard: 'uniformat',
      year: 2024,
      region: 'USA/Canada',
      currency: 'USD',
      description: uniformatData.description,
      itemCount: 0,
      isActive: true,
    },
  });

  console.log(`✅ Created UNIFORMAT II catalog: ${catalog.id}`);

  const items: any[] = [];

  // Import Level 1 elements
  for (const level1 of uniformatData.level1_elements) {
    items.push({
      catalogId: catalog.id,
      code: level1.code,
      name: level1.title,
      unit: 'LS',
      unitPrice: 0,
      category: 'Level 1 - Major Group Element',
      uniformatCode: level1.code,
      notes: level1.description,
    });

    // Import Level 2 elements
    if (level1.level2) {
      for (const level2 of level1.level2) {
        items.push({
          catalogId: catalog.id,
          code: level2.code,
          name: level2.title,
          unit: 'LS',
          unitPrice: 0,
          category: `Level 2 - ${level1.title}`,
          uniformatCode: level2.code,
          notes: level2.description,
        });
      }
    }
  }

  // Import Level 3 examples
  for (const level3 of uniformatData.common_level3_examples) {
    items.push({
      catalogId: catalog.id,
      code: level3.code,
      name: level3.title,
      unit: 'LS',
      unitPrice: 0,
      category: `Level 3 - Individual Element`,
      uniformatCode: level3.code,
      notes: level3.description,
    });
  }

  await prisma.priceCatalogItem.createMany({
    data: items,
  });

  // Update item count
  await prisma.priceCatalog.update({
    where: { id: catalog.id },
    data: { itemCount: items.length },
  });

  console.log(`✅ Imported ${items.length} UNIFORMAT II elements`);
  return catalog;
}

async function main() {
  console.log('🚀 Starting international standards seeding...\n');

  try {
    const masterformat = await seedMasterFormat();
    console.log('');
    const uniformat = await seedUNIFORMAT();

    console.log('\n✅ Seeding complete!');
    console.log(`\nCatalogs created:`);
    console.log(`  - MasterFormat: ${masterformat.id}`);
    console.log(`  - UNIFORMAT II: ${uniformat.id}`);
    console.log(`\nThese catalogs are now available globally (projectId = null)`);
    console.log(`Users can browse and copy items to their projects.`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
