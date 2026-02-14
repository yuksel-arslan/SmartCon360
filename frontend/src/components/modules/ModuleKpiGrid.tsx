'use client';

import { MODULE_REGISTRY, type ModuleId } from '@/lib/modules';

interface ModuleKpiGridProps {
  /** Module identifier — KPI data pulled from the registry */
  moduleId: ModuleId;
  /** Optional override for the KPI list (for pages that fetch real data) */
  kpis?: { label: string; value: string }[];
}

/**
 * Renders a responsive grid of KPI cards for a module.
 *
 * By default it reads from MODULE_REGISTRY, but you can
 * pass `kpis` to override with live data.
 */
export default function ModuleKpiGrid({ moduleId, kpis }: ModuleKpiGridProps) {
  const mod = MODULE_REGISTRY[moduleId];
  const data = kpis ?? mod?.kpis ?? [];
  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {kpi.label}
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  );
}
