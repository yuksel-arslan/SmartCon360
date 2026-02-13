'use client';

import TopBar from '@/components/layout/TopBar';
import { ClipboardCheck, TrendingUp, Calendar, Target } from 'lucide-react';

export default function LPSPage() {
  return (
    <>
      <TopBar title="Last Planner" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'PPC This Week', value: '93%', icon: Target, color: 'var(--color-success)' },
            { label: 'Commitments', value: '28', icon: ClipboardCheck, color: 'var(--color-accent)' },
            { label: 'Completed', value: '26', icon: TrendingUp, color: 'var(--color-success)' },
            { label: 'Lookahead Items', value: '47', icon: Calendar, color: 'var(--color-purple)' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                  <div className="text-3xl font-extrabold mt-1" style={{ fontFamily: 'var(--font-display)', color: kpi.color }}>{kpi.value}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Work Plan */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Weekly Work Plan</h3>
          <div className="space-y-2">
            {[
              { trade: 'Structure', task: 'Pour concrete Zone D columns', status: 'completed', color: '#3B82F6' },
              { trade: 'Structure', task: 'Formwork Zone E slab', status: 'completed', color: '#3B82F6' },
              { trade: 'MEP Rough', task: 'HVAC duct Zone B', status: 'completed', color: '#8B5CF6' },
              { trade: 'MEP Rough', task: 'Fire sprinkler Zone C', status: 'in_progress', color: '#8B5CF6' },
              { trade: 'Drywall', task: 'Metal framing Zone A corridors', status: 'in_progress', color: '#F59E0B' },
              { trade: 'Drywall', task: 'Board installation Zone A rooms', status: 'planned', color: '#F59E0B' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-input)' }}>
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs font-semibold w-24 flex-shrink-0" style={{ color: 'var(--color-text)' }}>{item.trade}</span>
                <span className="text-xs flex-1" style={{ color: 'var(--color-text-secondary)' }}>{item.task}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{
                  background: item.status === 'completed' ? 'rgba(16,185,129,0.12)' : item.status === 'in_progress' ? 'rgba(59,130,246,0.12)' : 'var(--color-bg-secondary)',
                  color: item.status === 'completed' ? 'var(--color-success)' : item.status === 'in_progress' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}>
                  {item.status === 'completed' ? 'Done' : item.status === 'in_progress' ? 'Active' : 'Planned'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PPC Trend (placeholder bar chart) */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>PPC Trend (Last 8 Weeks)</h3>
          <div className="flex items-end gap-2 h-32">
            {[78, 82, 80, 85, 88, 86, 91, 93].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold" style={{ color: val >= 85 ? 'var(--color-success)' : 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>{val}%</span>
                <div className="w-full rounded-t-md transition-all" style={{
                  height: `${(val / 100) * 100}%`,
                  background: val >= 85 ? 'var(--color-success)' : 'var(--color-warning)',
                  opacity: 0.7 + (i * 0.04),
                }} />
                <span className="text-[8px]" style={{ color: 'var(--color-text-muted)' }}>W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
