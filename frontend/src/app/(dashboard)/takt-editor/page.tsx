'use client';

import TopBar from '@/components/layout/TopBar';
import { DEMO_TAKT_GRID, DEMO_ZONES, DEMO_TRADES } from '@/lib/mockData';
import { CheckCircle, Clock, CalendarDays } from 'lucide-react';

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'rgba(16,185,129,0.15)', text: 'var(--color-success)', label: 'Done' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', text: 'var(--color-accent)', label: 'Active' },
  planned: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)', label: 'Planned' },
};

export default function TaktEditorPage() {
  return (
    <>
      <TopBar title="Takt Editor" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="rounded-xl border p-4 flex items-center justify-between" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>Hotel Sapphire — Takt Grid</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{DEMO_TRADES.length} trades &middot; {DEMO_ZONES.length} zones &middot; Takt time: 5 days</p>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(statusStyles).map(([key, s]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: s.bg, border: `1px solid ${s.text}` }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>Trade</th>
                  {DEMO_ZONES.map((zone) => (
                    <th key={zone.id} className="text-center text-[10px] font-semibold uppercase tracking-wide px-3 py-3 border-b border-l" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                      {zone.name.split(' — ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_TAKT_GRID.map((row) => (
                  <tr key={row.trade}>
                    <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: row.color }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{row.trade}</span>
                      </div>
                    </td>
                    {row.zones.map((cell, i) => {
                      const style = statusStyles[cell.status];
                      return (
                        <td key={i} className="px-3 py-3 border-b border-l text-center" style={{ borderColor: 'var(--color-border)' }}>
                          <div className="rounded-lg px-2 py-2 mx-auto max-w-[80px]" style={{ background: style.bg }}>
                            <div className="flex items-center justify-center gap-1 mb-0.5">
                              {cell.status === 'completed' ? <CheckCircle size={10} style={{ color: style.text }} /> :
                               cell.status === 'in_progress' ? <Clock size={10} style={{ color: style.text }} /> :
                               <CalendarDays size={10} style={{ color: style.text }} />}
                            </div>
                            <div className="text-[10px] font-bold" style={{ color: style.text, fontFamily: 'var(--font-mono)' }}>{cell.startDate}</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Completed Cells', value: DEMO_TAKT_GRID.reduce((sum, r) => sum + r.zones.filter(z => z.status === 'completed').length, 0), total: DEMO_TAKT_GRID.length * DEMO_ZONES.length, color: 'var(--color-success)' },
            { label: 'In Progress', value: DEMO_TAKT_GRID.reduce((sum, r) => sum + r.zones.filter(z => z.status === 'in_progress').length, 0), total: DEMO_TAKT_GRID.length * DEMO_ZONES.length, color: 'var(--color-accent)' },
            { label: 'Planned', value: DEMO_TAKT_GRID.reduce((sum, r) => sum + r.zones.filter(z => z.status === 'planned').length, 0), total: DEMO_TAKT_GRID.length * DEMO_ZONES.length, color: 'var(--color-text-muted)' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-[10px] uppercase font-semibold tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>{stat.value}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/ {stat.total}</span>
              </div>
              <div className="h-1.5 rounded-full mt-2 w-full" style={{ background: 'var(--color-bg-input)' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${(stat.value / stat.total) * 100}%`, background: stat.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
