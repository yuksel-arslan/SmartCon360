import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { getTradesForProjectType, getDisciplineOptions } from '../templates/trade-discipline-templates';
import { getAvailableStandards } from '../templates/wbs-templates';
import { CBS_STANDARDS, getDefaultCbsStandard } from '../templates/cbs-templates';
import { notifyHubSetupComplete } from '../utils/service-client';

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
          select: { projectType: true, currency: true, name: true },
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
      const { currentStep, completedSteps, classificationStandard, taktPlanGenerated } = req.body;

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

      res.status(201).json({
        data: created,
        meta: { requested: tradesToApply.length, created: created.length },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/setup/export — Export setup data for cross-module consumption
  router.get('/projects/:id/setup/export', async (req, res) => {
    try {
      const projectId = req.params.id;

      const [project, setup, wbsNodes, cbsNodes, trades, drawings] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId }, select: { projectType: true, currency: true, name: true, code: true } }),
        prisma.projectSetup.findUnique({ where: { projectId } }),
        prisma.wbsNode.findMany({ where: { projectId, isActive: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }] }),
        prisma.cbsNode.findMany({ where: { projectId, isActive: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }], include: { wbsNode: { select: { id: true, code: true, name: true } } } }),
        prisma.trade.findMany({ where: { projectId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
        prisma.drawing.findMany({ where: { projectId }, select: { id: true, discipline: true, drawingNo: true, title: true, fileType: true } }),
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

      const summary = {
        drawings: drawingCount,
        wbsNodes: wbsCount,
        cbsNodes: cbsCount,
        trades: tradeCount,
        boqUploaded: setup?.boqUploaded || false,
        standard: setup?.classificationStandard || 'uniclass',
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
