'use client';

import type { SetupStepProps, WbsStandard } from '../types';
import { FileText, Globe2, Building2 } from 'lucide-react';

const WBS_STANDARDS: (WbsStandard & { icon: string })[] = [
  { value: 'uniclass', label: 'Uniclass 2015', description: 'UK NBS standard — Elements/Functions classification. Widely used internationally.', region: 'UK / International', icon: '🇬🇧' },
  { value: 'masterformat', label: 'MasterFormat 2018', description: 'CSI/CSC — Division-based classification (50 divisions). North American standard.', region: 'US / Canada', icon: '🇺🇸' },
  { value: 'uniformat', label: 'UniFormat II', description: 'ASTM E1557 — System/assembly classification. Used for early cost estimating.', region: 'US / International', icon: '🌐' },
  { value: 'custom', label: 'Custom', description: 'Create your own WBS structure manually without a predefined standard.', region: 'Any', icon: '✏️' },
];

export default function StepClassification({ state, onStateChange, onComplete, authHeaders }: SetupStepProps) {
  const selected = state.classificationStandard;

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Classification Standard
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Select the WBS/CBS standard for your project. This determines how work items, costs, and trades are organized.
        The CBS (Cost Breakdown Structure) will be automatically linked to the selected WBS standard.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {WBS_STANDARDS.map((std) => {
          const isSelected = selected === std.value;
          return (
            <button
              key={std.value}
              onClick={() => onStateChange({ classificationStandard: std.value })}
              className="text-left rounded-xl border p-5 transition-all hover:scale-[1.01]"
              style={{
                background: isSelected ? 'rgba(232,115,26,0.08)' : 'var(--color-bg-card)',
                borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                borderWidth: isSelected ? 2 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{std.icon}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text)' }}
                  >
                    {std.label}
                  </div>
                  <div className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    {std.description}
                  </div>
                  <div
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
                  >
                    <Globe2 size={10} />
                    {std.region}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && selected !== 'custom' && (
        <div
          className="mt-4 rounded-lg px-4 py-3 text-[12px]"
          style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--color-success)' }}
        >
          The system will auto-generate WBS and CBS structures based on <strong>{WBS_STANDARDS.find((s) => s.value === selected)?.label}</strong> for your{' '}
          <strong>{state.projectType}</strong> project.
        </div>
      )}
    </div>
  );
}
