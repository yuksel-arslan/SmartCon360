'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function WorkmanshipPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="workmanship" />
      <ModuleKpiGrid moduleId="workmanship" />
      <ModuleComingSoon
        moduleId="workmanship"
        message="Manage crew planning, labor tracking, trade allocation and utilization. Monitor workforce productivity, shift schedules, and skill matrices across all project zones."
      />
    </div>
  );
}
