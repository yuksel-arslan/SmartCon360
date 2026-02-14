'use client';

import { HardHat } from 'lucide-react';

export default function SafetyPage() {
  const kpis = [
    { label: 'LTIR', value: '0.42' },
    { label: 'Days Without Incident', value: '28' },
    { label: 'Open PTWs', value: '5' },
    { label: 'Toolbox Talks', value: '142' },
  ];

  const features = [
    'Risk Matrix',
    'Incident Reporting',
    'Permit to Work',
    'JSA',
    'Toolbox Talks',
    'Safety Observations',
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            SafeZone
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Occupational health and safety management
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
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

      {/* Coming Soon */}
      <div
        className="rounded-xl border p-12 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <HardHat size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
        <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
          SafeZone Module
        </h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
          Comprehensive OHS management with risk matrix, incident reporting, permit-to-work workflows, and safety observation tracking across all project zones.
        </p>
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {features.map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
