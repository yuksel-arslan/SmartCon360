'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import FlowlineChart from '@/components/charts/FlowlineChart';
import { DEMO_FLOWLINE, DEMO_ZONES, DEMO_TODAY_X, DEMO_TOTAL_PERIODS } from '@/lib/mockData';
import { Eye, EyeOff, ZoomIn, ZoomOut, Download, Maximize2, Filter } from 'lucide-react';

export default function FlowlinePage() {
  const [visibleTrades, setVisibleTrades] = useState<Set<string>>(
    new Set(DEMO_FLOWLINE.map((w) => w.trade_name))
  );
  const [chartHeight, setChartHeight] = useState(500);

  const toggleTrade = (tradeName: string) => {
    setVisibleTrades((prev) => {
      const next = new Set(prev);
      if (next.has(tradeName)) next.delete(tradeName);
      else next.add(tradeName);
      return next;
    });
  };

  const filteredWagons = DEMO_FLOWLINE.filter((w) => visibleTrades.has(w.trade_name));

  return (
    <>
      <TopBar title="Flowline" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Toolbar */}
        <div className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Trades:</span>
            </div>
            {DEMO_FLOWLINE.map((w) => {
              const active = visibleTrades.has(w.trade_name);
              return (
                <button key={w.trade_name} onClick={() => toggleTrade(w.trade_name)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all"
                  style={{ borderColor: active ? w.color : 'var(--color-border)', background: active ? `${w.color}15` : 'transparent', color: active ? w.color : 'var(--color-text-muted)', opacity: active ? 1 : 0.5 }}>
                  {active ? <Eye size={11} /> : <EyeOff size={11} />}
                  {w.trade_name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {[
              { icon: ZoomOut, action: () => setChartHeight(Math.max(300, chartHeight - 100)), title: 'Zoom Out' },
              { icon: ZoomIn, action: () => setChartHeight(Math.min(800, chartHeight + 100)), title: 'Zoom In' },
              { icon: Maximize2, action: () => setChartHeight(500), title: 'Reset' },
              { icon: Download, action: () => {}, title: 'Export' },
            ].map((btn) => (
              <button key={btn.title} onClick={btn.action} title={btn.title}
                className="w-7 h-7 rounded-lg border flex items-center justify-center"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                <btn.icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>Hotel Sapphire — Location-Time Chart</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-accent)' }}>
              {filteredWagons.length} of {DEMO_FLOWLINE.length} trades visible
            </span>
          </div>
          <FlowlineChart wagons={filteredWagons} zones={DEMO_ZONES} todayX={DEMO_TODAY_X} totalPeriods={DEMO_TOTAL_PERIODS} height={chartHeight} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Zones', value: DEMO_ZONES.length, color: 'var(--color-accent)' },
            { label: 'Trades', value: DEMO_FLOWLINE.length, color: 'var(--color-purple)' },
            { label: 'Total Periods', value: DEMO_TOTAL_PERIODS, color: 'var(--color-success)' },
            { label: 'Current Period', value: `T${DEMO_TODAY_X}`, color: 'var(--color-warning)' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
