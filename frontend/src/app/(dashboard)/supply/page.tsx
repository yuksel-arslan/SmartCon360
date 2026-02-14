'use client';

import { ModulePageHeader, ModuleKpiGrid, ModuleComingSoon } from '@/components/modules';

export default function SupplyPage() {
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="supply" />
      <ModuleKpiGrid moduleId="supply" />
      <ModuleComingSoon
        moduleId="supply"
        message="End-to-end procurement and supply chain management with MRP engine, JIT delivery tracking, supplier management, and RFQ workflows integrated with takt planning."
      />
    </div>
  );
}
