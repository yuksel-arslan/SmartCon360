'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function MaterialPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="material" />
      <ModuleKpiGrid moduleId="material" />
      <ModuleComingSoon
        moduleId="material"
        message="Track material inventory, consumption analysis, waste monitoring, and delivery scheduling. Monitor stock levels, pending deliveries, and material testing results across all zones."
      />
    </div>
  );
}
