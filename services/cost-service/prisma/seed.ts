// CostPilot Seed — Gerçek Türk inşaat verisi
// Bayındırlık ve İskan Bakanlığı rayiçlerine uygun örnek veri

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Demo project ID — matches project-service demo data
const PROJECT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000099';

async function main() {
  console.log('🌱 CostPilot seed starting...');

  // Clean existing data
  await prisma.$executeRawUnsafe('DELETE FROM cost.payment_items');
  await prisma.$executeRawUnsafe('DELETE FROM cost.payment_certificates');
  await prisma.$executeRawUnsafe('DELETE FROM cost.evm_snapshots');
  await prisma.$executeRawUnsafe('DELETE FROM cost.cost_records');
  await prisma.$executeRawUnsafe('DELETE FROM cost.budget_items');
  await prisma.$executeRawUnsafe('DELETE FROM cost.budgets');
  await prisma.$executeRawUnsafe('DELETE FROM cost.estimate_items');
  await prisma.$executeRawUnsafe('DELETE FROM cost.estimates');
  await prisma.$executeRawUnsafe('DELETE FROM cost.quantity_takeoffs');
  await prisma.$executeRawUnsafe('DELETE FROM cost.unit_price_resources');
  await prisma.$executeRawUnsafe('DELETE FROM cost.unit_price_analyses');
  await prisma.$executeRawUnsafe('DELETE FROM cost.work_items');

  // ============================================================================
  // 1. WORK ITEMS (Pozlar) — Bayındırlık standardına uygun
  // ============================================================================
  console.log('  📋 İş kalemleri (pozlar) oluşturuluyor...');

  const workItems = await Promise.all([
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '04.001',
        name: 'Betonarme demiri, nervürlü (Ø8-Ø32)',
        description: 'Nervürlü beton çeliği temini, işçiliği ve yerine konulması',
        unit: 'ton',
        category: 'Kaba Yapı',
        subcategory: 'Demir İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '16.050',
        name: 'C30/37 hazır beton dökülmesi (pompalı)',
        description: 'C30/37 basınç dayanımlı hazır beton temini ve pompa ile yerine konulması',
        unit: 'm³',
        category: 'Kaba Yapı',
        subcategory: 'Beton İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '21.011',
        name: 'Plywood kalıp yapılması (düz yüzey)',
        description: 'Betonarme kalıp yapılması, plywood ile düz yüzey',
        unit: 'm²',
        category: 'Kaba Yapı',
        subcategory: 'Kalıp İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '18.231',
        name: 'Tuğla duvar örülmesi (19 cm)',
        description: '19 cm yatay delikli tuğla ile duvar örülmesi',
        unit: 'm²',
        category: 'İnce Yapı',
        subcategory: 'Duvar İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '25.048',
        name: 'İç cephe sıvası (alçılı makine sıvası)',
        description: 'İç cephe alçı bazlı makine sıvası yapılması',
        unit: 'm²',
        category: 'İnce Yapı',
        subcategory: 'Sıva İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '26.006',
        name: '60x60 cm seramik yer kaplaması',
        description: '60x60 cm sırlı granit seramik yer kaplaması yapılması',
        unit: 'm²',
        category: 'İnce Yapı',
        subcategory: 'Kaplama İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '27.581',
        name: 'Isı yalıtımı (5 cm EPS mantolama)',
        description: 'Dış cephe ısı yalıtımı — 5 cm EPS karbonlu levha ile mantolama sistemi',
        unit: 'm²',
        category: 'Yalıtım',
        subcategory: 'Isı Yalıtımı',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: 'MSB.830',
        name: 'Tesisat borusu döşenmesi (PPR Ø20)',
        description: 'PPR boru ile sıhhi tesisat borusu döşenmesi (Ø20 mm)',
        unit: 'm',
        category: 'Mekanik',
        subcategory: 'Tesisat',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: 'ELK.401',
        name: 'Elektrik tesisatı (NYM 3x2.5 mm²)',
        description: 'NYM 3x2.5 mm² kablo ile aydınlatma tesisatı çekilmesi',
        unit: 'm',
        category: 'Elektrik',
        subcategory: 'Kuvvetli Akım',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '10.003',
        name: 'Kazı yapılması (makine ile)',
        description: 'Her cins zeminde makine ile kazı yapılması ve 1 km mesafeye taşınması',
        unit: 'm³',
        category: 'Hafriyat',
        subcategory: 'Toprak İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '23.176',
        name: 'Alüminyum doğrama (ısı yalıtımlı)',
        description: 'Isı yalıtımlı alüminyum profil ile pencere/kapı yapılması',
        unit: 'm²',
        category: 'İnce Yapı',
        subcategory: 'Doğrama İşleri',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
    prisma.workItem.create({
      data: {
        projectId: PROJECT_ID,
        code: '27.535',
        name: 'Su yalıtımı (çift kat membran)',
        description: 'Temel ve çatıda çift kat bitümlü membran su yalıtımı yapılması',
        unit: 'm²',
        category: 'Yalıtım',
        subcategory: 'Su Yalıtımı',
        source: 'bayindirlik',
        sourceYear: 2026,
      },
    }),
  ]);

  console.log(`    ✓ ${workItems.length} iş kalemi oluşturuldu`);

  // ============================================================================
  // 2. UNIT PRICE ANALYSES (Birim Fiyat Analizleri)
  // ============================================================================
  console.log('  💰 Birim fiyat analizleri oluşturuluyor...');

  const unitPrices: Array<{
    workItemId: string;
    code: string;
    unitPrice: number;
    resources: Array<{ resourceType: string; name: string; unit: string; quantity: number; unitRate: number }>;
  }> = [
    {
      workItemId: workItems[0].id, // Demir
      code: '04.001',
      unitPrice: 42500,
      resources: [
        { resourceType: 'material', name: 'Nervürlü beton çeliği (Ø8-Ø32)', unit: 'ton', quantity: 1.05, unitRate: 28000 },
        { resourceType: 'labor', name: 'Demirci ustası', unit: 'saat', quantity: 14, unitRate: 350 },
        { resourceType: 'labor', name: 'Demirci kalfası', unit: 'saat', quantity: 14, unitRate: 280 },
        { resourceType: 'equipment', name: 'Demir kesme/bükme makinesi', unit: 'saat', quantity: 4, unitRate: 250 },
      ],
    },
    {
      workItemId: workItems[1].id, // Beton
      code: '16.050',
      unitPrice: 3850,
      resources: [
        { resourceType: 'material', name: 'C30/37 hazır beton', unit: 'm³', quantity: 1.03, unitRate: 2800 },
        { resourceType: 'labor', name: 'Betoncu ustası', unit: 'saat', quantity: 1.5, unitRate: 350 },
        { resourceType: 'labor', name: 'Betoncu işçisi', unit: 'saat', quantity: 3, unitRate: 250 },
        { resourceType: 'equipment', name: 'Beton pompası', unit: 'm³', quantity: 1.03, unitRate: 180 },
      ],
    },
    {
      workItemId: workItems[2].id, // Kalıp
      code: '21.011',
      unitPrice: 680,
      resources: [
        { resourceType: 'material', name: 'Film kaplı plywood (18 mm)', unit: 'm²', quantity: 0.25, unitRate: 850 },
        { resourceType: 'material', name: 'Kereste (çam)', unit: 'm³', quantity: 0.008, unitRate: 12000 },
        { resourceType: 'labor', name: 'Kalıpçı ustası', unit: 'saat', quantity: 0.8, unitRate: 350 },
        { resourceType: 'labor', name: 'Kalıpçı işçisi', unit: 'saat', quantity: 0.8, unitRate: 250 },
      ],
    },
    {
      workItemId: workItems[3].id, // Tuğla
      code: '18.231',
      unitPrice: 420,
      resources: [
        { resourceType: 'material', name: 'Yatay delikli tuğla (19 cm)', unit: 'adet', quantity: 28, unitRate: 8.5 },
        { resourceType: 'material', name: 'Harç (hazır kuru harç)', unit: 'kg', quantity: 18, unitRate: 3.5 },
        { resourceType: 'labor', name: 'Duvarcı ustası', unit: 'saat', quantity: 1.2, unitRate: 350 },
        { resourceType: 'labor', name: 'İşçi', unit: 'saat', quantity: 0.6, unitRate: 250 },
      ],
    },
    {
      workItemId: workItems[4].id, // Sıva
      code: '25.048',
      unitPrice: 195,
      resources: [
        { resourceType: 'material', name: 'Alçı bazlı makine sıvası', unit: 'kg', quantity: 12, unitRate: 8 },
        { resourceType: 'labor', name: 'Sıvacı ustası', unit: 'saat', quantity: 0.15, unitRate: 350 },
        { resourceType: 'labor', name: 'İşçi', unit: 'saat', quantity: 0.15, unitRate: 250 },
        { resourceType: 'equipment', name: 'Makine sıva pompası', unit: 'saat', quantity: 0.08, unitRate: 400 },
      ],
    },
    {
      workItemId: workItems[5].id, // Seramik
      code: '26.006',
      unitPrice: 780,
      resources: [
        { resourceType: 'material', name: '60x60 granit seramik', unit: 'm²', quantity: 1.07, unitRate: 420 },
        { resourceType: 'material', name: 'Yapıştırıcı + derz dolgu', unit: 'kg', quantity: 8, unitRate: 12 },
        { resourceType: 'labor', name: 'Seramik ustası', unit: 'saat', quantity: 0.6, unitRate: 380 },
        { resourceType: 'labor', name: 'İşçi', unit: 'saat', quantity: 0.3, unitRate: 250 },
      ],
    },
    {
      workItemId: workItems[6].id, // Mantolama
      code: '27.581',
      unitPrice: 650,
      resources: [
        { resourceType: 'material', name: 'EPS karbonlu levha (5 cm)', unit: 'm²', quantity: 1.05, unitRate: 180 },
        { resourceType: 'material', name: 'Yapıştırıcı + sıva harcı', unit: 'kg', quantity: 12, unitRate: 14 },
        { resourceType: 'material', name: 'Donatı filesi + dübel', unit: 'takım', quantity: 1, unitRate: 85 },
        { resourceType: 'labor', name: 'Yalıtım ustası', unit: 'saat', quantity: 0.5, unitRate: 380 },
        { resourceType: 'labor', name: 'İşçi', unit: 'saat', quantity: 0.3, unitRate: 250 },
      ],
    },
  ];

  for (const up of unitPrices) {
    let laborCost = 0;
    let materialCost = 0;
    let equipmentCost = 0;

    const resources = up.resources.map((r, idx) => {
      const total = r.quantity * r.unitRate;
      if (r.resourceType === 'labor') laborCost += total;
      else if (r.resourceType === 'material') materialCost += total;
      else equipmentCost += total;
      return { ...r, total, sortOrder: idx };
    });

    const subtotal = laborCost + materialCost + equipmentCost;
    const overheadPct = 15;
    const profitPct = 10;
    const overheadAmount = subtotal * overheadPct / 100;
    const profitAmount = subtotal * profitPct / 100;
    const finalPrice = subtotal + overheadAmount + profitAmount;

    await prisma.unitPriceAnalysis.create({
      data: {
        workItemId: up.workItemId,
        laborCost,
        materialCost,
        equipmentCost,
        subtotal,
        overheadPct,
        profitPct,
        overheadAmount,
        profitAmount,
        unitPrice: finalPrice,
        currency: 'TRY',
        source: 'bayindirlik',
        resources: { create: resources },
      },
    });
  }

  console.log(`    ✓ ${unitPrices.length} birim fiyat analizi oluşturuldu`);

  // ============================================================================
  // 3. QUANTITY TAKEOFFS (Metraj)
  // ============================================================================
  console.log('  📐 Metrajlar oluşturuluyor...');

  const takeoffs = [
    { workItemId: workItems[0].id, quantity: 420, unit: 'ton', drawingRef: 'S-001 Temel Planı' },
    { workItemId: workItems[1].id, quantity: 3200, unit: 'm³', drawingRef: 'S-002 Betonarme Planı' },
    { workItemId: workItems[2].id, quantity: 18500, unit: 'm²', drawingRef: 'S-003 Kalıp Planı' },
    { workItemId: workItems[3].id, quantity: 8400, unit: 'm²', drawingRef: 'M-001 Mimari Plan' },
    { workItemId: workItems[4].id, quantity: 22000, unit: 'm²', drawingRef: 'M-002 İç Mekan' },
    { workItemId: workItems[5].id, quantity: 6500, unit: 'm²', drawingRef: 'M-003 Yer Döşeme' },
    { workItemId: workItems[6].id, quantity: 9200, unit: 'm²', drawingRef: 'M-004 Cephe Planı' },
    { workItemId: workItems[7].id, quantity: 4800, unit: 'm', drawingRef: 'MC-001 Tesisat Planı' },
    { workItemId: workItems[8].id, quantity: 12000, unit: 'm', drawingRef: 'EL-001 Elektrik Planı' },
    { workItemId: workItems[9].id, quantity: 15000, unit: 'm³', drawingRef: 'HR-001 Hafriyat Planı' },
    { workItemId: workItems[10].id, quantity: 3800, unit: 'm²', drawingRef: 'M-005 Doğrama Planı' },
    { workItemId: workItems[11].id, quantity: 7500, unit: 'm²', drawingRef: 'M-006 Yalıtım Planı' },
  ];

  for (const t of takeoffs) {
    await prisma.quantityTakeoff.create({
      data: {
        projectId: PROJECT_ID,
        workItemId: t.workItemId,
        quantity: t.quantity,
        unit: t.unit,
        drawingRef: t.drawingRef,
        source: 'manual',
        measuredBy: USER_ID,
      },
    });
  }

  console.log(`    ✓ ${takeoffs.length} metraj kaydı oluşturuldu`);

  // ============================================================================
  // 4. ESTIMATES (Keşifler)
  // ============================================================================
  console.log('  📊 Keşifler oluşturuluyor...');

  const estimate1 = await prisma.estimate.create({
    data: {
      projectId: PROJECT_ID,
      name: '2026 Yaklaşık Maliyet Hesabı',
      type: 'yaklasik_maliyet',
      totalAmount: 0,
      vatPct: 20,
      status: 'approved',
      approvedBy: USER_ID,
      approvedDate: new Date('2026-01-15'),
      createdBy: USER_ID,
    },
  });

  // Create estimate items for each work item with takeoff
  let estimateTotal = 0;
  for (let i = 0; i < 7; i++) {
    const up = unitPrices[i];
    const t = takeoffs[i];

    // Get actual unit price from DB
    const analysis = await prisma.unitPriceAnalysis.findFirst({
      where: { workItemId: up.workItemId, isActive: true },
      orderBy: { version: 'desc' },
    });

    const unitPrice = analysis ? parseFloat(analysis.unitPrice.toString()) : up.unitPrice;
    const totalPrice = t.quantity * unitPrice;
    estimateTotal += totalPrice;

    await prisma.estimateItem.create({
      data: {
        estimateId: estimate1.id,
        workItemId: up.workItemId,
        quantity: t.quantity,
        unitPrice,
        totalPrice,
        sortOrder: i,
      },
    });
  }

  const vatAmount1 = estimateTotal * 0.20;
  await prisma.estimate.update({
    where: { id: estimate1.id },
    data: {
      totalAmount: estimateTotal,
      vatAmount: vatAmount1,
      grandTotal: estimateTotal + vatAmount1,
    },
  });

  // Revize keşif
  const estimate2 = await prisma.estimate.create({
    data: {
      projectId: PROJECT_ID,
      name: 'Revize Keşif (Mart 2026)',
      type: 'revize_kesif',
      totalAmount: estimateTotal * 1.08,
      vatPct: 20,
      vatAmount: estimateTotal * 1.08 * 0.20,
      grandTotal: estimateTotal * 1.08 * 1.20,
      status: 'draft',
      createdBy: USER_ID,
      parentEstimateId: estimate1.id,
      notes: 'Demir ve beton fiyat artışı nedeniyle revize edildi',
    },
  });

  console.log(`    ✓ 2 keşif oluşturuldu (Toplam: ₺${Math.round(estimateTotal).toLocaleString('tr-TR')})`);

  // ============================================================================
  // 5. BUDGETS (Bütçe)
  // ============================================================================
  console.log('  💵 Bütçe oluşturuluyor...');

  const budget = await prisma.budget.create({
    data: {
      projectId: PROJECT_ID,
      estimateId: estimate1.id,
      name: '2026 Ana Bütçe',
      totalAmount: estimateTotal * 1.05, // %5 contingency
      currency: 'TRY',
      status: 'active',
      approvedBy: USER_ID,
    },
  });

  const budgetCategories = [
    { desc: 'Kaba Yapı — Demir İşleri', planned: takeoffs[0].quantity * unitPrices[0].unitPrice, category: 'material' },
    { desc: 'Kaba Yapı — Beton İşleri', planned: takeoffs[1].quantity * unitPrices[1].unitPrice, category: 'material' },
    { desc: 'Kaba Yapı — Kalıp İşleri', planned: takeoffs[2].quantity * unitPrices[2].unitPrice, category: 'labor' },
    { desc: 'İnce Yapı — Duvar İşleri', planned: takeoffs[3].quantity * unitPrices[3].unitPrice, category: 'subcontract' },
    { desc: 'İnce Yapı — Sıva İşleri', planned: takeoffs[4].quantity * unitPrices[4].unitPrice, category: 'subcontract' },
    { desc: 'İnce Yapı — Kaplama İşleri', planned: takeoffs[5].quantity * unitPrices[5].unitPrice, category: 'subcontract' },
    { desc: 'Yalıtım — Mantolama', planned: takeoffs[6].quantity * unitPrices[6].unitPrice, category: 'subcontract' },
    { desc: 'Genel Giderler & Yönetim', planned: estimateTotal * 0.08, category: 'overhead' },
  ];

  for (const bc of budgetCategories) {
    await prisma.budgetItem.create({
      data: {
        budgetId: budget.id,
        description: bc.desc,
        plannedAmount: bc.planned,
        actualAmount: bc.planned * (0.3 + Math.random() * 0.4), // %30-70 harcama simülasyonu
        category: bc.category,
      },
    });
  }

  console.log(`    ✓ Bütçe oluşturuldu: ₺${Math.round(estimateTotal * 1.05).toLocaleString('tr-TR')}`);

  // ============================================================================
  // 6. PAYMENT CERTIFICATES (Hakedişler)
  // ============================================================================
  console.log('  📝 Hakedişler oluşturuluyor...');

  const payments = [
    { period: 1, start: '2026-01-01', end: '2026-01-31', status: 'paid', grossPct: 0.12 },
    { period: 2, start: '2026-02-01', end: '2026-02-28', status: 'approved', grossPct: 0.15 },
    { period: 3, start: '2026-03-01', end: '2026-03-31', status: 'submitted', grossPct: 0.13 },
    { period: 4, start: '2026-04-01', end: '2026-04-30', status: 'draft', grossPct: 0.10 },
  ];

  let cumulativeAmount = 0;
  for (const p of payments) {
    const grossAmount = estimateTotal * p.grossPct;
    const retentionPct = 5;
    const retentionAmount = grossAmount * retentionPct / 100;
    const vatPct = 20;
    const subtotal = grossAmount - retentionAmount;
    const vatAmount = subtotal * vatPct / 100;
    const netAmount = subtotal + vatAmount;
    cumulativeAmount += netAmount;

    const cert = await prisma.paymentCertificate.create({
      data: {
        projectId: PROJECT_ID,
        budgetId: budget.id,
        periodNumber: p.period,
        periodStart: new Date(p.start),
        periodEnd: new Date(p.end),
        grossAmount,
        retentionPct,
        retentionAmount,
        vatPct,
        vatAmount,
        netAmount,
        cumulativeAmount,
        status: p.status,
        submittedDate: p.status !== 'draft' ? new Date(p.end) : null,
        approvedBy: ['approved', 'paid'].includes(p.status) ? USER_ID : null,
        approvedDate: ['approved', 'paid'].includes(p.status) ? new Date(p.end) : null,
        paymentDate: p.status === 'paid' ? new Date(p.end) : null,
        createdBy: USER_ID,
      },
    });

    // Add some payment items for each certificate
    for (let i = 0; i < Math.min(5, workItems.length); i++) {
      const contractQty = takeoffs[i].quantity;
      const currentQty = contractQty * p.grossPct * (0.8 + Math.random() * 0.4);
      const uprice = unitPrices[i]?.unitPrice || 1000;

      await prisma.paymentItem.create({
        data: {
          certificateId: cert.id,
          workItemId: workItems[i].id,
          contractQty,
          previousQty: p.period > 1 ? contractQty * (p.grossPct * (p.period - 1)) * 0.9 : 0,
          currentQty,
          cumulativeQty: currentQty * p.period * 0.95,
          unitPrice: uprice,
          currentAmount: currentQty * uprice,
          cumulativeAmount: currentQty * p.period * 0.95 * uprice,
          completionPct: Math.min(((currentQty * p.period * 0.95) / contractQty) * 100, 100),
        },
      });
    }
  }

  console.log(`    ✓ ${payments.length} hakediş oluşturuldu`);

  // ============================================================================
  // 7. EVM SNAPSHOTS
  // ============================================================================
  console.log('  📈 EVM snapshot\'ları oluşturuluyor...');

  const bac = estimateTotal * 1.05;
  const evmData = [
    { date: '2026-01-15', pvPct: 8, evPct: 7, acPct: 7.5 },
    { date: '2026-01-31', pvPct: 12, evPct: 11, acPct: 12.5 },
    { date: '2026-02-15', pvPct: 18, evPct: 17.5, acPct: 19 },
    { date: '2026-02-28', pvPct: 25, evPct: 24, acPct: 26 },
    { date: '2026-03-15', pvPct: 32, evPct: 30, acPct: 33 },
    { date: '2026-03-31', pvPct: 38, evPct: 36, acPct: 39.5 },
    { date: '2026-04-15', pvPct: 45, evPct: 42, acPct: 46 },
  ];

  for (const e of evmData) {
    const pv = bac * e.pvPct / 100;
    const ev = bac * e.evPct / 100;
    const ac = bac * e.acPct / 100;

    const cv = ev - ac;
    const sv = ev - pv;
    const cpi = ac !== 0 ? ev / ac : 0;
    const spi = pv !== 0 ? ev / pv : 0;
    const eac = cpi > 0 ? bac / cpi : bac;
    const etc = eac - ac;
    const vac = bac - eac;
    const tcpi = (bac - ac) !== 0 ? (bac - ev) / (bac - ac) : 0;

    await prisma.evmSnapshot.create({
      data: {
        projectId: PROJECT_ID,
        snapshotDate: new Date(e.date),
        pv: Math.round(pv * 100) / 100,
        ev: Math.round(ev * 100) / 100,
        ac: Math.round(ac * 100) / 100,
        cv: Math.round(cv * 100) / 100,
        sv: Math.round(sv * 100) / 100,
        cpi: Math.round(cpi * 10000) / 10000,
        spi: Math.round(spi * 10000) / 10000,
        eac: Math.round(eac * 100) / 100,
        etc: Math.round(etc * 100) / 100,
        vac: Math.round(vac * 100) / 100,
        tcpi: Math.round(tcpi * 10000) / 10000,
      },
    });
  }

  console.log(`    ✓ ${evmData.length} EVM snapshot oluşturuldu`);

  // ============================================================================
  // 8. COST RECORDS (Maliyet Kayıtları)
  // ============================================================================
  console.log('  📑 Maliyet kayıtları oluşturuluyor...');

  const costRecords = [
    { amount: estimateTotal * 0.05, type: 'actual', date: '2026-01-10', desc: 'Beton çeliği alımı', vendor: 'Kardemir A.Ş.' },
    { amount: estimateTotal * 0.04, type: 'actual', date: '2026-01-20', desc: 'Hazır beton temini', vendor: 'Oyak Beton' },
    { amount: estimateTotal * 0.03, type: 'actual', date: '2026-02-05', desc: 'Kalıp malzemesi', vendor: 'Polat Kalıp' },
    { amount: estimateTotal * 0.025, type: 'actual', date: '2026-02-15', desc: 'Tuğla teslimatı', vendor: 'Kütahya Seramik' },
    { amount: estimateTotal * 0.06, type: 'actual', date: '2026-03-01', desc: 'Alt yüklenici ödemesi — Demir', vendor: 'Güçlü İnşaat' },
    { amount: estimateTotal * 0.15, type: 'commitment', date: '2026-01-05', desc: 'Mekanik tesisat sözleşmesi', vendor: 'Termo Tesisat Ltd.' },
    { amount: estimateTotal * 0.12, type: 'commitment', date: '2026-01-05', desc: 'Elektrik tesisat sözleşmesi', vendor: 'Volt Elektrik A.Ş.' },
    { amount: estimateTotal * 0.20, type: 'forecast', date: '2026-06-01', desc: 'İnce yapı tahmini maliyeti', vendor: '' },
    { amount: estimateTotal * 0.10, type: 'forecast', date: '2026-09-01', desc: 'Yalıtım tahmini maliyeti', vendor: '' },
  ];

  for (const cr of costRecords) {
    await prisma.costRecord.create({
      data: {
        projectId: PROJECT_ID,
        amount: cr.amount,
        type: cr.type,
        date: new Date(cr.date),
        description: cr.desc,
        vendor: cr.vendor || null,
      },
    });
  }

  console.log(`    ✓ ${costRecords.length} maliyet kaydı oluşturuldu`);

  console.log('\n✅ CostPilot seed tamamlandı!');
  console.log(`   Proje: ${PROJECT_ID}`);
  console.log(`   Toplam Keşif: ₺${Math.round(estimateTotal).toLocaleString('tr-TR')}`);
  console.log(`   Bütçe (BAC): ₺${Math.round(bac).toLocaleString('tr-TR')}`);
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
