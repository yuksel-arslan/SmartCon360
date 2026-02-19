// Payment Certificates Routes — Hakediş yönetimi

import { Router } from 'express';
import { paymentService } from '../services/payment.service';
import { createPaymentCertificateSchema, addPaymentItemsSchema } from '../schemas';

const router = Router();

/**
 * POST /api/v1/cost/payments
 * Create new payment certificate
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createPaymentCertificateSchema.parse(req.body);
    const certificate = await paymentService.create(validated);
    res.status(201).json({ data: certificate });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/payments/project/:projectId
 * Get all payment certificates for a project
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const certificates = await paymentService.findByProject(req.params.projectId);
    res.json({ data: certificates });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/payments/:id
 * Get payment certificate by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const certificate = await paymentService.findById(req.params.id);
    res.json({ data: certificate });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cost/payments/:id/items
 * Add payment items (imalat metraji)
 */
router.post('/:id/items', async (req, res, next) => {
  try {
    const validated = addPaymentItemsSchema.parse(req.body);
    const items = await paymentService.addItems(req.params.id, validated.items);
    res.status(201).json({ data: items });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cost/payments/:id/submit
 * Submit payment certificate
 */
router.post('/:id/submit', async (req, res, next) => {
  try {
    const certificate = await paymentService.submit(req.params.id);
    res.json({ data: certificate });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cost/payments/:id/approve
 * Approve payment certificate
 */
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { approvedBy } = req.body;
    const certificate = await paymentService.approve(req.params.id, approvedBy);
    res.json({ data: certificate });
  } catch (error) {
    next(error);
  }
});

export default router;
