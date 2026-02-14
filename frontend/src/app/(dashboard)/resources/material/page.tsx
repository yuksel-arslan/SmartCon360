'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function MaterialPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="material" />
      <ModuleKpiGrid moduleId="material" />
      <ModuleComingSoon
        moduleId="material"
        message="Track material inventory, consumption analysis, waste monitoring, and delivery scheduling. Monitor stock levels, pending deliveries, and material testing results across all zones."
      />
    </div>
  );
}
