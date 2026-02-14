'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function EquipmentPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="equipment" />
      <ModuleKpiGrid moduleId="equipment" />
      <ModuleComingSoon
        moduleId="equipment"
        message="Manage equipment fleet, maintenance scheduling, utilization tracking, and fuel monitoring. Track operator assignments, inspection logs, and equipment availability across project sites."
      />
    </div>
  );
}
