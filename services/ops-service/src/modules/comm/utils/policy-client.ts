// Contract Policy Client for CommHub — Fetches comm_hub policies
// from contract_profiles and contract_policies tables (same DB)

import { prisma } from '../../../lib/prisma';

export interface CommHubPolicies {
  rfiResponseDays: number;
  escalationModel: 'collaborative' | 'hierarchical';
}

const DEFAULTS: CommHubPolicies = {
  rfiResponseDays: 14,
  escalationModel: 'hierarchical',
};

/**
 * Get CommHub-specific policies for a project.
 * Falls back to defaults if no contract profile exists.
 */
export async function getCommPolicies(projectId: string): Promise<CommHubPolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: {
        policies: {
          where: { module: 'comm_hub' },
        },
      },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) {
      policyMap.set(p.policyKey, p.policyValue);
    }

    return {
      rfiResponseDays: parseInt(policyMap.get('rfi.response_days') || '', 10) || DEFAULTS.rfiResponseDays,
      escalationModel: (policyMap.get('escalation.model') as CommHubPolicies['escalationModel']) || DEFAULTS.escalationModel,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
