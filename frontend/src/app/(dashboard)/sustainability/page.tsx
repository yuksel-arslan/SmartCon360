'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function SustainabilityPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="sustainability" />
      <ModuleKpiGrid moduleId="sustainability" />
      <ModuleComingSoon
        moduleId="sustainability"
        message="Track environmental sustainability and ESG metrics including carbon emissions, waste diversion, water usage, and LEED/BREEAM certification progress."
      />
    </div>
  );
}
