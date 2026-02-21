import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';
import pino from 'pino';
import {
  ContractProfileSchema,
  upsertContractProfile,
  getProjectPolicies,
  overridePolicy,
  resolveAllPolicies,
  DELIVERY_MODELS,
  COMMERCIAL_MODELS,
  CONTRACT_FORMS,
  POLICY_MODULES,
  type PolicyModule,
} from '../services/policy-resolver.service';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export default function contractProfileRoutes(prisma: PrismaClient) {
  const router = Router();

  // GET /projects/:id/contract-profile — Get contract profile & policies
  router.get('/projects/:id/contract-profile', async (req, res) => {
    try {
      const projectId = req.params.id;
      const module = req.query.module as PolicyModule | undefined;

      const result = await getProjectPolicies(projectId, module);

      if (!result.profileId) {
        return res.json({
          data: null,
          meta: { hasProfile: false },
          error: null,
        });
      }

      // Fetch full profile
      const profile = await prisma.contractProfile.findUnique({
        where: { projectId },
      });

      res.json({
        data: {
          profile: {
            id: profile!.id,
            deliveryModel: profile!.deliveryModel,
            commercialModel: profile!.commercialModel,
            retentionPct: profile!.retentionPct,
            advancePct: profile!.advancePct,
            paymentTermDays: profile!.paymentTermDays,
            priceEscalation: profile!.priceEscalation,
            escalationIndex: profile!.escalationIndex,
            contractForm: profile!.contractForm,
            defectsLiabilityMonths: profile!.defectsLiabilityMonths,
          },
          policies: result.policies,
        },
        meta: { hasProfile: true, policyCount: result.policies.length },
        error: null,
      });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // POST /projects/:id/contract-profile — Create or update contract profile
  router.post('/projects/:id/contract-profile', async (req, res) => {
    try {
      const projectId = req.params.id;

      // Verify project exists
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const input = ContractProfileSchema.parse(req.body);
      const result = await upsertContractProfile(projectId, input);

      // Fetch the created/updated policies
      const policies = await getProjectPolicies(projectId);

      res.status(201).json({
        data: {
          profileId: result.profileId,
          policyCount: result.policyCount,
          policies: policies.policies,
        },
        error: null,
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ data: null, error: { code: 'VALIDATION', message: 'Validation failed', details: err.errors } });
      }
      logger.error(err);
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // PATCH /projects/:id/contract-profile/policies/:module/:policyKey — Override a policy
  router.patch('/projects/:id/contract-profile/policies/:module/:policyKey', async (req, res) => {
    try {
      const { id: projectId, module, policyKey } = req.params;
      const { value } = req.body;

      if (!value || typeof value !== 'string') {
        return res.status(400).json({ data: null, error: { code: 'VALIDATION', message: 'value (string) is required' } });
      }

      if (!POLICY_MODULES.includes(module as PolicyModule)) {
        return res.status(400).json({ data: null, error: { code: 'VALIDATION', message: `Invalid module: ${module}` } });
      }

      await overridePolicy(projectId, module as PolicyModule, policyKey, value);

      res.json({ data: { overridden: true, module, policyKey, value }, error: null });
    } catch (err: any) {
      logger.error(err);
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/contract-profile/preview — Preview policies without saving
  router.post('/projects/:id/contract-profile/preview', async (req, res) => {
    try {
      const input = ContractProfileSchema.parse(req.body);
      const policies = resolveAllPolicies(input);

      // Group by module
      const byModule: Record<string, typeof policies> = {};
      for (const p of policies) {
        if (!byModule[p.module]) byModule[p.module] = [];
        byModule[p.module].push(p);
      }

      res.json({
        data: {
          deliveryModel: input.deliveryModel,
          commercialModel: input.commercialModel,
          totalPolicies: policies.length,
          byModule,
        },
        error: null,
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ data: null, error: { code: 'VALIDATION', message: 'Validation failed', details: err.errors } });
      }
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /contract-profile/options — Get available delivery models, commercial models, etc.
  router.get('/contract-profile/options', (_req, res) => {
    res.json({
      data: {
        deliveryModels: DELIVERY_MODELS,
        commercialModels: COMMERCIAL_MODELS,
        contractForms: CONTRACT_FORMS,
        modules: POLICY_MODULES,
      },
      error: null,
    });
  });

  return router;
}
