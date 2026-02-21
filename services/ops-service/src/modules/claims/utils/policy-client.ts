// Contract Policy Client for ClaimShield — Fetches claim_shield policies
// from contract_profiles and contract_policies tables (same DB)

import { prisma } from '../../../lib/prisma';

export interface ClaimShieldPolicies {
  changeOrderType: string;
  claimBasis: string;
  defectsLiabilityMonths: number;
  disputeProcedure: string;
}

const DEFAULTS: ClaimShieldPolicies = {
  changeOrderType: 'variation',
  claimBasis: 'contract_variation',
  defectsLiabilityMonths: 12,
  disputeProcedure: 'negotiation_then_adjudication',
};

/**
 * Get ClaimShield-specific policies for a project.
 * Falls back to defaults if no contract profile exists.
 */
export async function getClaimsPolicies(projectId: string): Promise<ClaimShieldPolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: {
        policies: {
          where: { module: 'claim_shield' },
        },
      },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) {
      policyMap.set(p.policyKey, p.policyValue);
    }

    return {
      changeOrderType: policyMap.get('change_order.type') || DEFAULTS.changeOrderType,
      claimBasis: policyMap.get('claim.basis') || DEFAULTS.claimBasis,
      defectsLiabilityMonths: parseInt(policyMap.get('defects_liability.months') || '', 10) || DEFAULTS.defectsLiabilityMonths,
      disputeProcedure: policyMap.get('dispute.procedure') || DEFAULTS.disputeProcedure,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
