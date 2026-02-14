'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function VisionPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="vision" />
      <ModuleKpiGrid moduleId="vision" />
      <ModuleComingSoon
        moduleId="vision"
        message="AI-powered photo analysis for construction progress tracking. Automatically detect progress, identify defects, and generate time-lapse comparisons using Gemini Vision."
      />
    </div>
  );
}
