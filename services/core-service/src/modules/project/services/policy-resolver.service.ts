// services/core-service/src/modules/project/services/policy-resolver.service.ts
// Contract-Driven Architecture — PolicyResolver
// Resolves delivery model + commercial model → module behavior policies

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

export const DELIVERY_MODELS = [
  'dbb', 'design_build', 'cm_at_risk', 'ipd', 'epc',
  'kat_karsiligi', 'hasilat_paylasimi', 'bot', 'blt', 'emanet',
] as const;

export const COMMERCIAL_MODELS = [
  'unit_price', 'lump_sum', 'cost_plus', 'gmp',
  'build_share', 'revenue_share',
] as const;

export const CONTRACT_FORMS = [
  'fidic_red', 'fidic_yellow', 'fidic_silver', 'fidic_green',
  'nec3', 'nec4', 'jct', 'aia', 'bespoke',
] as const;

export const POLICY_MODULES = [
  'cost_pilot', 'takt_flow', 'claim_shield', 'supply_chain',
  'crew_flow', 'quality_gate', 'safe_zone', 'comm_hub',
  'risk_radar', 'stakeholder', 'green_site',
] as const;

export type DeliveryModel = typeof DELIVERY_MODELS[number];
export type CommercialModel = typeof COMMERCIAL_MODELS[number];
export type ContractForm = typeof CONTRACT_FORMS[number];
export type PolicyModule = typeof POLICY_MODULES[number];

export interface PolicyEntry {
  module: PolicyModule;
  policyKey: string;
  policyValue: string;
  description: string;
}

export interface ContractProfileInput {
  deliveryModel: DeliveryModel;
  commercialModel: CommercialModel;
  retentionPct?: number;
  advancePct?: number;
  paymentTermDays?: number;
  priceEscalation?: boolean;
  escalationIndex?: string;
  contractForm?: string;
  defectsLiabilityMonths?: number;
}

// ══════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════

export const ContractProfileSchema = z.object({
  deliveryModel: z.enum(DELIVERY_MODELS),
  commercialModel: z.enum(COMMERCIAL_MODELS),
  retentionPct: z.number().min(0).max(100).default(10),
  advancePct: z.number().min(0).max(100).default(0),
  paymentTermDays: z.number().int().min(0).max(180).default(30),
  priceEscalation: z.boolean().default(false),
  escalationIndex: z.string().max(50).optional(),
  contractForm: z.string().max(30).optional(),
  defectsLiabilityMonths: z.number().int().min(0).max(120).default(12),
});

// ══════════════════════════════════════
// POLICY RESOLUTION ENGINE
// ══════════════════════════════════════

/**
 * Resolve policies for CostPilot module based on commercial model.
 */
