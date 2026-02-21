'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon, ContractPolicyBanner } from '@/components/modules';

export default function CommunicationPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="communication" />
      <ContractPolicyBanner
        module="comm_hub"
        policyLabels={{ 'rfi.response_days': 'RFI Response (days)', 'escalation.model': 'Escalation Model' }}
      />
      <ModuleKpiGrid moduleId="communication" />
      <ModuleComingSoon
        moduleId="communication"
        message="Centralized project communication hub for RFI management, transmittals, meeting minutes, and escalation engine with full document control."
      />
    </div>
  );
}
