'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function QualityPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="quality" />
      <ModuleKpiGrid moduleId="quality" />
      <ModuleComingSoon
        moduleId="quality"
        message="Manage quality inspections, non-conformance reports, and punch lists. Track First Time Right rates and Cost of Poor Quality across all trades and zones."
      />
    </div>
  );
}
