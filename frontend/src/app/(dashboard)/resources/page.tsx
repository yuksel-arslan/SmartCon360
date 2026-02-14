'use client';

import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import { ModulePageHeader } from '@/components/modules';
import { MODULE_REGISTRY } from '@/lib/modules';
import { Users, TrendingUp, ArrowRight } from 'lucide-react';

const crews = [
  { trade: 'Structure', workers: 24, status: 'active', utilization: 92, color: '#3B82F6' },
  { trade: 'MEP Rough', workers: 18, status: 'active', utilization: 85, color: '#8B5CF6' },
  { trade: 'Drywall', workers: 12, status: 'active', utilization: 78, color: '#F59E0B' },
  { trade: 'MEP Finish', workers: 14, status: 'standby', utilization: 0, color: '#06B6D4' },
  { trade: 'Flooring', workers: 8, status: 'standby', utilization: 0, color: '#10B981' },
  { trade: 'Paint', workers: 10, status: 'standby', utilization: 0, color: '#EC4899' },
  { trade: 'Finishes', workers: 6, status: 'standby', utilization: 0, color: '#F97316' },
];

const subModules = ['workmanship', 'material', 'equipment', 'scaffoldings'] as const;

export default function ResourcesPage() {
  const totalWorkers = crews.reduce((s, c) => s + c.workers, 0);
  const activeWorkers = crews.filter(c => c.status === 'active').reduce((s, c) => s + c.workers, 0);

  return (
    <>
      <TopBar title="ResourceFlow" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
        <ModulePageHeader moduleId="resources" />

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Workers', value: totalWorkers, icon: Users, color: 'var(--color-accent)' },
            { label: 'Active', value: activeWorkers, icon: TrendingUp, color: 'var(--color-success)' },
            { label: 'Equipment', value: '42', icon: MODULE_REGISTRY.equipment.icon, color: 'var(--color-warning)' },
            { label: 'Scaffolds', value: '18', icon: MODULE_REGISTRY.scaffoldings.icon, color: 'var(--color-purple)' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-normal uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                  <div className="text-3xl font-medium mt-1" style={{ fontFamily: 'var(--font-display)', color: kpi.color }}>{kpi.value}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sub-module cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subModules.map((id) => {
            const mod = MODULE_REGISTRY[id];
            return (
              <Link
                key={id}
                href={mod.href}
                className="rounded-xl border p-5 flex items-start gap-4 transition-colors group"
                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = mod.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${mod.color}18` }}>
                  <mod.icon size={20} style={{ color: mod.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{mod.label}</span>
                    <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{mod.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mod.features.slice(0, 4).map((f) => (
                      <span key={f} className="text-[9px] font-normal px-2 py-0.5 rounded-md" style={{ background: `${mod.color}12`, color: mod.color }}>{f}</span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Crew overview table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            <span className="text-[11px] font-normal uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Crew Overview</span>
            <Link href="/resources/workmanship" className="text-[11px] font-normal" style={{ color: 'var(--color-accent)' }}>View All</Link>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Trade', 'Workers', 'Status', 'Utilization'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
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
                      <span className="text-xs font-normal" style={{ color: 'var(--color-text)' }}>{crew.trade}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{crew.workers}</td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-md" style={{
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
                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{crew.utilization}%</span>
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
      </div>
    </>
  );
}
