'use client';

import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { usePolicyStore } from '@/stores/policyStore';
import { useProjectStore } from '@/stores/projectStore';

interface PolicyBannerProps {
  module: string;
  /** Map policy keys to human-readable labels */
  policyLabels?: Record<string, string>;
}

const MODULE_NAMES: Record<string, string> = {
  cost_pilot: 'CostPilot',
  takt_flow: 'TaktFlow',
  claim_shield: 'ClaimShield',
  supply_chain: 'SupplyChain',
  crew_flow: 'CrewFlow',
  quality_gate: 'QualityGate',
  safe_zone: 'SafeZone',
  comm_hub: 'CommHub',
  risk_radar: 'RiskRadar',
  stakeholder: 'StakeHub',
  green_site: 'GreenSite',
};

/**
 * Contract Policy Banner — displays contract-driven policies for a module.
 * Drop this into any module page to show active policies.
 */
export function ContractPolicyBanner({ module, policyLabels }: PolicyBannerProps) {
  const { activeProjectId } = useProjectStore();
  const { hasProfile, initialized, fetchPolicies, getModulePolicies, profile } = usePolicyStore();

  useEffect(() => {
    if (activeProjectId && !initialized) {
      fetchPolicies(activeProjectId);
    }
  }, [activeProjectId, initialized, fetchPolicies]);

  if (!initialized || !hasProfile) return null;

  const policies = getModulePolicies(module);
  const entries = Object.entries(policies);
  if (entries.length === 0) return null;

  const moduleName = MODULE_NAMES[module] || module;

  return (
    <div
      className="rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
      style={{ background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid #6366F1', color: 'var(--color-text-muted)' }}
    >
      <div className="flex items-center gap-1.5 font-semibold" style={{ color: '#6366F1' }}>
        <FileText size={12} />
        <span>{moduleName} Contract Policy</span>
      </div>
      {entries.map(([key, value]) => {
        const label = policyLabels?.[key] || key.replace(/\./g, ' ').replace(/_/g, ' ');
        const displayValue = value === 'true' ? 'Yes' : value === 'false' ? 'No' : value.replace(/_/g, ' ');
        return (
          <span key={key}>
            <strong className="capitalize">{label}:</strong>{' '}
            <span className="capitalize">{displayValue}</span>
          </span>
        );
      })}
      {profile && (
        <span className="text-[10px] opacity-70">
          ({profile.deliveryModel?.replace(/_/g, ' ')} / {profile.commercialModel?.replace(/_/g, ' ')})
        </span>
      )}
    </div>
  );
}
