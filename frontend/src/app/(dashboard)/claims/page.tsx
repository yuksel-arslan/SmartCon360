'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon, ContractPolicyBanner } from '@/components/modules';

const CLAIM_POLICY_LABELS: Record<string, string> = {
  'change_order.type': 'Change Order Type',
  'claim.basis': 'Claim Basis',
  'defects_liability.months': 'Defects Liability',
  'dispute.procedure': 'Dispute Procedure',
};

export default function ClaimsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="claims" />
      <ContractPolicyBanner module="claim_shield" policyLabels={CLAIM_POLICY_LABELS} />
      <ModuleKpiGrid moduleId="claims" />
      <ModuleComingSoon
        moduleId="claims"
        message="Manage change orders, claims register, and delay analysis with full documentation trails. Track extension of time requests and approval workflows."
      />
    </div>
  );
}
