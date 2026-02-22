import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  getRelationshipsForTrades,
  getAllRelationshipTemplates,
  detectCircularDependencies,
  type ActivityRelationshipTemplate,
} from '../templates/activity-relationship-templates';

const router = Router();

const createRelationshipSchema = z.object({
  predecessorTradeId: z.string().uuid(),
  successorTradeId: z.string().uuid(),
  type: z.enum(['FS', 'SS', 'FF', 'SF']),
  lagDays: z.number().int().min(-30).max(90).default(0),
  mandatory: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

const updateRelationshipSchema = z.object({
  type: z.enum(['FS', 'SS', 'FF', 'SF']).optional(),
  lagDays: z.number().int().min(-30).max(90).optional(),
  mandatory: z.boolean().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export default function relationshipRoutes(prisma: PrismaClient) {
  /**
   * GET /projects/:id/relationships
   * List all activity relationships for a project
   */
  router.get('/projects/:id/relationships', async (req, res) => {
    try {
      const projectId = req.params.id;

      const relationships = await prisma.tradeRelationship.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });

      // Enrich with trade names
      const tradeIds = new Set<string>();
      for (const r of relationships) {
        tradeIds.add(r.predecessorTradeId);
        tradeIds.add(r.successorTradeId);
      }

      const trades = await prisma.trade.findMany({
        where: { id: { in: [...tradeIds] } },
        select: { id: true, name: true, code: true, color: true },
      });
      const tradeMap = new Map(trades.map((t) => [t.id, t]));

      const enriched = relationships.map((r) => {
        const pred = tradeMap.get(r.predecessorTradeId);
        const succ = tradeMap.get(r.successorTradeId);
        return {
          ...r,
          predecessorTradeName: pred?.name || '',
          predecessorTradeCode: pred?.code || '',
          predecessorTradeColor: pred?.color || '#999',
          successorTradeName: succ?.name || '',
          successorTradeCode: succ?.code || '',
          successorTradeColor: succ?.color || '#999',
        };
      });

      return res.json({
        data: enriched,
        meta: { total: enriched.length },
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * GET /projects/:id/relationships/templates
   * Get available relationship templates based on project's trades
   */
  router.get('/projects/:id/relationships/templates', async (req, res) => {
    try {
      const projectId = req.params.id;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { projectType: true },
      });

      if (!project) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const trades = await prisma.trade.findMany({
        where: { projectId, isActive: true },
        select: { code: true },
      });

      const tradeCodes = trades.map((t) => t.code);
      const templates = getRelationshipsForTrades(tradeCodes, project.projectType);

      // Group by relationship type for summary
      const byType = {
        FS: templates.filter((t) => t.type === 'FS').length,
        SS: templates.filter((t) => t.type === 'SS').length,
        FF: templates.filter((t) => t.type === 'FF').length,
        SF: templates.filter((t) => t.type === 'SF').length,
      };

      // Group by category for summary
      const byCategory = {
        physical: templates.filter((t) => t.category === 'physical').length,
        logistical: templates.filter((t) => t.category === 'logistical').length,
        regulatory: templates.filter((t) => t.category === 'regulatory').length,
        preferential: templates.filter((t) => t.category === 'preferential').length,
      };

      return res.json({
        data: templates,
        meta: {
          total: templates.length,
          byType,
          byCategory,
          mandatory: templates.filter((t) => t.mandatory).length,
          preferred: templates.filter((t) => !t.mandatory).length,
          configurable: templates.filter((t) => t.configurable).length,
        },
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * POST /projects/:id/relationships
   * Create a single activity relationship
   */
  router.post('/projects/:id/relationships', async (req, res) => {
    try {
      const projectId = req.params.id;
      const data = createRelationshipSchema.parse(req.body);

      // Validate trades exist in project
      const trades = await prisma.trade.findMany({
        where: {
          projectId,
          id: { in: [data.predecessorTradeId, data.successorTradeId] },
        },
      });

      if (trades.length < 2) {
        return res.status(400).json({
          data: null,
          error: { code: 'INVALID_TRADES', message: 'Both predecessor and successor trades must belong to this project' },
        });
      }

      if (data.predecessorTradeId === data.successorTradeId) {
        return res.status(400).json({
          data: null,
          error: { code: 'SELF_REFERENCE', message: 'A trade cannot be its own predecessor' },
        });
      }

      const relationship = await prisma.tradeRelationship.create({
        data: {
          projectId,
          predecessorTradeId: data.predecessorTradeId,
          successorTradeId: data.successorTradeId,
          type: data.type,
          lagDays: data.lagDays,
          mandatory: data.mandatory,
          description: data.description,
          source: 'manual',
        },
      });

      return res.status(201).json({ data: relationship, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message?.includes('P2002')) {
        return res.status(409).json({
          data: null,
          error: { code: 'DUPLICATE', message: 'This relationship already exists' },
        });
      }
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * POST /projects/:id/relationships/apply-templates
   * Apply all relationship templates to the project (idempotent)
   */
  router.post('/projects/:id/relationships/apply-templates', async (req, res) => {
    try {
      const projectId = req.params.id;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { projectType: true },
      });

      if (!project) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const trades = await prisma.trade.findMany({
        where: { projectId, isActive: true },
        select: { id: true, code: true },
      });

      const codeToId = new Map(trades.map((t) => [t.code, t.id]));
      const tradeCodes = trades.map((t) => t.code);
      const templates = getRelationshipsForTrades(tradeCodes, project.projectType);

      const created = [];
      const skipped = [];

      for (const rel of templates) {
        const predId = codeToId.get(rel.predecessorCode);
        const succId = codeToId.get(rel.successorCode);
        if (!predId || !succId) {
          skipped.push(rel);
          continue;
        }

        try {
          const relationship = await prisma.tradeRelationship.create({
            data: {
              projectId,
              predecessorTradeId: predId,
              successorTradeId: succId,
              type: rel.type,
              lagDays: rel.lagDays,
              defaultLagDays: rel.defaultLagDays,
              mandatory: rel.mandatory,
              description: rel.description,
              category: rel.category,
              configurable: rel.configurable,
              source: 'template',
            },
          });
          created.push(relationship);
        } catch (err: unknown) {
          // Skip duplicates (P2002)
          if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
            skipped.push(rel);
          } else {
            throw err;
          }
        }
      }

      return res.status(201).json({
        data: created,
        meta: {
          templatesAvailable: templates.length,
          created: created.length,
          skipped: skipped.length,
        },
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * PATCH /projects/:id/relationships/:relationshipId
   * Update an activity relationship
   */
  router.patch('/projects/:id/relationships/:relationshipId', async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const data = updateRelationshipSchema.parse(req.body);

      const relationship = await prisma.tradeRelationship.update({
        where: { id: relationshipId },
        data: {
          ...(data.type !== undefined && { type: data.type }),
          ...(data.lagDays !== undefined && { lagDays: data.lagDays }),
          ...(data.mandatory !== undefined && { mandatory: data.mandatory }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      return res.json({ data: relationship, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * DELETE /projects/:id/relationships/:relationshipId
   * Delete an activity relationship
   */
  router.delete('/projects/:id/relationships/:relationshipId', async (req, res) => {
    try {
      const { relationshipId } = req.params;

      await prisma.tradeRelationship.delete({
        where: { id: relationshipId },
      });

      return res.json({ data: { deleted: true }, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * PATCH /projects/:id/relationships/:relationshipId/reset-lag
   * Reset a configurable relationship's lag to its factory default
   */
  router.patch('/projects/:id/relationships/:relationshipId/reset-lag', async (req, res) => {
    try {
      const { relationshipId } = req.params;

      const existing = await prisma.tradeRelationship.findUnique({
        where: { id: relationshipId },
      });

      if (!existing) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Relationship not found' },
        });
      }

      if (!existing.configurable) {
        return res.status(400).json({
          data: null,
          error: { code: 'NOT_CONFIGURABLE', message: 'This relationship\'s lag cannot be modified' },
        });
      }

      const relationship = await prisma.tradeRelationship.update({
        where: { id: relationshipId },
        data: { lagDays: existing.defaultLagDays },
      });

      return res.json({ data: relationship, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * GET /projects/:id/relationships/physical-constraints
   * Get only physical constraints with curing/drying lag info
   */
  router.get('/projects/:id/relationships/physical-constraints', async (req, res) => {
    try {
      const projectId = req.params.id;

      const relationships = await prisma.tradeRelationship.findMany({
        where: { projectId, category: 'physical', isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      // Enrich with trade names
      const tradeIds = new Set<string>();
      for (const r of relationships) {
        tradeIds.add(r.predecessorTradeId);
        tradeIds.add(r.successorTradeId);
      }

      const trades = await prisma.trade.findMany({
        where: { id: { in: [...tradeIds] } },
        select: { id: true, name: true, code: true, color: true },
      });
      const tradeMap = new Map(trades.map((t) => [t.id, t]));

      const enriched = relationships.map((r) => {
        const pred = tradeMap.get(r.predecessorTradeId);
        const succ = tradeMap.get(r.successorTradeId);
        return {
          ...r,
          predecessorTradeName: pred?.name || '',
          predecessorTradeCode: pred?.code || '',
          successorTradeName: succ?.name || '',
          successorTradeCode: succ?.code || '',
          isOverridden: r.lagDays !== r.defaultLagDays,
        };
      });

      return res.json({
        data: enriched,
        meta: {
          total: enriched.length,
          overridden: enriched.filter((r) => r.isOverridden).length,
          configurable: enriched.filter((r) => r.configurable).length,
        },
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * GET /projects/:id/relationships/summary
   * Get a summary of relationships with dependency graph info
   */
  router.get('/projects/:id/relationships/summary', async (req, res) => {
    try {
      const projectId = req.params.id;

      const relationships = await prisma.tradeRelationship.findMany({
        where: { projectId, isActive: true },
      });

      const trades = await prisma.trade.findMany({
        where: { projectId, isActive: true },
        select: { id: true, code: true, name: true },
      });

      const tradeIdToCode = new Map(trades.map((t) => [t.id, t.code]));

      // Convert to template format for circular dependency check
      const templateFormat: ActivityRelationshipTemplate[] = relationships.map((r) => ({
        predecessorCode: tradeIdToCode.get(r.predecessorTradeId) || '',
        successorCode: tradeIdToCode.get(r.successorTradeId) || '',
        type: r.type as ActivityRelationshipTemplate['type'],
        lagDays: r.lagDays,
        mandatory: r.mandatory,
        description: r.description || '',
        category: (r.category || 'logistical') as ActivityRelationshipTemplate['category'],
        configurable: r.configurable,
        defaultLagDays: r.defaultLagDays,
      }));

      const cycles = detectCircularDependencies(templateFormat);

      // Count relationships per type
      const byType = {
        FS: relationships.filter((r) => r.type === 'FS').length,
        SS: relationships.filter((r) => r.type === 'SS').length,
        FF: relationships.filter((r) => r.type === 'FF').length,
        SF: relationships.filter((r) => r.type === 'SF').length,
      };

      // Find trades with no predecessors (start activities)
      const successorIds = new Set(relationships.map((r) => r.successorTradeId));
      const startActivities = trades.filter((t) => !successorIds.has(t.id));

      // Find trades with no successors (end activities)
      const predecessorIds = new Set(relationships.map((r) => r.predecessorTradeId));
      const endActivities = trades.filter((t) => !predecessorIds.has(t.id));

      // Count relationships per category
      const byCategory = {
        physical: relationships.filter((r) => r.category === 'physical').length,
        logistical: relationships.filter((r) => r.category === 'logistical').length,
        regulatory: relationships.filter((r) => r.category === 'regulatory').length,
        preferential: relationships.filter((r) => r.category === 'preferential').length,
      };

      return res.json({
        data: {
          totalRelationships: relationships.length,
          totalTrades: trades.length,
          byType,
          byCategory,
          mandatory: relationships.filter((r) => r.mandatory).length,
          preferred: relationships.filter((r) => !r.mandatory).length,
          configurable: relationships.filter((r) => r.configurable).length,
          hasCircularDependencies: cycles.length > 0,
          circularCodes: cycles,
          startActivities: startActivities.map((t) => ({ id: t.id, code: t.code, name: t.name })),
          endActivities: endActivities.map((t) => ({ id: t.id, code: t.code, name: t.name })),
        },
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  return router;
}
