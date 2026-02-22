import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { getTradesForProjectType, getDisciplineOptions } from '../templates/trade-discipline-templates';
import { getRelationshipsForTrades } from '../templates/activity-relationship-templates';
import { getAvailableStandards } from '../templates/wbs-templates';
import { CBS_STANDARDS, getDefaultCbsStandard } from '../templates/cbs-templates';
import { notifyHubSetupComplete } from '../utils/service-client';
import { classificationService } from '../services/classification.service';
import { upsertContractProfile, DELIVERY_MODELS, COMMERCIAL_MODELS, type DeliveryModel, type CommercialModel } from '../services/policy-resolver.service';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const router = Router();

const SETUP_STEPS = [
  { id: 'classification', label: 'Classification Standard', description: 'Select WBS/CBS standard' },
  { id: 'drawings', label: 'Drawings', description: 'Upload project drawings' },
  { id: 'boq', label: 'BOQ', description: 'Upload Bill of Quantities (optional)' },
  { id: 'wbs', label: 'WBS', description: 'Work Breakdown Structure' },
  { id: 'cbs', label: 'CBS', description: 'Cost Breakdown Structure' },
  { id: 'trades', label: 'Trades', description: 'Configure discipline trades' },
  { id: 'review', label: 'Review', description: 'Review and finalize setup' },
] as const;

