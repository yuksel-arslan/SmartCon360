// Contract Policy Client for RiskRadar — Fetches risk_radar policies

import { prisma } from '../../../lib/prisma';

export interface RiskRadarPolicies {
  allocationModel: 'shared' | 'transferred';
  contingencyDefaultPct: number;
}

const DEFAULTS: RiskRadarPolicies = {
  allocationModel: 'transferred',
  contingencyDefaultPct: 5,
};

export async function getRiskPolicies(projectId: string): Promise<RiskRadarPolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: {
        policies: {
          where: { module: 'risk_radar' },
        },
      },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) {
      policyMap.set(p.policyKey, p.policyValue);
    }

    return {
      allocationModel: (policyMap.get('allocation.model') as RiskRadarPolicies['allocationModel']) || DEFAULTS.allocationModel,
      contingencyDefaultPct: parseInt(policyMap.get('contingency.default_pct') || '', 10) || DEFAULTS.contingencyDefaultPct,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
