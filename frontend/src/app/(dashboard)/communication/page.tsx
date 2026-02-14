'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function CommunicationPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="communication" />
      <ModuleKpiGrid moduleId="communication" />
      <ModuleComingSoon
        moduleId="communication"
        message="Centralized project communication hub for RFI management, transmittals, meeting minutes, and escalation engine with full document control."
      />
    </div>
  );
}
