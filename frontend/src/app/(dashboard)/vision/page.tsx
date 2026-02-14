'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function VisionPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="vision" />
      <ModuleKpiGrid moduleId="vision" />
      <ModuleComingSoon
        moduleId="vision"
        message="AI-powered photo analysis for construction progress tracking. Automatically detect progress, identify defects, and generate time-lapse comparisons using Gemini Vision."
      />
    </div>
  );
}
