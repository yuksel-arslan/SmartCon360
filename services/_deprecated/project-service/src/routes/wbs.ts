import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import { getWbsTemplate, flattenWbsNodes, getAvailableStandards } from '../templates/wbs-templates';

const router = Router();

const createWbsNodeSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  standard: z.string().max(30),
  locationId: z.string().uuid().optional().nullable(),
  tradeId: z.string().uuid().optional().nullable(),
});

export default function wbsRoutes(prisma: PrismaClient) {
  // GET /projects/:id/wbs — Get WBS tree
  router.get('/projects/:id/wbs', async (req, res) => {
    try {
      const nodes = await prisma.wbsNode.findMany({
        where: { projectId: req.params.id, isActive: true },
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
      });

      const tree = buildTree(nodes);
      res.json({ data: tree, meta: { total: nodes.length, flat: nodes }, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/wbs/standards — Available WBS standards
  router.get('/projects/:id/wbs/standards', async (_req, res) => {
    res.json({ data: getAvailableStandards(), error: null });
  });

  // POST /projects/:id/wbs/generate — Generate WBS from template
  router.post('/projects/:id/wbs/generate', async (req, res) => {
    try {
      const { standard, projectType } = req.body;
      const projectId = req.params.id;

      if (!standard || !projectType) {
        return res.status(400).json({
          data: null,
          error: { code: 'VALIDATION', message: 'standard and projectType are required' },
        });
      }

      const template = getWbsTemplate(standard, projectType);
      if (!template) {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_STANDARD', message: `Unknown WBS standard: ${standard}` },
        });
      }

      // Clear existing WBS nodes for this project
      await prisma.wbsNode.deleteMany({ where: { projectId } });

      // Flatten template and create nodes
      const flatNodes = flattenWbsNodes(template.nodes, standard);

      // Create nodes in order (parents first) — build ID map for parent references
      const codeToId = new Map<string, string>();
      const createdNodes = [];

      for (const node of flatNodes) {
        const parentId = node.parentCode ? codeToId.get(node.parentCode) || null : null;
        const parentPath = node.parentCode
          ? (await prisma.wbsNode.findFirst({ where: { projectId, code: node.parentCode } }))?.path || ''
          : '';

        const created = await prisma.wbsNode.create({
          data: {
            projectId,
            parentId,
            code: node.code,
            name: node.name,
            description: node.description,
            standard: node.standard,
            level: node.level,
            sortOrder: node.sortOrder,
            path: parentPath ? `${parentPath}/${node.code}` : `/${node.code}`,
          },
        });

        codeToId.set(node.code, created.id);
        createdNodes.push(created);
      }

      // Update project setup
      await prisma.projectSetup.upsert({
        where: { projectId },
        create: {
          projectId,
          classificationStandard: standard,
          wbsGenerated: true,
          wbsNodeCount: createdNodes.length,
        },
        update: {
          classificationStandard: standard,
          wbsGenerated: true,
          wbsNodeCount: createdNodes.length,
        },
      });

      res.status(201).json({
        data: createdNodes,
        meta: { standard: template.label, count: createdNodes.length },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // POST /projects/:id/wbs — Create single WBS node (manual)
  router.post('/projects/:id/wbs', async (req, res) => {
    try {
      const input = createWbsNodeSchema.parse(req.body);
      const projectId = req.params.id;

      let parentPath = '';
      let level = 1;
      if (input.parentId) {
        const parent = await prisma.wbsNode.findUnique({ where: { id: input.parentId } });
        if (parent) {
          parentPath = parent.path || '';
          level = parent.level + 1;
        }
      }

      const count = await prisma.wbsNode.count({
        where: { projectId, parentId: input.parentId || null },
      });

      const node = await prisma.wbsNode.create({
        data: {
          projectId,
          parentId: input.parentId,
          code: input.code,
          name: input.name,
          description: input.description,
          standard: input.standard,
          level,
          sortOrder: count,
          path: parentPath ? `${parentPath}/${input.code}` : `/${input.code}`,
          locationId: input.locationId,
          tradeId: input.tradeId,
        },
      });

      res.status(201).json({ data: node, error: null });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ data: null, error: { code: 'VALIDATION', details: err.errors } });
      }
      if (err.code === 'P2002') {
        return res.status(409).json({ data: null, error: { code: 'DUPLICATE', message: 'WBS code already exists in project' } });
      }
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // PATCH /projects/:id/wbs/:nodeId — Update WBS node
  router.patch('/projects/:id/wbs/:nodeId', async (req, res) => {
    try {
      const node = await prisma.wbsNode.update({
        where: { id: req.params.nodeId },
        data: req.body,
      });
      res.json({ data: node, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // DELETE /projects/:id/wbs/:nodeId — Soft delete WBS node
  router.delete('/projects/:id/wbs/:nodeId', async (req, res) => {
    try {
      await prisma.wbsNode.update({
        where: { id: req.params.nodeId },
        data: { isActive: false },
      });
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/wbs/template-preview — Preview WBS template without saving
  router.get('/projects/:id/wbs/template-preview', async (req, res) => {
    try {
      const standard = req.query.standard as string;
      const projectType = req.query.projectType as string;

      if (!standard || !projectType) {
        return res.status(400).json({
          data: null,
          error: { code: 'VALIDATION', message: 'standard and projectType query params required' },
        });
      }

      const template = getWbsTemplate(standard, projectType);
      if (!template) {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_STANDARD', message: `Unknown standard: ${standard}` },
        });
      }

      const flat = flattenWbsNodes(template.nodes, standard);
      res.json({
        data: {
          standard: template.label,
          description: template.description,
          nodes: template.nodes,
          flatCount: flat.length,
        },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  return router;
}

function buildTree(nodes: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];

  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  nodes.forEach((n) => {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
