'use client';

import { getAllTemplateTypes } from '@/lib/core/project-templates';
import type { StepProps } from '../types';

const templates = getAllTemplateTypes();

export default function StepProjectType({ data, onChange }: StepProps) {
  return (
    <div>
      <h2
        className="text-xl font-extrabold mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        What are you building?
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Select your project type. We'll load a template with locations, trades, and takt recommendations.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {templates.map((t) => {
          const selected = data.projectType === t.type;
          return (
            <button
              key={t.type}
              onClick={() => onChange({ projectType: t.type })}
              className="text-left rounded-xl border p-4 transition-all hover:scale-[1.02]"
              style={{
                background: selected ? 'rgba(59,130,246,0.1)' : 'var(--color-bg-card)',
                borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                borderWidth: selected ? 2 : 1,
              }}
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div
                className="text-sm font-bold mb-0.5"
                style={{ color: selected ? 'var(--color-accent)' : 'var(--color-text)' }}
              >
                {t.label}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {t.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
