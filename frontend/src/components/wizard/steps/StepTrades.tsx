'use client';

import { Check, ArrowRight } from 'lucide-react';
import type { StepProps } from '../types';

const categoryLabels: Record<string, string> = {
  structural: 'Structural',
  mep: 'MEP',
  architectural: 'Architectural',
  finishing: 'Finishing',
  specialty: 'Specialty',
};

const categoryColors: Record<string, string> = {
  structural: 'var(--color-accent)',
  mep: 'var(--color-purple)',
  architectural: 'var(--color-cyan)',
  finishing: 'var(--color-success)',
  specialty: 'var(--color-warning)',
};

export default function StepTrades({ data, onChange }: StepProps) {
  const enabledCount = data.trades.filter((t) => t.enabled).length;

  const toggleTrade = (index: number) => {
    const updated = [...data.trades];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onChange({ trades: updated });
  };

  const toggleAll = (enabled: boolean) => {
    onChange({ trades: data.trades.map((t) => ({ ...t, enabled })) });
  };

  // Group by category
  const grouped = data.trades.reduce<Record<string, (typeof data.trades[number] & { originalIndex: number })[]>>(
    (acc, trade, index) => {
      const cat = trade.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ ...trade, originalIndex: index });
      return acc;
    },
    {}
  );

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Trade Sequence
      </h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Toggle trades on/off. Sequence flows top to bottom. Arrows show predecessor dependencies.
      </p>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{enabledCount}</span>
          {' '}of {data.trades.length} trades selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Select All
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Trade list grouped by category */}
      <div
        className="rounded-xl border max-h-[360px] overflow-auto"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        {Object.entries(grouped).map(([category, trades]) => (
          <div key={category}>
            {/* Category header */}
            <div
              className="sticky top-0 z-10 px-4 py-2 text-[10px] uppercase font-medium tracking-wider border-b"
              style={{
                background: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: categoryColors[category] || 'var(--color-text-muted)',
              }}
            >
              {categoryLabels[category] || category}
            </div>

            {/* Trades in category */}
            {trades.map((trade) => (
              <button
                key={trade.code}
                onClick={() => toggleTrade(trade.originalIndex)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b transition-colors hover:opacity-90"
                style={{
                  borderColor: 'var(--color-border)',
                  opacity: trade.enabled ? 1 : 0.5,
                }}
              >
                {/* Checkbox */}
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border"
                  style={{
                    background: trade.enabled ? trade.color : 'transparent',
                    borderColor: trade.enabled ? trade.color : 'var(--color-border)',
                  }}
                >
                  {trade.enabled && <Check size={12} className="text-white" />}
                </div>

                {/* Color swatch */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: trade.color }} />

                {/* Name & code */}
                <div className="flex-1 text-left">
                  <div className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>
                    {trade.name}
                  </div>
                  <div className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{trade.code}</span>
                    <span>·</span>
                    <span>Crew: {trade.defaultCrewSize}</span>
                    {trade.predecessors.length > 0 && (
                      <>
                        <span>·</span>
                        <ArrowRight size={10} />
                        <span>after {trade.predecessors.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}

        {data.trades.length === 0 && (
          <p className="text-[12px] py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            Select a project type first to load trades.
          </p>
        )}
      </div>
    </div>
  );
}
