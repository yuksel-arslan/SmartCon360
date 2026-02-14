'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function SafetyPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="safety" />
      <ModuleKpiGrid moduleId="safety" />
      <ModuleComingSoon
        moduleId="safety"
        message="Comprehensive OHS management with risk matrix, incident reporting, permit-to-work workflows, and safety observation tracking across all project zones."
      />
    </div>
  );
}
