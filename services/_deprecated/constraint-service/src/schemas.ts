/**
 * Zod validation schemas for Constraint Service
 */

import { z } from 'zod';

export const ConstraintCategorySchema = z.enum([
  'design',
  'material',
  'equipment',
  'labor',
  'space',
  'predecessor',
  'permit',
  'information',
]);

export const ConstraintStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'cancelled']);

export const ConstraintPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const CreateConstraintSchema = z.object({
  projectId: z.string().uuid(),
  category: ConstraintCategorySchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: ConstraintPrioritySchema.default('medium'),
  zoneId: z.string().uuid().optional(),
  tradeId: z.string().uuid().optional(),
  activityId: z.string().uuid().optional(),
  raisedBy: z.string(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateConstraintSchema = z.object({
  category: ConstraintCategorySchema.optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: ConstraintStatusSchema.optional(),
  priority: ConstraintPrioritySchema.optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export const ResolveConstraintSchema = z.object({
  resolutionNotes: z.string().max(2000).optional(),
});

export const ListConstraintsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  category: ConstraintCategorySchema.optional(),
  status: ConstraintStatusSchema.optional(),
  priority: ConstraintPrioritySchema.optional(),
  zoneId: z.string().uuid().optional(),
  tradeId: z.string().uuid().optional(),
  assignedTo: z.string().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});
