import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import { getCbsTemplate, flattenCbsNodes, getDefaultCbsStandard, CBS_STANDARDS } from '../templates/cbs-templates';

const router = Router();

const createCbsNodeSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  wbsNodeId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  standard: z.string().max(30),
  budgetCode: z.string().max(30).optional(),
});

export default function cbsRoutes(prisma: PrismaClient) {
  // GET /projects/:id/cbs — Get CBS tree
  router.get('/projects/:id/cbs', async (req, res) => {
    try {
      const nodes = await prisma.cbsNode.findMany({
        where: { projectId: req.params.id, isActive: true },
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
        include: { wbsNode: { select: { id: true, code: true, name: true } } },
      });

      const tree = buildTree(nodes);
      res.json({ data: tree, meta: { total: nodes.length, flat: nodes }, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/cbs/standards — Available CBS standards
  router.get('/projects/:id/cbs/standards', async (_req, res) => {
    res.json({ data: CBS_STANDARDS, error: null });
  });

  // POST /projects/:id/cbs/generate — Generate CBS from template (linked to WBS)
  router.post('/projects/:id/cbs/generate', async (req, res) => {
    try {
      const projectId = req.params.id;
      const { standard: requestedStandard } = req.body;

      // Get the project's WBS standard to determine default CBS standard
      const setup = await prisma.projectSetup.findUnique({ where: { projectId } });
      const wbsStandard = setup?.classificationStandard || 'uniclass';
      const cbsStandard = requestedStandard || getDefaultCbsStandard(wbsStandard);

      const template = getCbsTemplate(cbsStandard);
      if (!template) {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_STANDARD', message: `Unknown CBS standard: ${cbsStandard}` },
        });
      }

      // Get existing WBS nodes for linking
      const wbsNodes = await prisma.wbsNode.findMany({
        where: { projectId, isActive: true },
        select: { id: true, code: true },
      });
      const wbsCodeToId = new Map(wbsNodes.map((n) => [n.code, n.id]));

      // Clear existing CBS nodes
      await prisma.cbsNode.deleteMany({ where: { projectId } });

      // Flatten and create
      const flatNodes = flattenCbsNodes(template.nodes, cbsStandard);
      const codeToId = new Map<string, string>();
      const createdNodes = [];

      for (const node of flatNodes) {
        const parentId = node.parentCode ? codeToId.get(node.parentCode) || null : null;
        const parentPath = node.parentCode
          ? (await prisma.cbsNode.findFirst({ where: { projectId, code: node.parentCode } }))?.path || ''
          : '';

        // Try to link to WBS node
        let wbsNodeId: string | null = null;
        if (node.wbsCodes && node.wbsCodes.length > 0) {
          for (const wbsCode of node.wbsCodes) {
            const id = wbsCodeToId.get(wbsCode);
            if (id) {
              wbsNodeId = id;
              break;
            }
          }
        }

        const created = await prisma.cbsNode.create({
          data: {
            projectId,
            parentId,
            wbsNodeId,
            code: node.code,
            name: node.name,
            description: node.description,
            standard: cbsStandard,
            level: node.level,
            sortOrder: node.sortOrder,
            path: parentPath ? `${parentPath}/${node.code}` : `/${node.code}`,
          },
        });

        codeToId.set(node.code, created.id);
        createdNodes.push(created);
      }

      // Update setup
      await prisma.projectSetup.upsert({
        where: { projectId },
        create: { projectId, cbsGenerated: true, cbsNodeCount: createdNodes.length },
        update: { cbsGenerated: true, cbsNodeCount: createdNodes.length },
      });

      res.status(201).json({
        data: createdNodes,
        meta: { standard: template.label, count: createdNodes.length, wbsLinked: createdNodes.filter((n) => n.wbsNodeId).length },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // POST /projects/:id/cbs — Create single CBS node (manual)
  router.post('/projects/:id/cbs', async (req, res) => {
    try {
      const input = createCbsNodeSchema.parse(req.body);
      const projectId = req.params.id;

      let parentPath = '';
      let level = 1;
      if (input.parentId) {
        const parent = await prisma.cbsNode.findUnique({ where: { id: input.parentId } });
        if (parent) {
          parentPath = parent.path || '';
          level = parent.level + 1;
        }
      }

      const count = await prisma.cbsNode.count({
        where: { projectId, parentId: input.parentId || null },
      });

      const node = await prisma.cbsNode.create({
        data: {
          projectId,
          parentId: input.parentId,
          wbsNodeId: input.wbsNodeId,
          code: input.code,
          name: input.name,
          description: input.description,
          standard: input.standard,
          level,
          sortOrder: count,
          path: parentPath ? `${parentPath}/${input.code}` : `/${input.code}`,
          budgetCode: input.budgetCode,
        },
      });

      res.status(201).json({ data: node, error: null });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ data: null, error: { code: 'VALIDATION', details: err.errors } });
      }
      if (err.code === 'P2002') {
        return res.status(409).json({ data: null, error: { code: 'DUPLICATE', message: 'CBS code already exists in project' } });
      }
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // PATCH /projects/:id/cbs/:nodeId
  router.patch('/projects/:id/cbs/:nodeId', async (req, res) => {
    try {
      const node = await prisma.cbsNode.update({
        where: { id: req.params.nodeId },
        data: req.body,
      });
      res.json({ data: node, error: null });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // DELETE /projects/:id/cbs/:nodeId
  router.delete('/projects/:id/cbs/:nodeId', async (req, res) => {
    try {
      await prisma.cbsNode.update({
        where: { id: req.params.nodeId },
        data: { isActive: false },
      });
      res.status(204).send();
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