function resolveCostPilotPolicies(input: ContractProfileInput): PolicyEntry[] {
  const m = input.commercialModel;
  const policies: PolicyEntry[] = [];

  // EVM applicability
  const evmEnabled = !['build_share', 'revenue_share'].includes(m);
  policies.push({
    module: 'cost_pilot',
    policyKey: 'evm.enabled',
    policyValue: String(evmEnabled),
    description: evmEnabled
      ? 'EVM (Earned Value Management) enabled for cost/schedule performance tracking'
      : 'EVM not applicable for this commercial model — unit/revenue tracking used instead',
  });

  // S-Curve type
  const sCurveMap: Record<string, string> = {
    unit_price: 'cost', lump_sum: 'milestone', cost_plus: 'cost',
    gmp: 'cost', build_share: 'unit', revenue_share: 'revenue',
  };
  policies.push({
    module: 'cost_pilot',
    policyKey: 'scurve.type',
    policyValue: sCurveMap[m] || 'cost',
    description: `S-curve visualization based on ${sCurveMap[m] || 'cost'} progression`,
  });

  // Progress measurement method
  const progressMap: Record<string, string> = {
    unit_price: 'boq_quantity', lump_sum: 'milestone_pct', cost_plus: 'actual_cost',
    gmp: 'actual_cost', build_share: 'unit_completion', revenue_share: 'revenue_realization',
  };
  policies.push({
    module: 'cost_pilot',
    policyKey: 'progress.measurement',
    policyValue: progressMap[m] || 'boq_quantity',
    description: 'How physical progress is measured and reported',
  });

  // Payment structure
  const paymentMap: Record<string, string> = {
    unit_price: 'hakedis', lump_sum: 'milestone', cost_plus: 'cost_plus_fee',
    gmp: 'cost_plus_fee', build_share: 'unit_handover', revenue_share: 'revenue_split',
  };
  policies.push({
    module: 'cost_pilot',
    policyKey: 'payment.structure',
    policyValue: paymentMap[m] || 'hakedis',
    description: 'Payment certificate structure and approval workflow',
  });

  // Payment label
  const paymentLabelMap: Record<string, string> = {
    unit_price: 'Hakediş', lump_sum: 'Milestone Payment', cost_plus: 'Cost Reimbursement',
    gmp: 'Cost Reimbursement (GMP)', build_share: 'Unit Handover Certificate', revenue_share: 'Revenue Distribution',
  };
  policies.push({
    module: 'cost_pilot',
    policyKey: 'payment.label',
    policyValue: paymentLabelMap[m] || 'Payment Certificate',
    description: 'Display label for payment documents',
  });

  // Retention
  policies.push({
    module: 'cost_pilot',
    policyKey: 'retention.percentage',
    policyValue: String(input.retentionPct ?? 10),
    description: 'Default retention percentage held from each payment',
  });

  // Advance payment
  if ((input.advancePct ?? 0) > 0) {
    policies.push({
      module: 'cost_pilot',
      policyKey: 'advance.percentage',
      policyValue: String(input.advancePct),
      description: 'Advance payment percentage, deducted progressively from future payments',
    });
  }

  // Price escalation
  if (input.priceEscalation) {
    policies.push({
      module: 'cost_pilot',
      policyKey: 'escalation.enabled',
      policyValue: 'true',
      description: 'Price escalation (fiyat farkı) enabled based on index',
    });
    if (input.escalationIndex) {
      policies.push({
        module: 'cost_pilot',
        policyKey: 'escalation.index',
        policyValue: input.escalationIndex,
        description: 'Price escalation index reference (e.g., TUIK, CPI)',
      });
    }
  }

  return policies;
}

/**
 * Resolve policies for TaktFlow module.
 */
function resolveTaktFlowPolicies(input: ContractProfileInput): PolicyEntry[] {
  const m = input.commercialModel;
  const policies: PolicyEntry[] = [];

  const progressUnitMap: Record<string, string> = {
    unit_price: 'measured_quantity', lump_sum: 'milestone_pct', cost_plus: 'measured_quantity',
    gmp: 'measured_quantity', build_share: 'unit_completion', revenue_share: 'revenue_pct',
  };
  policies.push({
    module: 'takt_flow',
    policyKey: 'progress.unit',
    policyValue: progressUnitMap[m] || 'percentage',
    description: 'How takt zone progress is tracked',
  });

  // Delivery model affects design-construction overlap
  const concurrentDesign = ['design_build', 'cm_at_risk', 'ipd', 'epc'].includes(input.deliveryModel);
  policies.push({
    module: 'takt_flow',
    policyKey: 'design.concurrent',
    policyValue: String(concurrentDesign),
    description: concurrentDesign
      ? 'Design and construction can overlap — fast-track scheduling enabled'
      : 'Design must complete before construction — sequential phasing',
  });

  return policies;
}

/**
 * Resolve policies for ClaimShield module.
 */
