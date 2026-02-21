// Contract Policy Client for GreenSite — Fetches green_site policies

import { prisma } from '../../../lib/prisma';

export interface GreenSitePolicies {
  carbonTracking: 'mandatory' | 'optional';
  wasteDiversionTarget: number;
}

const DEFAULTS: GreenSitePolicies = {
  carbonTracking: 'optional',
  wasteDiversionTarget: 75,
};

export async function getGreenSitePolicies(projectId: string): Promise<GreenSitePolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: { policies: { where: { module: 'green_site' } } },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) policyMap.set(p.policyKey, p.policyValue);

    return {
      carbonTracking: (policyMap.get('carbon.tracking') as GreenSitePolicies['carbonTracking']) || DEFAULTS.carbonTracking,
      wasteDiversionTarget: parseInt(policyMap.get('waste.diversion_target') || '', 10) || DEFAULTS.wasteDiversionTarget,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
