import { z } from 'zod';

// ── Validation Schemas ──────────────────────────────────

export const progressStatusEnum = z.enum(['not_started', 'in_progress', 'completed', 'delayed', 'blocked']);

export const varianceCategoryEnum = z.enum([
  'material', 'labor', 'equipment', 'design',
  'space', 'predecessor', 'permit', 'information',
]);

export const createProgressUpdateSchema = z.object({
  projectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  zoneId: z.string().uuid(),
  tradeId: z.string().uuid(),
  percentComplete: z.number().min(0).max(100),
  status: progressStatusEnum.optional().default('in_progress'),
  notes: z.string().optional().nullable(),
  photoUrls: z.array(z.string().url()).optional().default([]),
  reportedBy: z.string().uuid(),
});

export const createWeeklyCommitmentSchema = z.object({
  projectId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  tradeId: z.string().uuid(),
  tradeName: z.string().min(1),
  zoneId: z.string().uuid(),
  zoneName: z.string().min(1),
  description: z.string().min(1),
});

export const bulkCreateCommitmentsSchema = z.object({
  commitments: z.array(createWeeklyCommitmentSchema).min(1).max(100),
});

export const updateCommitmentSchema = z.object({
  completed: z.boolean().optional(),
  varianceReason: z.string().optional().nullable(),
  varianceCategory: varianceCategoryEnum.optional().nullable(),
});

export const calculatePPCSchema = z.object({
  projectId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
});

export const createDailyLogSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  weather: z.string().optional().nullable(),
  temperature: z.number().optional().nullable(),
  crewCount: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  issues: z.array(z.object({
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })).optional().default([]),
  createdBy: z.string().uuid(),
});
