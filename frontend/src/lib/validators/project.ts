import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  projectType: z.enum(['hotel', 'hospital', 'residential', 'commercial', 'industrial', 'infrastructure']),
  description: z.string().optional(),
  plannedStart: z.string().optional(),
  plannedFinish: z.string().optional(),
  defaultTaktTime: z.number().int().min(1).max(30).default(5),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  budget: z.number().optional(),
  currency: z.string().max(3).default('USD'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  plannedStart: z.string().optional(),
  plannedFinish: z.string().optional(),
  defaultTaktTime: z.number().int().min(1).max(30).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  budget: z.number().optional(),
  currency: z.string().max(3).optional(),
});

export const createLocationSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  parentName: z.string().optional(),
  name: z.string().min(1).max(255),
  locationType: z.enum(['site', 'building', 'floor', 'zone', 'room', 'area']),
  areaSqm: z.number().optional(),
  sortOrder: z.number().int().optional(),
});

export const createTradeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  defaultCrewSize: z.number().int().min(1).default(4),
  predecessorTradeIds: z.array(z.string().uuid()).default([]),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export const updateTradeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  defaultCrewSize: z.number().int().min(1).optional(),
  predecessorTradeIds: z.array(z.string().uuid()).optional(),
  companyName: z.string().optional(),
  contactEmail: z.string().email().optional(),
});
