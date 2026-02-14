'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function QualityPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="quality" />
      <ModuleKpiGrid moduleId="quality" />
      <ModuleComingSoon
        moduleId="quality"
        message="Manage quality inspections, non-conformance reports, and punch lists. Track First Time Right rates and Cost of Poor Quality across all trades and zones."
      />
    </div>
  );
}
