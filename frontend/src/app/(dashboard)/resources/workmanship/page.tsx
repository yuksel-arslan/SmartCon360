'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function WorkmanshipPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="workmanship" />
      <ModuleKpiGrid moduleId="workmanship" />
      <ModuleComingSoon
        moduleId="workmanship"
        message="Manage crew planning, labor tracking, trade allocation and utilization. Monitor workforce productivity, shift schedules, and skill matrices across all project zones."
      />
    </div>
  );
}
