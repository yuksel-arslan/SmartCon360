// GreenSite Routes — Carbon Records, Waste Records, Certifications

import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { getGreenSitePolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

router.get('/summary/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [
      totalCarbonAgg,
      totalWasteAgg,
      recycledWasteAgg,
      landfillWasteAgg,
      totalCertifications,
      achievedCertifications,
    ] = await Promise.all([
      prisma.carbonRecord.aggregate({ where: { projectId }, _sum: { co2eTonnes: true } }),
      prisma.wasteRecord.aggregate({ where: { projectId }, _sum: { quantityTonnes: true } }),
      prisma.wasteRecord.aggregate({
        where: { projectId, disposition: { in: ['recycled', 'reused', 'composted'] } },
        _sum: { quantityTonnes: true },
      }),
      prisma.wasteRecord.aggregate({
        where: { projectId, disposition: 'landfill' },
        _sum: { quantityTonnes: true },
      }),
      prisma.certification.count({ where: { projectId } }),
      prisma.certification.count({ where: { projectId, currentStatus: 'achieved' } }),
    ]);

    const totalCarbon = Number(totalCarbonAgg._sum.co2eTonnes ?? 0);
    const totalWaste = Number(totalWasteAgg._sum.quantityTonnes ?? 0);
    const recycledWaste = Number(recycledWasteAgg._sum.quantityTonnes ?? 0);
    const landfillWaste = Number(landfillWasteAgg._sum.quantityTonnes ?? 0);
    const diversionRate = totalWaste > 0 ? Math.round(((totalWaste - landfillWaste) / totalWaste) * 100) : 0;

    const policies = await getGreenSitePolicies(projectId);

    res.json({
      data: {
        totalCarbonTonnes: totalCarbon,
        totalWasteTonnes: totalWaste,
        recycledWasteTonnes: recycledWaste,
        landfillWasteTonnes: landfillWaste,
        diversionRate,
        diversionTarget: policies.wasteDiversionTarget,
        meetsDiversionTarget: diversionRate >= policies.wasteDiversionTarget,
        totalCertifications,
        achievedCertifications,
        carbonTracking: policies.carbonTracking,
        wasteDiversionTarget: policies.wasteDiversionTarget,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── CARBON RECORDS ─────────────────────────────────────────────────────────

router.get('/carbon/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { source, category } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (source) where.source = source as string;
    if (category) where.category = category as string;

    const [records, total] = await Promise.all([
      prisma.carbonRecord.findMany({ where, orderBy: { date: 'desc' } }),
      prisma.carbonRecord.count({ where }),
    ]);

    res.json({ data: records, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/carbon', async (req, res, next) => {
  try {
    const record = await prisma.carbonRecord.create({ data: req.body });
    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
});

router.put('/carbon/:id', async (req, res, next) => {
  try {
    const record = await prisma.carbonRecord.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: record });
  } catch (error) {
    next(error);
  }
});

router.delete('/carbon/:id', async (req, res, next) => {
  try {
    await prisma.carbonRecord.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── WASTE RECORDS ──────────────────────────────────────────────────────────

router.get('/waste/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { wasteType, disposition } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (wasteType) where.wasteType = wasteType as string;
    if (disposition) where.disposition = disposition as string;

    const [records, total] = await Promise.all([
      prisma.wasteRecord.findMany({ where, orderBy: { date: 'desc' } }),
      prisma.wasteRecord.count({ where }),
    ]);

    res.json({ data: records, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/waste', async (req, res, next) => {
  try {
    const record = await prisma.wasteRecord.create({ data: req.body });
    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
});

router.put('/waste/:id', async (req, res, next) => {
  try {
    const record = await prisma.wasteRecord.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: record });
  } catch (error) {
    next(error);
  }
});

router.delete('/waste/:id', async (req, res, next) => {
  try {
    await prisma.wasteRecord.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── CERTIFICATIONS ─────────────────────────────────────────────────────────

router.get('/certifications/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { scheme, currentStatus } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (scheme) where.scheme = scheme as string;
    if (currentStatus) where.currentStatus = currentStatus as string;

    const [certs, total] = await Promise.all([
      prisma.certification.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.certification.count({ where }),
    ]);

    res.json({ data: certs, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/certifications', async (req, res, next) => {
  try {
    const cert = await prisma.certification.create({ data: req.body });
    res.status(201).json({ data: cert });
  } catch (error) {
    next(error);
  }
});

router.put('/certifications/:id', async (req, res, next) => {
  try {
    const cert = await prisma.certification.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: cert });
  } catch (error) {
    next(error);
  }
});

router.delete('/certifications/:id', async (req, res, next) => {
  try {
    await prisma.certification.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ───────────────────────────────────────────────────────────────

router.get('/policies/:projectId', async (req, res, next) => {
  try {
    const policies = await getGreenSitePolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

export default router;
