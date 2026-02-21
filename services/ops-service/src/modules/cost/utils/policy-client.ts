// Contract Policy Client — Fetches contract-driven policies for CostPilot
// Reads from contract_profiles and contract_policies tables (same DB)

import { prisma } from './prisma';

export type CostPilotPolicies = {
  evmEnabled: boolean;
  scurveType: string;
  progressMeasurement: string;
  paymentStructure: string;
  paymentLabel: string;
  retentionPct: number;
  advancePct: number;
  escalationEnabled: boolean;
  escalationIndex: string | null;
};

const DEFAULT_POLICIES: CostPilotPolicies = {
  evmEnabled: true,
  scurveType: 'standard',
  progressMeasurement: 'unit_quantity',
  paymentStructure: 'monthly_progress',
  paymentLabel: 'Hakediş',
  retentionPct: 10,
  advancePct: 0,
  escalationEnabled: false,
  escalationIndex: null,
};

/**
 * Get CostPilot-specific policies for a project.
 * Falls back to sensible defaults if no contract profile exists.
 */
export async function getCostPolicies(projectId: string): Promise<CostPilotPolicies> {
  const profile = await prisma.contractProfile.findUnique({
    where: { projectId },
    include: {
      policies: {
        where: { module: 'cost_pilot' },
      },
    },
  });

  if (!profile) {
    return { ...DEFAULT_POLICIES };
  }

  const policyMap = new Map<string, string>();
  for (const p of profile.policies) {
    policyMap.set(p.policyKey, p.policyValue);
  }

  return {
    evmEnabled: policyMap.get('evm.enabled') !== 'false',
    scurveType: policyMap.get('scurve.type') || DEFAULT_POLICIES.scurveType,
    progressMeasurement: policyMap.get('progress.measurement') || DEFAULT_POLICIES.progressMeasurement,
    paymentStructure: policyMap.get('payment.structure') || DEFAULT_POLICIES.paymentStructure,
    paymentLabel: policyMap.get('payment.label') || DEFAULT_POLICIES.paymentLabel,
    retentionPct: parseFloat(policyMap.get('retention.percentage') || '') || parseFloat(profile.retentionPct.toString()),
    advancePct: parseFloat(policyMap.get('advance.percentage') || '') || parseFloat(profile.advancePct.toString()),
    escalationEnabled: policyMap.get('escalation.enabled') === 'true' || profile.priceEscalation,
    escalationIndex: policyMap.get('escalation.index') || profile.escalationIndex,
  };
}

/**
 * Get a single policy value for a project/module.
 * Returns null if not found.
 */
export async function getPolicyValue(
  projectId: string,
  module: string,
  policyKey: string
): Promise<string | null> {
  const profile = await prisma.contractProfile.findUnique({
    where: { projectId },
  });

  if (!profile) return null;

  const policy = await prisma.contractPolicy.findFirst({
    where: {
      profileId: profile.id,
      module,
      policyKey,
    },
  });

  return policy?.policyValue ?? null;
}