function resolveClaimShieldPolicies(input: ContractProfileInput): PolicyEntry[] {
  const m = input.commercialModel;
  const d = input.deliveryModel;
  const policies: PolicyEntry[] = [];

  // Change order type
  const coTypeMap: Record<string, string> = {
    unit_price: 'new_rate_item', lump_sum: 'scope_variation', cost_plus: 'cost_directive',
    gmp: 'cost_directive', build_share: 'unit_allocation_change', revenue_share: 'revenue_share_adjustment',
  };
  policies.push({
    module: 'claim_shield',
    policyKey: 'change_order.type',
    policyValue: coTypeMap[m] || 'variation',
    description: 'Default change order classification for this commercial model',
  });

  // Claim basis
  const claimBasisMap: Record<string, string> = {
    unit_price: 'quantity_variance', lump_sum: 'scope_change', cost_plus: 'cost_substantiation',
    gmp: 'gmp_exceedance', build_share: 'unit_dispute', revenue_share: 'revenue_dispute',
  };
  policies.push({
    module: 'claim_shield',
    policyKey: 'claim.basis',
    policyValue: claimBasisMap[m] || 'contract_variation',
    description: 'Primary basis for claims under this commercial model',
  });

  // Defects liability period
  policies.push({
    module: 'claim_shield',
    policyKey: 'defects_liability.months',
    policyValue: String(input.defectsLiabilityMonths ?? 12),
    description: 'Defects liability period in months after practical completion',
  });

  // Contract form impacts dispute resolution
  if (input.contractForm) {
    const isFidic = input.contractForm.startsWith('fidic');
    policies.push({
      module: 'claim_shield',
      policyKey: 'dispute.procedure',
      policyValue: isFidic ? 'engineer_determination_then_daab' : 'negotiation_then_adjudication',
      description: `Dispute resolution procedure per ${input.contractForm} contract form`,
    });
  }

  return policies;
}

/**
 * Resolve policies for SupplyChain module.
 */
function resolveSupplyChainPolicies(input: ContractProfileInput): PolicyEntry[] {
  const m = input.commercialModel;
  const policies: PolicyEntry[] = [];

  // Material procurement responsibility
  const procurementMap: Record<string, string> = {
    unit_price: 'mixed', lump_sum: 'subcontractor', cost_plus: 'contractor',
    gmp: 'contractor', build_share: 'contractor', revenue_share: 'contractor',
  };
  policies.push({
    module: 'supply_chain',
    policyKey: 'procurement.responsibility',
    policyValue: procurementMap[m] || 'mixed',
    description: 'Who is primarily responsible for material procurement',
  });

  // MRP applicability
  const mrpEnabled = ['unit_price', 'cost_plus', 'gmp', 'build_share', 'revenue_share'].includes(m);
  policies.push({
    module: 'supply_chain',
    policyKey: 'mrp.enabled',
    policyValue: String(mrpEnabled),
    description: mrpEnabled
      ? 'Material Requirement Planning enabled — contractor manages materials'
      : 'MRP not applicable — subcontractors manage own materials',
  });

  return policies;
}

/**
 * Resolve policies for CrewFlow module.
 */
function resolveCrewFlowPolicies(input: ContractProfileInput): PolicyEntry[] {
  const d = input.deliveryModel;
  const policies: PolicyEntry[] = [];

  // Resource tracking depth
  const directLabor = ['cost_plus', 'gmp', 'emanet'].includes(input.commercialModel) ||
    ['build_share', 'revenue_share'].includes(input.commercialModel);
  policies.push({
    module: 'crew_flow',
    policyKey: 'labor.tracking',
    policyValue: directLabor ? 'detailed' : 'summary',
    description: directLabor
      ? 'Detailed labor tracking required — track individual crew hours and costs'
      : 'Summary labor tracking — subcontractor manages crew details',
  });

  return policies;
}

/**
 * Resolve policies for QualityGate module.
 */
