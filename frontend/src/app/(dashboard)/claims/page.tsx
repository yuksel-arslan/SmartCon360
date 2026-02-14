'use client';

import { Scale } from 'lucide-react';

export default function ClaimsPage() {
  const kpis = [
    { label: 'Pending COs', value: '7' },
    { label: 'CO Value', value: '$1.2M' },
    { label: 'Active Claims', value: '3' },
    { label: 'Avg Processing', value: '14 days' },
  ];

  const features = [
    'Change Orders',
    'Claims Register',
    'Delay Analysis',
    'EOT Tracking',
    'Dispute Management',
    'Evidence Linking',
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            ClaimShield
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Claims and change order management
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
        <Scale size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
        <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
          ClaimShield Module
        </h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
          Manage change orders, claims, and delay analysis with comprehensive evidence tracking, entitlement assessment, and dispute escalation workflows.
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
