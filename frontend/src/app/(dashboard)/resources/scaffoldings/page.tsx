'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function ScaffoldingsPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="scaffoldings" />
      <ModuleKpiGrid moduleId="scaffoldings" />
      <ModuleComingSoon
        moduleId="scaffoldings"
        message="Track scaffolding inventory, erection and dismantling schedules, inspection cycles, and load calculations. Manage scaffold permits, compliance documentation, and zone-level allocation."
      />
    </div>
  );
}
