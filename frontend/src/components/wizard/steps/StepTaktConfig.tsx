'use client';

import { Info } from 'lucide-react';
import { getTemplate } from '@/lib/core/project-templates';
import type { StepProps } from '../types';

const ALL_DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export default function StepTaktConfig({ data, onChange }: StepProps) {
  const template = getTemplate(data.projectType);
  const enabledTrades = data.trades.filter((t) => t.enabled).length;
  const zoneCount = countZones(data.locations);
  const totalTakts = zoneCount + enabledTrades - 1 + (enabledTrades - 1) * data.bufferSize;
  const totalDays = totalTakts * data.defaultTaktTime;
  const calendarDays = Math.ceil(totalDays / data.workingDays.length * 7);

  const toggleDay = (day: string) => {
    const current = data.workingDays;
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    if (updated.length > 0) {
      onChange({ workingDays: updated });
    }
  };

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Takt Configuration
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Set the rhythm of your project. Takt time is the heartbeat — every trade gets the same duration per zone.
      </p>

      <div className="space-y-6">
        {/* Takt Time Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Takt Time
            </label>
            <span className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
              {data.defaultTaktTime} {data.defaultTaktTime === 1 ? 'day' : 'days'}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={14}
            value={data.defaultTaktTime}
            onChange={(e) => onChange({ defaultTaktTime: parseInt(e.target.value) })}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>1 day</span>
            {template && (
              <span style={{ color: 'var(--color-success)' }}>
                Recommended: {template.recommendedTaktRange[0]}-{template.recommendedTaktRange[1]} days
              </span>
            )}
            <span>14 days</span>
          </div>
        </div>

        {/* Buffer Size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Buffer Between Trades
            </label>
            <span className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-purple)' }}>
              {data.bufferSize} {data.bufferSize === 1 ? 'takt' : 'takts'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            value={data.bufferSize}
            onChange={(e) => onChange({ bufferSize: parseInt(e.target.value) })}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>0 (no buffer)</span>
            <span>5 takts</span>
          </div>
        </div>

        {/* Working Days */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Working Days
          </label>
          <div className="flex gap-2">
            {ALL_DAYS.map((day) => {
              const active = data.workingDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className="w-10 h-10 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: active ? 'var(--color-accent)' : 'var(--color-bg-input)',
                    color: active ? '#fff' : 'var(--color-text-muted)',
                    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration Preview */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>
              Duration Estimate
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Zones', value: zoneCount, color: 'var(--color-success)' },
              { label: 'Trades', value: enabledTrades, color: 'var(--color-purple)' },
              { label: 'Working Days', value: totalDays, color: 'var(--color-accent)' },
              { label: 'Calendar Days', value: `~${calendarDays}`, color: 'var(--color-warning)' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-medium" style={{ fontFamily: 'var(--font-display)', color: s.color }}>
                  {s.value}
                </div>
                <div className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function countZones(locations: StepProps['data']['locations']): number {
  let count = 0;
  function walk(items: typeof locations) {
    for (const loc of items) {
      const mult = loc.repeat && loc.repeat > 1 ? loc.repeat : 1;
      if (loc.type === 'zone') count += mult;
      if (loc.children) {
        for (let i = 0; i < mult; i++) walk(loc.children);
      }
    }
  }
  walk(locations);
  return count;
}