function resolveQualityGatePolicies(input: ContractProfileInput): PolicyEntry[] {
  const d = input.deliveryModel;
  const m = input.commercialModel;
  const policies: PolicyEntry[] = [];

  // Inspection frequency — higher for cost_plus/gmp where owner bears risk
  const highFrequency = ['cost_plus', 'gmp', 'emanet'].includes(m);
  policies.push({
    module: 'quality_gate',
    policyKey: 'inspection.frequency',
    policyValue: highFrequency ? 'per_activity' : 'per_milestone',
    description: highFrequency
      ? 'Inspection required per activity — owner bears quality risk'
      : 'Inspection at milestone level — contractor responsible for interim quality',
  });

  // FTR (First Time Right) threshold
  const ftrThreshold = ['ipd', 'design_build'].includes(d) ? '90' : '85';
  policies.push({
    module: 'quality_gate',
    policyKey: 'ftr.threshold',
    policyValue: ftrThreshold,
    description: `FTR target threshold: ${ftrThreshold}% — integrated delivery expects higher quality`,
  });

  // NCR approval workflow depth
  const ncrApproval = ['dbb', 'kat_karsiligi'].includes(d) ? 'engineer_approval' : 'self_certification';
  policies.push({
    module: 'quality_gate',
    policyKey: 'ncr.approval',
    policyValue: ncrApproval,
    description: ncrApproval === 'engineer_approval'
      ? 'NCR resolution requires engineer approval — traditional oversight model'
      : 'Contractor self-certifies NCR closure — integrated delivery model',
  });

  // COPQ tracking
  const copqEnabled = !['build_share', 'revenue_share'].includes(m);
  policies.push({
    module: 'quality_gate',
    policyKey: 'copq.enabled',
    policyValue: String(copqEnabled),
    description: copqEnabled
      ? 'Cost of Poor Quality tracking enabled'
      : 'COPQ not applicable for this commercial model',
  });

  return policies;
}

/**
 * Resolve policies for SafeZone module.
 */
function resolveSafeZonePolicies(input: ContractProfileInput): PolicyEntry[] {
  const d = input.deliveryModel;
  const m = input.commercialModel;
  const policies: PolicyEntry[] = [];

  // Safety reporting level
  const detailedReporting = ['ipd', 'cm_at_risk', 'epc'].includes(d) || ['cost_plus', 'gmp'].includes(m);
  policies.push({
    module: 'safe_zone',
    policyKey: 'reporting.level',
    policyValue: detailedReporting ? 'detailed' : 'summary',
    description: detailedReporting
      ? 'Detailed safety reporting — includes near-miss, observations, leading indicators'
      : 'Summary safety reporting — incidents and PTW tracking',
  });

  // PTW requirement strictness
  const strictPtw = ['epc', 'cm_at_risk', 'ipd'].includes(d);
  policies.push({
    module: 'safe_zone',
    policyKey: 'ptw.strictness',
    policyValue: strictPtw ? 'strict' : 'standard',
    description: strictPtw
      ? 'Strict PTW regime — all hazardous work requires approved permit'
      : 'Standard PTW — permits for high-risk activities only',
  });

  // Toolbox talk frequency
  policies.push({
    module: 'safe_zone',
    policyKey: 'toolbox.frequency',
    policyValue: detailedReporting ? 'daily' : 'weekly',
    description: `Toolbox talk frequency: ${detailedReporting ? 'daily' : 'weekly'}`,
  });

  return policies;
}

/**
 * Resolve policies for CommHub module.
 */
function resolveCommHubPolicies(input: ContractProfileInput): PolicyEntry[] {
  const d = input.deliveryModel;
  const policies: PolicyEntry[] = [];

  // RFI response time (days)
  const rfiDays = ['dbb', 'kat_karsiligi'].includes(d) ? '14' : '7';
  policies.push({
    module: 'comm_hub',
    policyKey: 'rfi.response_days',
    policyValue: rfiDays,
    description: `RFI response deadline: ${rfiDays} days — ${rfiDays === '14' ? 'traditional separate design review' : 'integrated faster turnaround'}`,
  });

  // Escalation model
  const escalation = ['ipd', 'cm_at_risk'].includes(d) ? 'collaborative' : 'hierarchical';
  policies.push({
    module: 'comm_hub',
    policyKey: 'escalation.model',
    policyValue: escalation,
    description: escalation === 'collaborative'
      ? 'Collaborative escalation — shared problem-solving before formal escalation'
      : 'Hierarchical escalation — formal chain of command',
  });

  return policies;
}

/**
 * Resolve policies for RiskRadar module.
 */
