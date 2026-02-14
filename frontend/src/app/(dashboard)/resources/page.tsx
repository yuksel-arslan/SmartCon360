'use client';

import TopBar from '@/components/layout/TopBar';
import { Users, Wrench, Package, TrendingUp } from 'lucide-react';
import { ModulePageHeader } from '@/components/modules';

const crews = [
  { trade: 'Structure', workers: 24, status: 'active', utilization: 92, color: '#3B82F6' },
  { trade: 'MEP Rough', workers: 18, status: 'active', utilization: 85, color: '#8B5CF6' },
  { trade: 'Drywall', workers: 12, status: 'active', utilization: 78, color: '#F59E0B' },
  { trade: 'MEP Finish', workers: 14, status: 'standby', utilization: 0, color: '#06B6D4' },
  { trade: 'Flooring', workers: 8, status: 'standby', utilization: 0, color: '#10B981' },
  { trade: 'Paint', workers: 10, status: 'standby', utilization: 0, color: '#EC4899' },
  { trade: 'Finishes', workers: 6, status: 'standby', utilization: 0, color: '#F97316' },
];

export default function ResourcesPage() {
  const totalWorkers = crews.reduce((s, c) => s + c.workers, 0);
  const activeWorkers = crews.filter(c => c.status === 'active').reduce((s, c) => s + c.workers, 0);

  return (
    <>
      <TopBar title="CrewFlow" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <ModulePageHeader moduleId="resources" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Workers', value: totalWorkers, icon: Users, color: 'var(--color-accent)' },
            { label: 'Active', value: activeWorkers, icon: TrendingUp, color: 'var(--color-success)' },
            { label: 'Equipment', value: '12', icon: Wrench, color: 'var(--color-warning)' },
            { label: 'Material Orders', value: '8', icon: Package, color: 'var(--color-purple)' },
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

        {/* Crew table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <table className="w-full">
            <thead>
              <tr>
                {['Trade', 'Workers', 'Status', 'Utilization'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3 border-b"
                    style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crews.map((crew) => (
                <tr key={crew.trade}>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: crew.color }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{crew.trade}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{crew.workers}</td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{
                      background: crew.status === 'active' ? 'rgba(16,185,129,0.12)' : 'var(--color-bg-input)',
                      color: crew.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)',
                    }}>{crew.status === 'active' ? 'Active' : 'Standby'}</span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {crew.utilization > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full flex-1 max-w-[80px]" style={{ background: 'var(--color-bg-input)' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${crew.utilization}%`, background: crew.utilization > 85 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{crew.utilization}%</span>
                      </div>
                    ) : (
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
