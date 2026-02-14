'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function StakeholdersPage() {
  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="stakeholders" />
      <ModuleKpiGrid moduleId="stakeholders" />
      <ModuleComingSoon
        moduleId="stakeholders"
        message="Stakeholder engagement management with stakeholder register, authority matrix, engagement plans, and influence mapping for effective project governance."
      />
    </div>
  );
}
