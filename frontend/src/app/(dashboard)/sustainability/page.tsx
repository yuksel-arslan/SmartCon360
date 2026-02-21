'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon, ContractPolicyBanner } from '@/components/modules';

export default function SustainabilityPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="sustainability" />
      <ContractPolicyBanner
        module="green_site"
        policyLabels={{ 'carbon.tracking': 'Carbon Tracking', 'waste.diversion_target': 'Waste Diversion Target %' }}
      />
      <ModuleKpiGrid moduleId="sustainability" />
      <ModuleComingSoon
        moduleId="sustainability"
        message="Track environmental sustainability and ESG metrics including carbon emissions, waste diversion, water usage, and LEED/BREEAM certification progress."
      />
    </div>
  );
}
