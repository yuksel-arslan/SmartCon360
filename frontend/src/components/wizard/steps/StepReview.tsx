'use client';

import {
  Building2, Calendar, MapPin, Users, Clock, ArrowRight, Lightbulb,
} from 'lucide-react';
import { getTemplate } from '@/lib/core/project-templates';
import type { StepProps } from '../types';

export default function StepReview({ data }: StepProps) {
  const template = getTemplate(data.projectType);
  const enabledTrades = data.trades.filter((t) => t.enabled);
  const zoneCount = countZones(data.locations);

  return (
    <div>
      <h2
        className="text-xl font-extrabold mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Review & Create
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Review your project setup before creating. You can always edit these settings later.
      </p>

      <div className="space-y-4">
        {/* Project header */}
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">{template?.icon || '📋'}</div>
            <div className="flex-1">
              <div className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                {data.name || 'Untitled Project'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}
                >
                  {data.code || '—'}
                </span>
                <span className="text-[11px] capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                  {template?.label || data.projectType}
                </span>
              </div>
              {data.description && (
                <p className="text-[12px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {data.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: MapPin, label: 'Location', value: [data.city, data.country].filter(Boolean).join(', ') || '—' },
            { icon: Calendar, label: 'Start', value: data.plannedStart || '—' },
            { icon: Calendar, label: 'Finish', value: data.plannedFinish || '—' },
            { icon: Building2, label: 'Budget', value: data.budget ? `${Number(data.budget).toLocaleString()} ${data.currency}` : '—' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border p-3"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <item.icon size={14} style={{ color: 'var(--color-text-muted)' }} />
              <div className="text-[10px] uppercase font-semibold mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {item.label}
              </div>
              <div className="text-[12px] font-medium mt-0.5" style={{ color: 'var(--color-text)', fontFamily: item.label === 'Budget' ? 'var(--font-mono)' : undefined }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Takt summary */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text)' }}>Takt Plan Summary</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Takt Time', value: `${data.defaultTaktTime} days`, color: 'var(--color-accent)' },
              { label: 'Buffer', value: `${data.bufferSize} takt(s)`, color: 'var(--color-purple)' },
              { label: 'Zones', value: `${zoneCount}`, color: 'var(--color-success)' },
              { label: 'Working Days', value: data.workingDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', '), color: 'var(--color-warning)' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {s.label}
                </div>
                <div className="text-sm font-bold mt-0.5" style={{ color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade sequence */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} style={{ color: 'var(--color-purple)' }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--color-text)' }}>
              Trade Sequence ({enabledTrades.length} trades)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {enabledTrades.map((trade, i) => (
              <div key={trade.code} className="flex items-center gap-1.5">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                  style={{ background: `${trade.color}18` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: trade.color }} />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--color-text)' }}>
                    {trade.name}
                  </span>
                </div>
                {i < enabledTrades.length - 1 && (
                  <ArrowRight size={12} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        {template && template.tips.length > 0 && (
          <div
            className="rounded-xl border p-4"
            style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} style={{ color: 'var(--color-warning)' }} />
              <span className="text-[12px] font-bold" style={{ color: 'var(--color-warning)' }}>
                Expert Tips
              </span>
            </div>
            <ul className="space-y-1">
              {template.tips.map((tip, i) => (
                <li key={i} className="text-[11px] leading-relaxed flex gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-warning)' }}>•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
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
