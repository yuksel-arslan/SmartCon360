import { z } from 'zod';

export const CONSTRAINT_CATEGORIES = [
  'design', 'material', 'equipment', 'labor',
  'space', 'predecessor', 'permit', 'information',
] as const;

export const CONSTRAINT_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export const CONSTRAINT_STATUSES = ['open', 'in_progress', 'resolved'] as const;

export const createConstraintSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(CONSTRAINT_CATEGORIES),
  priority: z.enum(CONSTRAINT_PRIORITIES).default('medium'),
  tradeCode: z.string().max(20).optional(),
  zoneName: z.string().max(255).optional(),
  assignedTo: z.string().max(255).optional(),
  dueDate: z.string().optional(),
  source: z.enum(['manual', 'auto-detected']).default('manual'),
});

export const updateConstraintSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.enum(CONSTRAINT_CATEGORIES).optional(),
  priority: z.enum(CONSTRAINT_PRIORITIES).optional(),
  status: z.enum(CONSTRAINT_STATUSES).optional(),
  tradeCode: z.string().max(20).optional(),
  zoneName: z.string().max(255).optional(),
  assignedTo: z.string().max(255).optional(),
  dueDate: z.string().optional(),
  resolution: z.string().optional(),
});
