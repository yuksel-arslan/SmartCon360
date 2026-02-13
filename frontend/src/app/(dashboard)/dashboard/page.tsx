'use client';

import TopBar from '@/components/layout/TopBar';
import { Activity, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

const kpis = [
  { label: 'PPC', value: '93%', sub: '▲ 5% from last week', color: 'var(--color-success)', icon: CheckCircle },
  { label: 'Takt Progress', value: 'T5', sub: 'of 11 periods', color: 'var(--color-accent)', icon: Activity },
  { label: 'Open Constraints', value: '3', sub: '1 critical', color: 'var(--color-danger)', icon: AlertTriangle },
  { label: 'AI Score', value: '87', sub: 'Project health index', color: 'var(--color-purple)', icon: Zap },
];

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                    {kpi.label}
                  </div>
                  <div
                    className="text-3xl font-extrabold mt-1"
                    style={{ fontFamily: 'var(--font-display)', color: kpi.color }}
                  >
                    {kpi.value}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{kpi.sub}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Flowline placeholder */}
          <div
            className="col-span-2 rounded-xl border p-5 min-h-[300px]"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-sm font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Flowline Chart</h3>
            <div className="flex items-center justify-center h-48 rounded-lg" style={{ background: 'var(--color-bg-input)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Flowline visualization renders here</span>
            </div>
          </div>

          {/* AI Concierge placeholder */}
          <div
            className="rounded-xl border flex flex-col min-h-[300px]"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
              >
                <Zap size={14} className="text-white" />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>AI Concierge</div>
                <div className="text-[9px] flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: 'var(--color-success)' }} /> Online
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ask anything about your project...</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
