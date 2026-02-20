import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import path from 'path';
import fs from 'fs';

// Route modules
import drawingRoutes from './routes/drawings';
import wbsRoutes from './routes/wbs';
import cbsRoutes from './routes/cbs';
import boqRoutes from './routes/boq';
import setupRoutes from './routes/setup';
import projectSetupRoutes from './routes/project-setup.routes';

const PORT = parseInt(process.env.PORT || '3002');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const prisma = new PrismaClient();
const app = express();

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// ── Validators ──
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
  parentName: z.string().optional(),
  name: z.string().min(1).max(255),
  locationType: z.enum(['site', 'building', 'floor', 'zone', 'room', 'area']),
  areaSqm: z.number().optional(),
  sortOrder: z.number().int().optional(),
  phase: z.enum(['structural', 'finishing']).optional(),
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

// ── Health ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'project-service', version: '2.0.0' });
});

// ══════════════════════════════════════
// PROJECTS CRUD
// ══════════════════════════════════════

// GET /projects
app.get('/projects', async (req, res) => {
  try {
    const userId = (req as any).userId || req.query.userId as string;
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
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// POST /projects
app.post('/projects', async (req, res) => {
  try {
    const input = createProjectSchema.parse(req.body);
    const ownerId = (req as any).userId || req.body.ownerId;

    const project = await prisma.project.create({
      data: {
        ...input,
        plannedStart: input.plannedStart ? new Date(input.plannedStart) : undefined,
        plannedFinish: input.plannedFinish ? new Date(input.plannedFinish) : undefined,
        ownerId,
      },
    });

    // Initialize project setup record
    await prisma.projectSetup.create({
      data: {
        projectId: project.id,
        classificationStandard: input.classificationStandard,
      },
    });

    res.status(201).json({ data: project, error: null });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ data: null, error: { code: 'VALIDATION', message: 'Validation failed', details: err.errors } });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ data: null, error: { code: 'DUPLICATE', message: 'Project code already exists' } });
    }
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
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
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
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
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// DELETE /projects/:id (soft archive)
app.delete('/projects/:id', async (req, res) => {
  try {
    await prisma.project.update({ where: { id: req.params.id }, data: { status: 'archived' } });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// ══════════════════════════════════════
// LOCATIONS (LBS)
// ══════════════════════════════════════

// GET /projects/:id/locations
app.get('/projects/:id/locations', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      where: { projectId: req.params.id, isActive: true },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
    });

    const tree = buildLocationTree(locations);
    res.json({ data: tree, error: null });
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// POST /projects/:id/locations
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
    const path = parentPath ? `${parentPath}/${code}` : `/${code}`;

    const location = await prisma.location.create({
      data: {
        projectId,
        parentId: input.parentId,
        name: input.name,
        locationType: input.locationType,
        code,
        path,
        depth,
        areaSqm: input.areaSqm,
        sortOrder: input.sortOrder ?? count,
      },
    });

    res.status(201).json({ data: location, error: null });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return res.status(400).json({ data: null, error: { code: 'VALIDATION', details: err.errors } });
    }
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// POST /projects/:id/locations/bulk
app.post('/projects/:id/locations/bulk', async (req, res) => {
  try {
    const { locations } = req.body;
    const projectId = req.params.id;
    const created: any[] = [];

    for (const loc of locations) {
      const input = createLocationSchema.parse(loc);

      // Resolve parentName to parentId if parentId is not provided
      let resolvedParentId = input.parentId || null;
      if (!resolvedParentId && input.parentName) {
        const parentFromCreated = created.find((c: any) => c.name === input.parentName);
        if (parentFromCreated) {
          resolvedParentId = parentFromCreated.id;
        } else {
          const parentFromDb = await prisma.location.findFirst({
            where: { projectId, name: input.parentName },
          });
          if (parentFromDb) resolvedParentId = parentFromDb.id;
        }
      }

      let parentPath: string | null = null;
      let depth = 0;

      if (resolvedParentId) {
        const parent = created.find((c: any) => c.id === resolvedParentId) ||
          await prisma.location.findUnique({ where: { id: resolvedParentId } });
        if (parent) { parentPath = parent.path; depth = parent.depth + 1; }
      }

      const count = created.filter((c: any) => c.parentId === resolvedParentId).length +
        await prisma.location.count({ where: { projectId, parentId: resolvedParentId } });
      const cp = input.locationType.charAt(0).toUpperCase();
      const code = parentPath ? `${parentPath.split('/').pop()}-${cp}${String(count + 1).padStart(2, '0')}` : `${cp}${String(count + 1)}`;
      const path = parentPath ? `${parentPath}/${code}` : `/${code}`;

      const location = await prisma.location.create({
        data: {
          projectId,
          parentId: resolvedParentId,
          name: input.name,
          locationType: input.locationType,
          code,
          path,
          depth,
          areaSqm: input.areaSqm,
          sortOrder: count,
          metadata: input.phase ? { phase: input.phase } : {},
        },
      });
      created.push(location);
    }

    res.status(201).json({ data: created, error: null });
  } catch (err: any) {
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// ══════════════════════════════════════
// TRADES
// ══════════════════════════════════════

// GET /projects/:id/trades
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
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// POST /projects/:id/trades
app.post('/projects/:id/trades', async (req, res) => {
  try {
    const input = createTradeSchema.parse(req.body);
    const count = await prisma.trade.count({ where: { projectId: req.params.id } });

    const trade = await prisma.trade.create({
      data: { ...input, projectId: req.params.id, sortOrder: count },
    });
    res.status(201).json({ data: trade, error: null });
  } catch (err: any) {
    if (err instanceof ZodError) return res.status(400).json({ data: null, error: { code: 'VALIDATION', details: err.errors } });
    if (err.code === 'P2002') return res.status(409).json({ data: null, error: { code: 'DUPLICATE', message: 'Trade code already exists in project' } });
    logger.error(err);
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// PATCH /projects/:id/trades/:tradeId
app.patch('/projects/:id/trades/:tradeId', async (req, res) => {
  try {
    const trade = await prisma.trade.update({ where: { id: req.params.tradeId }, data: req.body });
    res.json({ data: trade, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
  }
});

// ══════════════════════════════════════
// MOUNT NEW ROUTE MODULES
// ══════════════════════════════════════

app.use(drawingRoutes(prisma));
app.use(wbsRoutes(prisma));
app.use(cbsRoutes(prisma));
app.use(boqRoutes(prisma));
app.use(setupRoutes(prisma));

// Project Setup extended routes (OBS, BOQ items, Documents, Cash Flow)
app.use('/projects/:projectId', projectSetupRoutes);

// ── Helpers ──
function buildLocationTree(locations: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];

  locations.forEach(loc => map.set(loc.id, { ...loc, children: [] }));
  locations.forEach(loc => {
    const node = map.get(loc.id)!;
    if (loc.parentId && map.has(loc.parentId)) {
      map.get(loc.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// ── Error handler ──
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err);
  res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message || 'Unknown error' } });
});

app.listen(PORT, () => logger.info(`Project service on port ${PORT}`));
export default app;
