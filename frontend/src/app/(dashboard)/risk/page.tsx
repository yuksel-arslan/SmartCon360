'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function RiskPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="risk" />
      <ModuleKpiGrid moduleId="risk" />
      <ModuleComingSoon
        moduleId="risk"
        message="Comprehensive risk management with risk register, heat map visualization, mitigation tracking, and what-if analysis integrated with project schedule and cost data."
      />
    </div>
  );
}
