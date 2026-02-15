'use client';

import {
  Building2, Calendar, MapPin, ArrowRight, Lightbulb,
} from 'lucide-react';
import { getTemplate } from '@/lib/core/project-templates';
import type { StepProps } from '../types';

export default function StepReview({ data }: StepProps) {
  const template = getTemplate(data.projectType);

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Review & Create
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Review your project info. After creation you&apos;ll configure drawings, BOQ, LBS, trades, and takt settings in the Setup Wizard.
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
              <div className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                {data.name || 'Untitled Project'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{ background: 'rgba(232,115,26,0.15)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}
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

        {/* Next steps info */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'rgba(232,115,26,0.06)', borderColor: 'rgba(232,115,26,0.2)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--color-accent)' }}>
              After Creation: Project Setup Wizard
            </span>
          </div>
          <ul className="space-y-1.5 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
              Upload project drawings (PDF, DWG, DXF, RVT, IFC)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
              Import Bill of Quantities (BOQ) from Excel/CSV
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
              Set up Location Breakdown Structure (LBS) with zones
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
              Configure WBS, CBS, discipline trades, and takt plan
            </li>
          </ul>
        </div>

        {/* Tips */}
        {template && template.tips.length > 0 && (
          <div
            className="rounded-xl border p-4"
            style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} style={{ color: 'var(--color-warning)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-warning)' }}>
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
