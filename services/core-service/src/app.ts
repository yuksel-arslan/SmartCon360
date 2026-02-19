import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { ZodError } from 'zod';

// Auth module
import authController from './modules/auth/controllers/auth.controller';
import adminController from './modules/auth/controllers/admin.controller';
import { authMiddleware } from './modules/auth/middleware/auth.middleware';
import { requireAdmin } from './modules/auth/middleware/requireAdmin';
import { AppError } from './modules/auth/services/auth.service';

// Project module — route modules
import drawingRoutes from './modules/project/routes/drawings';
import wbsRoutes from './modules/project/routes/wbs';
import cbsRoutes from './modules/project/routes/cbs';
import boqRoutes from './modules/project/routes/boq';
import setupRoutes from './modules/project/routes/setup';
import projectSetupRoutes from './modules/project/routes/project-setup.routes';

// Constraint module
import constraintsRouter from './modules/constraint/routes/constraints';
import { seedDemoData as seedConstraintData } from './modules/constraint/seed';

// Progress module
import progressRouter from './modules/progress/routes/progress';
import commitmentsRouter from './modules/progress/routes/commitments';
import ppcRouter from './modules/progress/routes/ppc';
import varianceRouter from './modules/progress/routes/variance';
import dailyLogRouter from './modules/progress/routes/daily-log';
import { seedDemoData as seedProgressData } from './modules/progress/seed';

// Cost module
import workItemsRouter from './modules/cost/routes/work-items';
import unitPricesRouter from './modules/cost/routes/unit-prices';
import costResourcesRouter from './modules/cost/routes/resources';
import quantityTakeoffsRouter from './modules/cost/routes/quantity-takeoffs';
import estimatesRouter from './modules/cost/routes/estimates';
import budgetsRouter from './modules/cost/routes/budgets';
import paymentsRouter from './modules/cost/routes/payments';
import costRecordsRouter from './modules/cost/routes/cost-records';
import evmRouter from './modules/cost/routes/evm';
import catalogRouter from './modules/cost/routes/catalog';
import classificationMappingRouter from './modules/cost/routes/classification-mapping';
import { authenticate } from './modules/cost/middleware/auth';

// Shared
import prisma from './lib/prisma';
import path from 'path';
import fs from 'fs';

const PORT = parseInt(process.env.PORT || '3001');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Global Middleware ──
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'core-service', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════
// AUTH MODULE — /auth, /admin
// ══════════════════════════════════════
app.use('/auth', authController);
app.use('/admin', authMiddleware, requireAdmin, adminController);

// ══════════════════════════════════════
// PROJECT MODULE — /projects
// ══════════════════════════════════════

// Projects CRUD (inline from project-service index.ts)
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  projectType: z.enum(['hotel', 'hospital', 'residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use', 'educational', 'data_center']),
  description: z.string().optional(),
  plannedStart: z.string().optional(),
  plannedFinish: z.string().optional(),
  defaultTaktTime: z.number().int().min(1).max(30).default(5),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  budget: z.number().optional(),
  currency: z.string().max(3).default('USD'),
  classificationStandard: z.string().max(30).default('uniclass'),
});

const createLocationSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
  locationType: z.enum(['site', 'building', 'floor', 'zone', 'room', 'area']),
  areaSqm: z.number().optional(),
  sortOrder: z.number().int().optional(),
});

const createTradeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  defaultCrewSize: z.number().int().min(1).default(4),
  predecessorTradeIds: z.array(z.string().uuid()).default([]),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  discipline: z.string().max(30).optional(),
});

// GET /projects
app.get('/projects', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.query.userId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: userId ? { ownerId: userId } : {},
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { locations: true, trades: true, members: true, drawings: true, wbsNodes: true } },
          projectSetup: { select: { classificationStandard: true, boqUploaded: true, wbsGenerated: true, cbsGenerated: true } },
        },
      }),
      prisma.project.count({ where: userId ? { ownerId: userId } : {} }),
    ]);

    res.json({ data: projects, meta: { page, limit, total }, error: null });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(error);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

