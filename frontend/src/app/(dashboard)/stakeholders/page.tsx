'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon, ContractPolicyBanner } from '@/components/modules';

export default function StakeholdersPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="stakeholders" />
      <ContractPolicyBanner
        module="stakeholder"
        policyLabels={{ 'reporting.frequency': 'Reporting Frequency', 'engagement.level': 'Engagement Level' }}
      />
      <ModuleKpiGrid moduleId="stakeholders" />
      <ModuleComingSoon
        moduleId="stakeholders"
        message="Stakeholder engagement management with stakeholder register, authority matrix, engagement plans, and influence mapping for effective project governance."
      />
    </div>
  );
}