function resolveRiskRadarPolicies(input: ContractProfileInput): PolicyEntry[] {
  const d = input.deliveryModel;
  const m = input.commercialModel;
  const policies: PolicyEntry[] = [];

  // Risk allocation model
  const sharedRisk = ['ipd', 'cm_at_risk', 'build_share', 'revenue_share'].includes(m) ||
    ['ipd'].includes(d);
  policies.push({
    module: 'risk_radar',
    policyKey: 'allocation.model',
    policyValue: sharedRisk ? 'shared' : 'transferred',
    description: sharedRisk
      ? 'Shared risk model — risks managed collaboratively'
      : 'Transferred risk model — risk allocated per contract terms',
  });

  // Contingency tracking
  const contingencyPct = ['cost_plus', 'gmp'].includes(m) ? '10' : '5';
  policies.push({
    module: 'risk_radar',
    policyKey: 'contingency.default_pct',
    policyValue: contingencyPct,
    description: `Default contingency reserve: ${contingencyPct}%`,
  });

  return policies;
}

/**
 * Resolve policies for StakeHub module.
 */
function resolveStakeholderPolicies(input: ContractProfileInput): PolicyEntry[] {
  const d = input.deliveryModel;
  const policies: PolicyEntry[] = [];

  // Reporting frequency
  const frequentReporting = ['ipd', 'cm_at_risk', 'epc'].includes(d);
  policies.push({
    module: 'stakeholder',
    policyKey: 'reporting.frequency',
    policyValue: frequentReporting ? 'weekly' : 'monthly',
    description: `Stakeholder reporting: ${frequentReporting ? 'weekly' : 'monthly'} — ${frequentReporting ? 'integrated delivery requires closer engagement' : 'traditional periodic reporting'}`,
  });

  // Engagement level
  const highEngagement = ['ipd', 'cm_at_risk'].includes(d);
  policies.push({
    module: 'stakeholder',
    policyKey: 'engagement.level',
    policyValue: highEngagement ? 'collaborative' : 'inform',
    description: highEngagement
      ? 'Collaborative stakeholder engagement — active participation in decisions'
      : 'Informative engagement — stakeholders kept informed of progress',
  });

  return policies;
}

/**
 * Resolve policies for GreenSite module.
 */
function resolveGreenSitePolicies(input: ContractProfileInput): PolicyEntry[] {
  const d = input.deliveryModel;
  const m = input.commercialModel;
  const policies: PolicyEntry[] = [];

  // Carbon tracking requirement
  const carbonTracking = ['ipd', 'epc', 'design_build'].includes(d);
  policies.push({
    module: 'green_site',
    policyKey: 'carbon.tracking',
    policyValue: carbonTracking ? 'mandatory' : 'optional',
    description: carbonTracking
      ? 'Carbon tracking mandatory — integrated delivery model includes sustainability targets'
      : 'Carbon tracking optional — available for voluntary reporting',
  });

  // Waste diversion target
  const highTarget = ['ipd', 'epc'].includes(d);
  policies.push({
    module: 'green_site',
    policyKey: 'waste.diversion_target',
    policyValue: highTarget ? '90' : '75',
    description: `Waste diversion target: ${highTarget ? '90' : '75'}%`,
  });

  return policies;
}

// ══════════════════════════════════════
// MAIN RESOLVER
// ══════════════════════════════════════

/**
 * Resolve all module policies from delivery model + commercial model.
 * Returns a flat array of PolicyEntry objects.
 */
export function resolveAllPolicies(input: ContractProfileInput): PolicyEntry[] {
  return [
    ...resolveCostPilotPolicies(input),
    ...resolveTaktFlowPolicies(input),
    ...resolveClaimShieldPolicies(input),
    ...resolveSupplyChainPolicies(input),
    ...resolveCrewFlowPolicies(input),
    ...resolveQualityGatePolicies(input),
    ...resolveSafeZonePolicies(input),
    ...resolveCommHubPolicies(input),
    ...resolveRiskRadarPolicies(input),
    ...resolveStakeholderPolicies(input),
    ...resolveGreenSitePolicies(input),
  ];
}

/**
 * Get policies for a specific module.
 */
export function resolvePoliciesForModule(input: ContractProfileInput, module: PolicyModule): PolicyEntry[] {
  return resolveAllPolicies(input).filter(p => p.module === module);
}

// ══════════════════════════════════════
// DATABASE OPERATIONS
// ══════════════════════════════════════

/**
 * Create or update a contract profile for a project, generating all policies.
 */