// POST /projects
app.post('/projects', async (req, res) => {
  try {
    const input = createProjectSchema.parse(req.body);
    const ownerId = req.headers['x-user-id'] as string || req.body.ownerId;

    const project = await prisma.project.create({
      data: {
        ...input,
        plannedStart: input.plannedStart ? new Date(input.plannedStart) : undefined,
        plannedFinish: input.plannedFinish ? new Date(input.plannedFinish) : undefined,
        ownerId,
      },
    });

    await prisma.projectSetup.create({
      data: {
        projectId: project.id,
        classificationStandard: input.classificationStandard,
      },
    });

    res.status(201).json({ data: project, error: null });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return res.status(400).json({ data: null, error: { code: 'VALIDATION', message: 'Validation failed', details: err.errors } });
    }
    const error = err as { code?: string; message: string };
    if (error.code === 'P2002') {
      return res.status(409).json({ data: null, error: { code: 'DUPLICATE', message: 'Project code already exists' } });
    }
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

// GET /projects/:id
app.get('/projects/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        locations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        trades: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        members: true,
        projectSetup: true,
        _count: { select: { drawings: true, wbsNodes: true, cbsNodes: true } },
      },
    });
    if (!project) return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    res.json({ data: project, error: null });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(error);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

// PATCH /projects/:id
app.patch('/projects/:id', async (req, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: project, error: null });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(error);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

