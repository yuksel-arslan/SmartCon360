// Contract Policy Client for SafeZone — Fetches safe_zone policies
// from contract_profiles and contract_policies tables (same DB)

import { prisma } from '../../../lib/prisma';

export interface SafeZonePolicies {
  reportingLevel: 'detailed' | 'summary';
  ptwStrictness: 'strict' | 'standard';
  toolboxFrequency: 'daily' | 'weekly';
}

const DEFAULTS: SafeZonePolicies = {
  reportingLevel: 'summary',
  ptwStrictness: 'standard',
  toolboxFrequency: 'weekly',
};

/**
 * Get SafeZone-specific policies for a project.
 * Falls back to defaults if no contract profile exists.
 */
export async function getSafetyPolicies(projectId: string): Promise<SafeZonePolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: {
        policies: {
          where: { module: 'safe_zone' },
        },
      },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) {
      policyMap.set(p.policyKey, p.policyValue);
    }

    return {
      reportingLevel: (policyMap.get('reporting.level') as SafeZonePolicies['reportingLevel']) || DEFAULTS.reportingLevel,
      ptwStrictness: (policyMap.get('ptw.strictness') as SafeZonePolicies['ptwStrictness']) || DEFAULTS.ptwStrictness,
      toolboxFrequency: (policyMap.get('toolbox.frequency') as SafeZonePolicies['toolboxFrequency']) || DEFAULTS.toolboxFrequency,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
