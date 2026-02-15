// Unit Price Resources Routes — Cost Items Management

import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

const router = Router();

/**
 * POST /cost/unit-prices/:analysisId/resources
 * Add a resource to a unit price analysis
 */
router.post('/:analysisId/resources', async (req, res, next) => {
  try {
    const { analysisId } = req.params;
    const { resourceType, code, name, unit, quantity, unitRate, rateSource, rateDate } = req.body;

    if (!resourceType || !name || !unit || quantity === undefined || unitRate === undefined) {
      return res.status(400).json({ error: 'resourceType, name, unit, quantity, and unitRate are required' });
    }

    // Verify analysis exists
    const analysis = await prisma.unitPriceAnalysis.findUnique({ where: { id: analysisId } });
    if (!analysis) throw new NotFoundError('Unit price analysis', analysisId);

    // Get current max sortOrder
    const maxSort = await prisma.unitPriceResource.findFirst({
      where: { analysisId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (maxSort?.sortOrder ?? -1) + 1;

    // Create resource
    const total = quantity * unitRate;
    const resource = await prisma.unitPriceResource.create({
      data: {
        analysisId,
        resourceType,
        code: code || null,
        name,
        unit,
        quantity,
        unitRate,
        total,
        rateSource: rateSource || 'manual',
        rateDate: rateDate ? new Date(rateDate) : null,
        sortOrder,
      },
    });

    // Recalculate analysis totals
    await recalculateAnalysisTotals(analysisId);

    res.status(201).json({ data: resource });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /cost/resources/:id
 * Update a resource
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resourceType, code, name, unit, quantity, unitRate, rateSource, rateDate } = req.body;

    const existing = await prisma.unitPriceResource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Resource', id);

    const total = (quantity ?? existing.quantity) * (unitRate ?? existing.unitRate);

    const resource = await prisma.unitPriceResource.update({
      where: { id },
      data: {
        ...(resourceType && { resourceType }),
        ...(code !== undefined && { code: code || null }),
        ...(name && { name }),
        ...(unit && { unit }),
        ...(quantity !== undefined && { quantity }),
        ...(unitRate !== undefined && { unitRate }),
        total,
        ...(rateSource && { rateSource }),
        ...(rateDate !== undefined && { rateDate: rateDate ? new Date(rateDate) : null }),
      },
    });

    // Recalculate analysis totals
    await recalculateAnalysisTotals(existing.analysisId);

    res.json({ data: resource });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /cost/resources/:id
 * Delete a resource
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const resource = await prisma.unitPriceResource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundError('Resource', id);

    const analysisId = resource.analysisId;

    await prisma.unitPriceResource.delete({ where: { id } });

    // Recalculate analysis totals
    await recalculateAnalysisTotals(analysisId);

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /cost/resources/:id/reorder
 * Update resource sort order
 */
router.put('/:id/reorder', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sortOrder } = req.body;

    if (sortOrder === undefined || sortOrder < 0) {
      return res.status(400).json({ error: 'sortOrder is required and must be >= 0' });
    }

    const resource = await prisma.unitPriceResource.update({
      where: { id },
      data: { sortOrder },
    });

    res.json({ data: resource });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function recalculateAnalysisTotals(analysisId: string) {
  const resources = await prisma.unitPriceResource.findMany({
    where: { analysisId },
  });

  let laborCost = 0;
  let materialCost = 0;
  let equipmentCost = 0;

  for (const r of resources) {
    const total = Number(r.total);
    if (r.resourceType === 'labor') laborCost += total;
    else if (r.resourceType === 'material') materialCost += total;
    else if (r.resourceType === 'equipment') equipmentCost += total;
  }

  const subtotal = laborCost + materialCost + equipmentCost;

  const analysis = await prisma.unitPriceAnalysis.findUnique({ where: { id: analysisId } });
  if (!analysis) return;

  const overheadPct = Number(analysis.overheadPct || 0);
  const profitPct = Number(analysis.profitPct || 0);

  const overheadAmount = (subtotal * overheadPct) / 100;
  const profitAmount = (subtotal * profitPct) / 100;
  const unitPrice = subtotal + overheadAmount + profitAmount;

  await prisma.unitPriceAnalysis.update({
    where: { id: analysisId },
    data: {
      laborCost,
      materialCost,
      equipmentCost,
      subtotal,
      overheadAmount,
      profitAmount,
      unitPrice,
    },
  });
}

export default router;