// DELETE /projects/:id (soft archive)
app.delete('/projects/:id', async (req, res) => {
  try {
    await prisma.project.update({ where: { id: req.params.id }, data: { status: 'archived' } });
    res.status(204).send();
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

// LOCATIONS (LBS)
function buildLocationTree(locations: Record<string, unknown>[]): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  const roots: Record<string, unknown>[] = [];

  locations.forEach(loc => map.set(loc.id as string, { ...loc, children: [] }));
  locations.forEach(loc => {
    const node = map.get(loc.id as string)!;
    if (loc.parentId && map.has(loc.parentId as string)) {
      (map.get(loc.parentId as string)!.children as Record<string, unknown>[]).push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

app.get('/projects/:id/locations', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      where: { projectId: req.params.id, isActive: true },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
    });
    const tree = buildLocationTree(locations as unknown as Record<string, unknown>[]);
    res.json({ data: tree, error: null });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(error);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

app.post('/projects/:id/locations', async (req, res) => {
  try {
    const input = createLocationSchema.parse(req.body);
    const projectId = req.params.id;

    let parentPath: string | null = null;
    let depth = 0;
    if (input.parentId) {
      const parent = await prisma.location.findUnique({ where: { id: input.parentId } });
      if (parent) {
        parentPath = parent.path;
        depth = parent.depth + 1;
      }
    }

    const count = await prisma.location.count({ where: { projectId, parentId: input.parentId || null } });
    const codePrefix = input.locationType.charAt(0).toUpperCase();
    const code = parentPath
      ? `${parentPath.split('/').pop()}-${codePrefix}${String(count + 1).padStart(2, '0')}`
      : `${codePrefix}${String(count + 1).padStart(1, '0')}`;
    const locPath = parentPath ? `${parentPath}/${code}` : `/${code}`;

    const location = await prisma.location.create({
      data: {
        projectId,
        parentId: input.parentId,
        name: input.name,
        locationType: input.locationType,
        code,
        path: locPath,
        depth,
        areaSqm: input.areaSqm,
        sortOrder: input.sortOrder ?? count,
      },
    });

    res.status(201).json({ data: location, error: null });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return res.status(400).json({ data: null, error: { code: 'VALIDATION', details: err.errors } });
    }
    const error = err as Error;
    logger.error(error);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

app.post('/projects/:id/locations/bulk', async (req, res) => {
  try {
    const { locations } = req.body;
    const projectId = req.params.id;
    const created: Record<string, unknown>[] = [];

    for (const loc of locations) {
      const input = createLocationSchema.parse(loc);
      let parentPath: string | null = null;
      let depth = 0;

      if (input.parentId) {
        const parent = created.find(c => c.id === input.parentId) as Record<string, unknown> | undefined ||
          await prisma.location.findUnique({ where: { id: input.parentId } });
        if (parent) { parentPath = parent.path as string; depth = (parent.depth as number) + 1; }
      }

      const count = created.filter(c => c.parentId === input.parentId).length +
        await prisma.location.count({ where: { projectId, parentId: input.parentId || null } });
      const cp = input.locationType.charAt(0).toUpperCase();
      const code = parentPath ? `${parentPath.split('/').pop()}-${cp}${String(count + 1).padStart(2, '0')}` : `${cp}${String(count + 1)}`;
      const locPath = parentPath ? `${parentPath}/${code}` : `/${code}`;

      const location = await prisma.location.create({
        data: { projectId, parentId: input.parentId, name: input.name, locationType: input.locationType, code, path: locPath, depth, areaSqm: input.areaSqm, sortOrder: count },
      });
      created.push(location as unknown as Record<string, unknown>);
    }

    res.status(201).json({ data: created, error: null });
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(error);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

// TRADES
app.get('/projects/:id/trades', async (req, res) => {
  try {
    const { discipline } = req.query;
    const where: Record<string, unknown> = { projectId: req.params.id, isActive: true };
    if (discipline) where.discipline = discipline;

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ data: trades, error: null });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

app.post('/projects/:id/trades', async (req, res) => {
  try {
    const input = createTradeSchema.parse(req.body);
    const count = await prisma.trade.count({ where: { projectId: req.params.id } });

    const trade = await prisma.trade.create({
      data: { ...input, projectId: req.params.id, sortOrder: count },
    });
    res.status(201).json({ data: trade, error: null });
  } catch (err: unknown) {
    if (err instanceof ZodError) return res.status(400).json({ data: null, error: { code: 'VALIDATION', details: err.errors } });
    const error = err as { code?: string; message: string };
    if (error.code === 'P2002') return res.status(409).json({ data: null, error: { code: 'DUPLICATE', message: 'Trade code already exists in project' } });
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

app.patch('/projects/:id/trades/:tradeId', async (req, res) => {
  try {
    const trade = await prisma.trade.update({ where: { id: req.params.tradeId }, data: req.body });
    res.json({ data: trade, error: null });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
  }
});

// Project route modules
app.use(drawingRoutes(prisma));
app.use(wbsRoutes(prisma));
app.use(cbsRoutes(prisma));
app.use(boqRoutes(prisma));
app.use(setupRoutes(prisma));
app.use('/projects/:projectId', projectSetupRoutes);

// ══════════════════════════════════════
// CONSTRAINT MODULE — /constraints
// ══════════════════════════════════════
app.use('/constraints', constraintsRouter);

// ══════════════════════════════════════
// PROGRESS MODULE — /progress
// ══════════════════════════════════════
app.use(progressRouter);
app.use(commitmentsRouter);
app.use(ppcRouter);
app.use(varianceRouter);
app.use(dailyLogRouter);

// ══════════════════════════════════════
// COST MODULE — /cost
// ══════════════════════════════════════
app.use('/cost/work-items', authenticate, workItemsRouter);
app.use('/cost/unit-prices', authenticate, unitPricesRouter);
app.use('/cost/resources', authenticate, costResourcesRouter);
app.use('/cost/quantity-takeoffs', authenticate, quantityTakeoffsRouter);
app.use('/cost/estimates', authenticate, estimatesRouter);
app.use('/cost/budgets', authenticate, budgetsRouter);
app.use('/cost/payments', authenticate, paymentsRouter);
app.use('/cost/cost-records', authenticate, costRecordsRouter);
app.use('/cost/evm', authenticate, evmRouter);
app.use('/cost/catalog', authenticate, catalogRouter);
app.use('/cost/mappings', authenticate, classificationMappingRouter);

// ── Seed demo data ──
seedConstraintData();
seedProgressData();

// ── Error handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.errors },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null, error: { code: err.code, message: err.message },
    });
  }
  logger.error(err, 'Unhandled error');
  res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } });
});

// ── Start ──
app.listen(PORT, () => logger.info(`core-service running on port ${PORT}`));

export default app;