export default function setupRoutes(prisma: PrismaClient) {
  // GET /projects/:id/setup — Get setup state
  router.get('/projects/:id/setup', async (req, res) => {
    try {
      const projectId = req.params.id;

      const [setup, project, drawingCount, wbsCount, cbsCount] = await Promise.all([
        prisma.projectSetup.findUnique({ where: { projectId } }),
        prisma.project.findUnique({
          where: { id: projectId },
          select: { projectType: true, currency: true, name: true, deliveryModel: true, commercialModel: true },
        }),
        prisma.drawing.count({ where: { projectId } }),
        prisma.wbsNode.count({ where: { projectId, isActive: true } }),
        prisma.cbsNode.count({ where: { projectId, isActive: true } }),
      ]);

      const state = setup || {
        currentStep: 'classification',
        completedSteps: [],
        classificationStandard: 'uniclass',
        boqUploaded: false,
        boqFileName: null,
        boqItemCount: 0,
        drawingCount: 0,
        wbsGenerated: false,
        wbsNodeCount: 0,
        cbsGenerated: false,
        cbsNodeCount: 0,
        taktPlanGenerated: false,
      };

      res.json({
        data: {
          ...state,
          drawingCount,
          wbsNodeCount: wbsCount,
          cbsNodeCount: cbsCount,
          projectType: project?.projectType,
          currency: project?.currency,
          projectName: project?.name,
          deliveryMethod: project?.deliveryModel || '',
          contractPricingModel: project?.commercialModel || '',
          steps: SETUP_STEPS,
          wbsStandards: getAvailableStandards(),
          cbsStandards: CBS_STANDARDS,
          disciplines: getDisciplineOptions(),
        },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // PATCH /projects/:id/setup — Update setup state
  router.patch('/projects/:id/setup', async (req, res) => {
    try {
      const projectId = req.params.id;
      const { currentStep, completedSteps, classificationStandard, taktPlanGenerated,
              deliveryMethod, contractPricingModel } = req.body;

      const setup = await prisma.projectSetup.upsert({
        where: { projectId },
        create: {
          projectId,
          currentStep: currentStep || 'classification',
          completedSteps: completedSteps || [],
          classificationStandard: classificationStandard || 'uniclass',
          taktPlanGenerated: taktPlanGenerated || false,
        },
        update: {
          ...(currentStep && { currentStep }),
          ...(completedSteps && { completedSteps }),
          ...(classificationStandard && { classificationStandard }),
          ...(taktPlanGenerated !== undefined && { taktPlanGenerated }),
        },
      });

      // Persist delivery/commercial model to Project table
      if (deliveryMethod || contractPricingModel) {
        const projectUpdate: Record<string, string> = {};
        if (deliveryMethod) projectUpdate.deliveryModel = deliveryMethod;
        if (contractPricingModel) projectUpdate.commercialModel = contractPricingModel;
        await prisma.project.update({
          where: { id: projectId },
          data: projectUpdate,
        });
      }

      res.json({ data: setup, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // POST /projects/:id/setup/complete-step — Mark a step as completed
  router.post('/projects/:id/setup/complete-step', async (req, res) => {
    try {
      const projectId = req.params.id;
      const { step, nextStep } = req.body;

      const setup = await prisma.projectSetup.findUnique({ where: { projectId } });
      const completed = new Set(setup?.completedSteps || []);
      completed.add(step);

      const updated = await prisma.projectSetup.upsert({
        where: { projectId },
        create: {
          projectId,
          currentStep: nextStep || step,
          completedSteps: Array.from(completed),
        },
        update: {
          currentStep: nextStep || step,
          completedSteps: Array.from(completed),
        },
      });

      res.json({ data: updated, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/setup/trade-templates — Get trade templates for project type
  router.get('/projects/:id/setup/trade-templates', async (req, res) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.id },
        select: { projectType: true },
      });

      if (!project) {
        return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const trades = getTradesForProjectType(project.projectType);
      const disciplines = getDisciplineOptions();

      res.json({
        data: {
          projectType: project.projectType,
          trades,
          disciplines,
          totalTrades: trades.length,
        },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // POST /projects/:id/setup/apply-trades — Apply discipline trade templates to project
  router.post('/projects/:id/setup/apply-trades', async (req, res) => {
    try {
      const projectId = req.params.id;
      const { selectedDisciplines, selectedTradeCodes } = req.body;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { projectType: true },
      });

      if (!project) {
        return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      let tradesToApply = getTradesForProjectType(project.projectType);

      // Filter by selected disciplines if specified
      if (selectedDisciplines && selectedDisciplines.length > 0) {
        tradesToApply = tradesToApply.filter((t) => selectedDisciplines.includes(t.discipline));
      }

      // Filter by specific trade codes if specified
      if (selectedTradeCodes && selectedTradeCodes.length > 0) {
        tradesToApply = tradesToApply.filter((t) => selectedTradeCodes.includes(t.code));
      }

      // Create trades in project
      const created = [];
      for (const template of tradesToApply) {
        try {
          const trade = await prisma.trade.create({
            data: {
              projectId,
              name: template.name,
              code: template.code,
              color: template.color,
              defaultCrewSize: template.defaultCrewSize,
              discipline: template.discipline,
              sortOrder: template.sortOrder,
              predecessorTradeIds: [],
            },
          });
          created.push(trade);
        } catch (err: any) {
          // Skip duplicates
          if (err.code !== 'P2002') throw err;
        }
      }

      // Build code → id map for resolving relationships
      const codeToId = new Map(created.map((t) => [t.code, t.id]));

      // Resolve predecessorTradeIds from template predecessorCodes
      for (const template of tradesToApply) {
        const tradeId = codeToId.get(template.code);
        if (!tradeId || template.predecessorCodes.length === 0) continue;

        const resolvedIds = template.predecessorCodes
          .map((code) => codeToId.get(code))
          .filter((id): id is string => !!id);

        if (resolvedIds.length > 0) {
          await prisma.trade.update({
            where: { id: tradeId },
            data: { predecessorTradeIds: resolvedIds },
          });
        }
      }

      // Create activity relationships from templates
      const tradeCodes = created.map((t) => t.code);
      const relationshipTemplates = getRelationshipsForTrades(tradeCodes, project.projectType);
      const createdRelationships = [];

      for (const rel of relationshipTemplates) {
        const predId = codeToId.get(rel.predecessorCode);
        const succId = codeToId.get(rel.successorCode);
        if (!predId || !succId) continue;

        try {
          const relationship = await prisma.tradeRelationship.create({
            data: {
              projectId,
              predecessorTradeId: predId,
              successorTradeId: succId,
              type: rel.type,
              lagDays: rel.lagDays,
              mandatory: rel.mandatory,
              description: rel.description,
              source: 'template',
            },
          });
          createdRelationships.push(relationship);
        } catch (err: any) {
          // Skip duplicates
          if (err.code !== 'P2002') throw err;
        }
      }

      res.status(201).json({
        data: created,
        meta: {
          requested: tradesToApply.length,
          created: created.length,
          relationshipsCreated: createdRelationships.length,
        },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // ══════════════════════════════════════
  // OBS GENERATION — from Uniclass Ro or OmniClass Table 33
  // ══════════════════════════════════════

  /** GET /projects/:id/setup/obs-templates — Get OBS template options */
  router.get('/projects/:id/setup/obs-templates', async (_req, res) => {
    const uniclassRoTree = classificationService.getObsUniclassNodes();
    const omniclass33Tree = classificationService.getObsOmniClassNodes();

    res.json({
      data: {
        standards: [
          {
            value: 'uniclass_ro',
            label: 'Uniclass 2015 Ro (Roles)',
            description: '232 construction roles — Management, Delivery, Design, Site roles',
            region: 'UK/International',
            rootCategories: uniclassRoTree.map((n) => ({ code: n.code, title: n.title, childCount: n.children.length })),
          },
          {
            value: 'omniclass_33',
            label: 'OmniClass Table 33 (Disciplines)',
            description: '251 disciplines — Planning, Design, Construction, PM, Support',
            region: 'International',
            rootCategories: omniclass33Tree.map((n) => ({ code: n.code, title: n.title, childCount: n.children.length })),
          },
          {
            value: 'custom',
            label: 'Custom',
            description: 'Create your own OBS structure manually',
            region: 'Any',
            rootCategories: [],
          },
        ],
      },
      error: null,
    });
  });

  /** POST /projects/:id/setup/generate-obs — Generate OBS from Uniclass Ro or OmniClass 33 */
  router.post('/projects/:id/setup/generate-obs', async (req, res) => {
    try {
      const projectId = req.params.id;
      const { standard, selectedCodes } = req.body;

      if (!standard) {
        return res.status(400).json({
          data: null,
          error: { code: 'VALIDATION', message: 'standard is required (uniclass_ro, omniclass_33, or custom)' },
        });
      }

      // Clear existing OBS nodes
      await prisma.obsNode.deleteMany({ where: { projectId } });

      if (standard === 'custom') {
        await prisma.projectSetup.upsert({
          where: { projectId },
          create: { projectId, obsGenerated: true, obsNodeCount: 0 },
          update: { obsGenerated: true, obsNodeCount: 0 },
        });
        return res.status(201).json({ data: [], meta: { standard: 'custom', count: 0 }, error: null });
      }

      let items: Array<{ code: string; title: string; level: number; parentCode: string | null }> = [];

      if (standard === 'uniclass_ro') {
        const table = classificationService.getUniclassTable('Ro');
        if (!table) {
          return res.status(500).json({ data: null, error: { code: 'DATA_NOT_FOUND', message: 'Uniclass Ro data not found' } });
        }
        items = table.items.filter((i) => i.level <= 3).map((i) => ({
          code: i.code, title: i.title, level: i.level, parentCode: i.parentCode,
        }));
      } else if (standard === 'omniclass_33') {
        const table = classificationService.getOmniClassTable('33');
        if (!table) {
          return res.status(500).json({ data: null, error: { code: 'DATA_NOT_FOUND', message: 'OmniClass Table 33 data not found' } });
        }
        items = table.items.filter((i) => i.level <= 3).map((i) => ({
          code: i.code, title: i.title, level: i.level, parentCode: i.parentCode,
        }));
      } else {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_STANDARD', message: `Unknown OBS standard: ${standard}` },
        });
      }

      // Filter by selected codes if provided
      if (selectedCodes && selectedCodes.length > 0) {
        const selectedSet = new Set<string>(selectedCodes);
        // Include selected codes and all their ancestors
        const toInclude = new Set<string>();
        for (const code of selectedCodes) {
          toInclude.add(code);
          // Walk up to root
          let current = items.find((i) => i.code === code);
          while (current?.parentCode) {
            toInclude.add(current.parentCode);
            current = items.find((i) => i.code === current!.parentCode);
          }
          // Also include direct children of selected
          items.filter((i) => i.parentCode === code).forEach((i) => toInclude.add(i.code));
        }
        items = items.filter((i) => toInclude.has(i.code));
      }

      // Create OBS nodes in order (parents first)
      const codeToId = new Map<string, string>();
      const createdNodes = [];
      let sortOrder = 0;

      // Determine nodeType from level
      const levelToNodeType = (level: number): string => {
        if (level === 1) return 'company';
        if (level === 2) return 'department';
        return 'team';
      };

      for (const item of items) {
        const parentId = item.parentCode ? codeToId.get(item.parentCode) || null : null;
        const parentPath = item.parentCode
          ? (createdNodes.find((n) => n.code === item.parentCode)?.path || '')
          : '';

        const node = await prisma.obsNode.create({
          data: {
            projectId,
            code: item.code,
            name: item.title,
            uniclassCode: standard === 'uniclass_ro' ? item.code : undefined,
            omniclassCode: standard === 'omniclass_33' ? item.code : undefined,
            nodeType: levelToNodeType(item.level),
            level: item.level,
            path: parentPath ? `${parentPath}.${item.code}` : item.code,
            sortOrder: sortOrder++,
            parentId,
            metadata: { sourceStandard: standard },
          },
        });

        codeToId.set(item.code, node.id);
        createdNodes.push(node);
      }

      // Update project setup
      await prisma.projectSetup.upsert({
        where: { projectId },
        create: { projectId, obsGenerated: true, obsNodeCount: createdNodes.length },
        update: { obsGenerated: true, obsNodeCount: createdNodes.length },
      });

      res.status(201).json({
        data: createdNodes,
        meta: { standard, count: createdNodes.length },
        error: null,
      });
    } catch (err: any) {
      logger.error(err, 'OBS generation failed');
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/setup/export — Export setup data for cross-module consumption
  router.get('/projects/:id/setup/export', async (req, res) => {
    try {
      const projectId = req.params.id;

      const [project, setup, wbsNodes, cbsNodes, trades, drawings, contractProfile] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId }, select: { projectType: true, currency: true, name: true, code: true, deliveryModel: true, commercialModel: true } }),
        prisma.projectSetup.findUnique({ where: { projectId } }),
        prisma.wbsNode.findMany({ where: { projectId, isActive: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }] }),
        prisma.cbsNode.findMany({ where: { projectId, isActive: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }], include: { wbsNode: { select: { id: true, code: true, name: true } } } }),
        prisma.trade.findMany({ where: { projectId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.drawing.findMany({ where: { projectId }, select: { id: true, discipline: true, drawingNo: true, title: true, fileType: true } }),
        prisma.contractProfile.findUnique({ where: { projectId }, include: { policies: true } }),
      ]);

      res.json({
        data: {
          project,
          setup: {
            standard: setup?.classificationStandard || 'uniclass',
            boqUploaded: setup?.boqUploaded || false,
            wbsGenerated: setup?.wbsGenerated || false,
            cbsGenerated: setup?.cbsGenerated || false,
          },
          wbs: { nodes: wbsNodes, count: wbsNodes.length },
          cbs: { nodes: cbsNodes, count: cbsNodes.length },
          trades: { items: trades, count: trades.length },
          drawings: { items: drawings, count: drawings.length },
          contractProfile: contractProfile ? {
            deliveryModel: contractProfile.deliveryModel,
            commercialModel: contractProfile.commercialModel,
            retentionPct: contractProfile.retentionPct,
            policies: contractProfile.policies.map(p => ({
              module: p.module, policyKey: p.policyKey, policyValue: p.policyValue,
            })),
          } : null,
        },
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message } });
    }
  });

  // POST /projects/:id/setup/finalize — Finalize project setup
  router.post('/projects/:id/setup/finalize', async (req, res) => {
    try {
      const projectId = req.params.id;

      // Get setup state
      const [setup, drawingCount, wbsCount, cbsCount, tradeCount] = await Promise.all([
        prisma.projectSetup.findUnique({ where: { projectId } }),
        prisma.drawing.count({ where: { projectId } }),
        prisma.wbsNode.count({ where: { projectId, isActive: true } }),
        prisma.cbsNode.count({ where: { projectId, isActive: true } }),
        prisma.trade.count({ where: { projectId, isActive: true } }),
      ]);

      // Update setup as complete
      const completed = new Set(setup?.completedSteps || []);
      completed.add('review');

      await prisma.projectSetup.upsert({
        where: { projectId },
        create: {
          projectId,
          currentStep: 'review',
          completedSteps: Array.from(completed),
          drawingCount,
          wbsNodeCount: wbsCount,
          cbsNodeCount: cbsCount,
        },
        update: {
          currentStep: 'review',
          completedSteps: Array.from(completed),
          drawingCount,
          wbsNodeCount: wbsCount,
          cbsNodeCount: cbsCount,
        },
      });

      // Update project status
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'active' },
      });

      // Auto-generate contract profile if delivery/commercial model is set
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { deliveryModel: true, commercialModel: true },
      });

      let contractProfileResult = null;
      if (project?.deliveryModel && project?.commercialModel &&
          DELIVERY_MODELS.includes(project.deliveryModel as DeliveryModel) &&
          COMMERCIAL_MODELS.includes(project.commercialModel as CommercialModel)) {
        try {
          contractProfileResult = await upsertContractProfile(projectId, {
            deliveryModel: project.deliveryModel as DeliveryModel,
            commercialModel: project.commercialModel as CommercialModel,
          });
          logger.info({ projectId, ...contractProfileResult }, 'Contract profile generated on setup finalize');
        } catch (err) {
          logger.warn(err, 'Contract profile generation failed (non-blocking)');
        }
      }

      const summary = {
        drawings: drawingCount,
        wbsNodes: wbsCount,
        cbsNodes: cbsCount,
        trades: tradeCount,
        boqUploaded: setup?.boqUploaded || false,
        standard: setup?.classificationStandard || 'uniclass',
        contractProfile: contractProfileResult,
      };

      // Notify hub-service about setup completion (best-effort)
      const authHeader = req.headers.authorization;
      notifyHubSetupComplete(projectId, summary, authHeader).catch((err) => {
        logger.warn(err, 'Hub notification failed (non-blocking)');
      });

      res.json({
        data: {
          finalized: true,
          summary,
        },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  return router;
}