export async function upsertContractProfile(
  projectId: string,
  input: ContractProfileInput,
): Promise<{ profileId: string; policyCount: number }> {
  const validated = ContractProfileSchema.parse(input);
  const policies = resolveAllPolicies(validated);

  // Upsert the contract profile
  const profile = await prisma.contractProfile.upsert({
    where: { projectId },
    create: {
      projectId,
      deliveryModel: validated.deliveryModel,
      commercialModel: validated.commercialModel,
      retentionPct: validated.retentionPct,
      advancePct: validated.advancePct,
      paymentTermDays: validated.paymentTermDays,
      priceEscalation: validated.priceEscalation,
      escalationIndex: validated.escalationIndex,
      contractForm: validated.contractForm,
      defectsLiabilityMonths: validated.defectsLiabilityMonths,
    },
    update: {
      deliveryModel: validated.deliveryModel,
      commercialModel: validated.commercialModel,
      retentionPct: validated.retentionPct,
      advancePct: validated.advancePct,
      paymentTermDays: validated.paymentTermDays,
      priceEscalation: validated.priceEscalation,
      escalationIndex: validated.escalationIndex,
      contractForm: validated.contractForm,
      defectsLiabilityMonths: validated.defectsLiabilityMonths,
    },
  });

  // Delete existing auto-generated policies (keep manual overrides)
  await prisma.contractPolicy.deleteMany({
    where: { profileId: profile.id, isOverridden: false },
  });

  // Insert resolved policies
  await prisma.contractPolicy.createMany({
    data: policies.map(p => ({
      profileId: profile.id,
      module: p.module,
      policyKey: p.policyKey,
      policyValue: p.policyValue,
      description: p.description,
      isOverridden: false,
    })),
    skipDuplicates: true,
  });

  // Update project delivery/commercial model fields
  await prisma.project.update({
    where: { id: projectId },
    data: {
      deliveryModel: validated.deliveryModel,
      commercialModel: validated.commercialModel,
    },
  });

  return { profileId: profile.id, policyCount: policies.length };
}

/**
 * Get the resolved policies for a project, optionally filtered by module.
 */
export async function getProjectPolicies(
  projectId: string,
  module?: PolicyModule,
): Promise<{ profileId: string | null; deliveryModel: string | null; commercialModel: string | null; policies: Array<{ module: string; policyKey: string; policyValue: string; description: string | null; isOverridden: boolean }> }> {
  const profile = await prisma.contractProfile.findUnique({
    where: { projectId },
    include: {
      policies: module ? { where: { module } } : true,
    },
  });

  if (!profile) {
    return { profileId: null, deliveryModel: null, commercialModel: null, policies: [] };
  }

  return {
    profileId: profile.id,
    deliveryModel: profile.deliveryModel,
    commercialModel: profile.commercialModel,
    policies: profile.policies.map(p => ({
      module: p.module,
      policyKey: p.policyKey,
      policyValue: p.policyValue,
      description: p.description,
      isOverridden: p.isOverridden,
    })),
  };
}

/**
 * Override a specific policy value (manual admin override).
 */
export async function overridePolicy(
  projectId: string,
  module: PolicyModule,
  policyKey: string,
  newValue: string,
): Promise<void> {
  const profile = await prisma.contractProfile.findUnique({ where: { projectId } });
  if (!profile) throw new Error('Contract profile not found for project');

  await prisma.contractPolicy.upsert({
    where: {
      profileId_module_policyKey: {
        profileId: profile.id,
        module,
        policyKey,
      },
    },
    create: {
      profileId: profile.id,
      module,
      policyKey,
      policyValue: newValue,
      isOverridden: true,
    },
    update: {
      policyValue: newValue,
      isOverridden: true,
    },
  });
}

/**
 * Get a single policy value for a module (used by other services to check behavior).
 */
export async function getPolicyValue(
  projectId: string,
  module: PolicyModule,
  policyKey: string,
): Promise<string | null> {
  const profile = await prisma.contractProfile.findUnique({ where: { projectId } });
  if (!profile) return null;

  const policy = await prisma.contractPolicy.findUnique({
    where: {
      profileId_module_policyKey: {
        profileId: profile.id,
        module,
        policyKey,
      },
    },
  });

  return policy?.policyValue ?? null;
}
