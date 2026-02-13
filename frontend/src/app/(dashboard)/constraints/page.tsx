'use client';

import TopBar from '@/components/layout/TopBar';
import { DEMO_CONSTRAINTS } from '@/lib/mockData';
import { AlertTriangle, Clock, CheckCircle2, Filter } from 'lucide-react';
import { useState } from 'react';

const priorityColors: Record<string, string> = {
  critical: 'var(--color-danger)', high: 'var(--color-warning)', medium: 'var(--color-accent)', low: 'var(--color-text-muted)',
};

const statusIcons: Record<string, typeof AlertTriangle> = {
  open: AlertTriangle, in_progress: Clock, resolved: CheckCircle2,
};

const categoryLabels: Record<string, string> = {
  material: 'Material', labor: 'Labor', design: 'Design', predecessor: 'Predecessor',
  equipment: 'Equipment', space: 'Space', permit: 'Permit', information: 'Information',
};

export default function ConstraintsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const filtered = filterStatus === 'all' ? DEMO_CONSTRAINTS : DEMO_CONSTRAINTS.filter((c) => c.status === filterStatus);

  return (
    <>
      <TopBar title="Constraints" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: DEMO_CONSTRAINTS.length, color: 'var(--color-text)' },
            { label: 'Open', value: DEMO_CONSTRAINTS.filter(c => c.status === 'open').length, color: 'var(--color-danger)' },
            { label: 'In Progress', value: DEMO_CONSTRAINTS.filter(c => c.status === 'in_progress').length, color: 'var(--color-warning)' },
            { label: 'CRR', value: '78%', color: 'var(--color-success)' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-3 flex items-center gap-2" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          {['all', 'open', 'in_progress'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
              style={{ background: filterStatus === s ? 'var(--color-accent)' : 'transparent', color: filterStatus === s ? 'white' : 'var(--color-text-secondary)' }}>
              {s === 'all' ? 'All' : s === 'open' ? 'Open' : 'In Progress'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((c) => {
            const Icon = statusIcons[c.status] || AlertTriangle;
            return (
              <div key={c.id} className="rounded-xl border p-4 flex items-start gap-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${priorityColors[c.priority]}15` }}>
                  <Icon size={16} style={{ color: priorityColors[c.priority] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.title}</h4>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: `${priorityColors[c.priority]}15`, color: priorityColors[c.priority] }}>{c.priority}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="px-2 py-0.5 rounded-md" style={{ background: 'var(--color-bg-input)' }}>{categoryLabels[c.category]}</span>
                    <span>{c.trade}</span>
                    <span>{c.zone}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>Due: {c.dueDate}</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-md flex-shrink-0"
                  style={{ background: c.status === 'open' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: c.status === 'open' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                  {c.status === 'open' ? 'Open' : 'In Progress'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
