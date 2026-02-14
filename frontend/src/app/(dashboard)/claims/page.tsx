'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function ClaimsPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="claims" />
      <ModuleKpiGrid moduleId="claims" />
      <ModuleComingSoon
        moduleId="claims"
        message="Manage change orders, claims register, and delay analysis with full documentation trails. Track extension of time requests and approval workflows."
      />
    </div>
  );
}
