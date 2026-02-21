// Contract Policy Client for StakeHub — Fetches stakeholder policies

import { prisma } from '../../../lib/prisma';

export interface StakeholderPolicies {
  reportingFrequency: 'weekly' | 'monthly';
  engagementLevel: 'collaborative' | 'inform';
}

const DEFAULTS: StakeholderPolicies = {
  reportingFrequency: 'monthly',
  engagementLevel: 'inform',
};

export async function getStakeholderPolicies(projectId: string): Promise<StakeholderPolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: { policies: { where: { module: 'stakeholder' } } },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) policyMap.set(p.policyKey, p.policyValue);

    return {
      reportingFrequency: (policyMap.get('reporting.frequency') as StakeholderPolicies['reportingFrequency']) || DEFAULTS.reportingFrequency,
      engagementLevel: (policyMap.get('engagement.level') as StakeholderPolicies['engagementLevel']) || DEFAULTS.engagementLevel,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
