// Contract Policy Client for SupplyChain — Fetches supply_chain policies
// from contract_profiles and contract_policies tables (same DB)

import { prisma } from '../../../lib/prisma';

export interface SupplyChainPolicies {
  procurementResponsibility: 'contractor' | 'subcontractor' | 'mixed';
  mrpEnabled: boolean;
}

const DEFAULTS: SupplyChainPolicies = {
  procurementResponsibility: 'mixed',
  mrpEnabled: false,
};

/**
 * Get SupplyChain-specific policies for a project.
 * Falls back to defaults if no contract profile exists.
 */
export async function getSupplyChainPolicies(projectId: string): Promise<SupplyChainPolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: {
        policies: {
          where: { module: 'supply_chain' },
        },
      },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) {
      policyMap.set(p.policyKey, p.policyValue);
    }

    return {
      procurementResponsibility: (policyMap.get('procurement.responsibility') as SupplyChainPolicies['procurementResponsibility']) || DEFAULTS.procurementResponsibility,
      mrpEnabled: policyMap.get('mrp.enabled') === 'true',
    };
  } catch {
    return { ...DEFAULTS };
  }
}
