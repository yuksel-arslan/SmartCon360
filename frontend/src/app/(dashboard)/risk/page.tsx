'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon, ContractPolicyBanner } from '@/components/modules';

export default function RiskPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="risk" />
      <ContractPolicyBanner
        module="risk_radar"
        policyLabels={{ 'allocation.model': 'Risk Allocation', 'contingency.default_pct': 'Contingency %' }}
      />
      <ModuleKpiGrid moduleId="risk" />
      <ModuleComingSoon
        moduleId="risk"
        message="Comprehensive risk management with risk register, heat map visualization, mitigation tracking, and what-if analysis integrated with project schedule and cost data."
      />
    </div>
  );
}
