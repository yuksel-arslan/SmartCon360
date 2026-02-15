// Zod validation schemas for CostPilot

import { z } from 'zod';

// ============================================================================
// WORK ITEMS
// ============================================================================

export const createWorkItemSchema = z.object({
  projectId: z.string().uuid(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  unit: z.string().min(1).max(20),
  category: z.string().min(1).max(50),
  subcategory: z.string().max(100).optional(),
  tradeId: z.string().uuid().optional(),
  source: z.string().max(30).optional(),
  sourceYear: z.number().int().min(2000).max(2100).optional(),
});

export const updateWorkItemSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  unit: z.string().min(1).max(20).optional(),
  category: z.string().min(1).max(50).optional(),
  subcategory: z.string().max(100).optional(),
  tradeId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// UNIT PRICE ANALYSIS
// ============================================================================

const unitPriceResourceSchema = z.object({
  resourceType: z.enum(['labor', 'material', 'equipment']),
  code: z.string().max(30).optional(),
  name: z.string().min(1).max(500),
  unit: z.string().min(1).max(20),
  quantity: z.number().positive(),
  unitRate: z.number().nonnegative(),
  rateSource: z.string().max(30).optional(),
  rateDate: z.string().datetime().or(z.date()).optional(),
});

export const createUnitPriceAnalysisSchema = z.object({
  workItemId: z.string().uuid(),
  version: z.number().int().positive().optional(),
  analysisDate: z.string().datetime().or(z.date()).optional(),
  overheadPct: z.number().min(0).max(100).optional(),
  profitPct: z.number().min(0).max(100).optional(),
  source: z.string().max(30).optional(),
  notes: z.string().optional(),
  resources: z.array(unitPriceResourceSchema).min(1),
});

// ============================================================================
// QUANTITY TAKEOFFS
// ============================================================================

export const createQuantityTakeoffSchema = z.object({
  projectId: z.string().uuid(),
  workItemId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  calculationFormula: z.string().optional(),
  dimensions: z.record(z.any()).optional(),
  source: z.string().max(30).optional(),
  drawingRef: z.string().max(100).optional(),
  bimElementId: z.string().max(100).optional(),
  notes: z.string().optional(),
  measuredBy: z.string().uuid().optional(),
});

export const updateQuantityTakeoffSchema = createQuantityTakeoffSchema
  .partial()
  .omit({ projectId: true });

// ============================================================================
// ESTIMATES
// ============================================================================

export const createEstimateSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum([
    'yaklasik_maliyet',
    'ihale_teklif',
    'revize_kesif',
    'ek_kesif',
  ]),
  vatPct: z.number().min(0).max(100).optional(),
  createdBy: z.string().uuid(),
  notes: z.string().optional(),
});

export const createEstimateItemSchema = z.object({
  workItemId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const addEstimateItemsSchema = z.object({
  items: z.array(createEstimateItemSchema).min(1),
});

// ============================================================================
// BUDGETS
// ============================================================================

export const createBudgetSchema = z.object({
  projectId: z.string().uuid(),
  estimateId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3).optional(),
});

export const createBudgetItemSchema = z.object({
  workItemId: z.string().uuid().optional(),
  wbsCode: z.string().max(30).optional(),
  description: z.string().min(1).max(500),
  tradeId: z.string().uuid().optional(),
  plannedAmount: z.number().nonnegative(),
  category: z.enum([
    'labor',
    'material',
    'equipment',
    'subcontract',
    'overhead',
  ]),
});

export const addBudgetItemsSchema = z.object({
  items: z.array(createBudgetItemSchema).min(1),
});

// ============================================================================
// PAYMENT CERTIFICATES (HAKEDIS)
// ============================================================================

export const createPaymentCertificateSchema = z.object({
  projectId: z.string().uuid(),
  budgetId: z.string().uuid().optional(),
  periodNumber: z.number().int().positive(),
  periodStart: z.string().datetime().or(z.date()),
  periodEnd: z.string().datetime().or(z.date()),
  retentionPct: z.number().min(0).max(100).optional(),
  advanceDeduction: z.number().nonnegative().optional(),
  vatPct: z.number().min(0).max(100).optional(),
  createdBy: z.string().uuid(),
});

export const createPaymentItemSchema = z.object({
  workItemId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  contractQty: z.number().nonnegative(),
  currentQty: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
});

export const addPaymentItemsSchema = z.object({
  items: z.array(createPaymentItemSchema).min(1),
});

// ============================================================================
// EVM
// ============================================================================

export const createEvmSnapshotSchema = z.object({
  projectId: z.string().uuid(),
  snapshotDate: z.string().datetime().or(z.date()),
  pv: z.number().nonnegative(),
  ev: z.number().nonnegative(),
  ac: z.number().nonnegative(),
  bac: z.number().positive(),
});

// ============================================================================
// COST RECORDS
// ============================================================================

export const createCostRecordSchema = z.object({
  projectId: z.string().uuid(),
  budgetItemId: z.string().uuid().optional(),
  amount: z.number(),
  type: z.enum(['commitment', 'actual', 'forecast']),
  date: z.string().datetime().or(z.date()),
  description: z.string().optional(),
  invoiceRef: z.string().max(100).optional(),
  vendor: z.string().max(255).optional(),
  approvedBy: z.string().uuid().optional(),
});

// ============================================================================
// QUERY PARAMS
// ============================================================================

export const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});
