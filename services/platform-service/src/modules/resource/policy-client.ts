// Contract Policy Client for CrewFlow — Fetches crew_flow policies
// from contract_profiles and contract_policies tables (same DB)

import { prisma } from '../../lib/prisma';

export interface CrewFlowPolicies {
  laborTracking: 'detailed' | 'summary';
}

const DEFAULTS: CrewFlowPolicies = {
  laborTracking: 'summary',
};

/**
 * Get CrewFlow-specific policies for a project.
 * Falls back to defaults if no contract profile exists.
 */
export async function getCrewFlowPolicies(projectId: string): Promise<CrewFlowPolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: {
        policies: {
          where: { module: 'crew_flow' },
        },
      },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) {
      policyMap.set(p.policyKey, p.policyValue);
    }

    return {
      laborTracking: (policyMap.get('labor.tracking') as 'detailed' | 'summary') || DEFAULTS.laborTracking,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
