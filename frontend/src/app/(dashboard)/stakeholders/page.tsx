'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function StakeholdersPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="stakeholders" />
      <ModuleKpiGrid moduleId="stakeholders" />
      <ModuleComingSoon
        moduleId="stakeholders"
        message="Stakeholder engagement management with stakeholder register, authority matrix, engagement plans, and influence mapping for effective project governance."
      />
    </div>
  );
}
