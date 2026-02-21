// Contract Policy Client for QualityGate — Fetches quality_gate policies
// from contract_profiles and contract_policies tables (same DB)

import { prisma } from '../../../lib/prisma';

export interface QualityGatePolicies {
  inspectionFrequency: 'per_activity' | 'per_milestone';
  ftrThreshold: number;
  ncrApproval: 'engineer_approval' | 'self_certification';
  copqEnabled: boolean;
}

const DEFAULTS: QualityGatePolicies = {
  inspectionFrequency: 'per_milestone',
  ftrThreshold: 85,
  ncrApproval: 'engineer_approval',
  copqEnabled: true,
};

/**
 * Get QualityGate-specific policies for a project.
 * Falls back to defaults if no contract profile exists.
 */
export async function getQualityPolicies(projectId: string): Promise<QualityGatePolicies> {
  try {
    const profile = await prisma.contractProfile.findUnique({
      where: { projectId },
      include: {
        policies: {
          where: { module: 'quality_gate' },
        },
      },
    });

    if (!profile) return { ...DEFAULTS };

    const policyMap = new Map<string, string>();
    for (const p of profile.policies) {
      policyMap.set(p.policyKey, p.policyValue);
    }

    return {
      inspectionFrequency: (policyMap.get('inspection.frequency') as QualityGatePolicies['inspectionFrequency']) || DEFAULTS.inspectionFrequency,
      ftrThreshold: parseInt(policyMap.get('ftr.threshold') || '', 10) || DEFAULTS.ftrThreshold,
      ncrApproval: (policyMap.get('ncr.approval') as QualityGatePolicies['ncrApproval']) || DEFAULTS.ncrApproval,
      copqEnabled: policyMap.get('copq.enabled') !== 'false',
    };
  } catch {
    return { ...DEFAULTS };
  }
}
