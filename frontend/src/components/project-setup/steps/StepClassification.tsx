'use client';

import type { SetupStepProps, WbsStandard } from '../types';
import { BUILDING_TYPES, PROJECT_PHASES } from '../types';
import { Globe2, Building2, Hammer } from 'lucide-react';

const WBS_STANDARDS: (WbsStandard & { icon: string })[] = [
  { value: 'uniclass', label: 'Uniclass 2015', description: 'UK NBS standard — Elements/Functions classification. Widely used internationally.', region: 'UK / International', icon: '🇬🇧' },
  { value: 'omniclass', label: 'OmniClass', description: 'International construction classification — Table 33 Disciplines (251 items). Used across North America and globally.', region: 'International', icon: '🌍' },
  { value: 'custom', label: 'Custom', description: 'Create your own WBS structure manually without a predefined standard.', region: 'Any', icon: '✏️' },
];

export default function StepClassification({ state, onStateChange }: SetupStepProps) {
  const selected = state.classificationStandard;
  const selectedBuildingType = state.buildingType || state.projectType || '';
  const selectedPhase = state.projectPhase || '';

  const handleBuildingTypeChange = (value: string) => {
    const bt = BUILDING_TYPES.find((b) => b.value === value);
    const updates: Partial<typeof state> = {
      buildingType: value,
      projectType: value,
      // Pre-populate scope defaults from building type
      floorCount: bt?.defaultFloors || 0,
      basementCount: bt?.defaultBasements || 0,
      zonesPerFloor: bt?.defaultZonesPerFloor || 3,
      structuralZonesPerFloor: bt?.defaultStructuralZonesPerFloor || 1,
      typicalFloorArea: bt?.defaultFloorArea || 0,
      structuralSystem: bt?.defaultStructural || '',
      mepComplexity: bt?.defaultMep || '',
      flowDirection: bt?.defaultFlowDirection || 'bottom_up',
    };
    // Auto-default project phase to 'new_build' if not yet selected
    if (!state.projectPhase) {
      updates.projectPhase = 'new_build';
    }
    onStateChange(updates);
  };

  return (
    <div>
      {/* ── Section 1: Classification Standard ── */}
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Classification Standard
      </h2>
      <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
        Select the WBS/CBS standard for your project. This determines how work items, costs, and trades are organized.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {WBS_STANDARDS.map((std) => {
          const isSelected = selected === std.value;
          return (
            <button
              key={std.value}
              onClick={() => onStateChange({ classificationStandard: std.value })}
              className="text-left rounded-xl border p-4 transition-all hover:scale-[1.01]"
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

      {/* ── Section 2: Building Type ── */}
      <div className="border-t pt-6 mb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} style={{ color: 'var(--color-accent)' }} />
          <h3
            className="text-lg font-medium"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Building Type
          </h3>
        </div>
        <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Select the type of building/facility. This auto-configures structural system, MEP complexity, floor counts, and takt defaults.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {BUILDING_TYPES.map((bt) => {
            const isActive = selectedBuildingType === bt.value;
            return (
              <button
                key={bt.value}
                onClick={() => handleBuildingTypeChange(bt.value)}
                className="text-left rounded-lg border px-3 py-3 transition-all hover:scale-[1.01]"
                style={{
                  background: isActive ? 'rgba(232,115,26,0.08)' : 'var(--color-bg-card)',
                  borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                  borderWidth: isActive ? 2 : 1,
                }}
              >
                <div className="text-xl mb-1">{bt.icon}</div>
                <div
                  className="text-[12px] font-semibold mb-0.5"
                  style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text)' }}
                >
                  {bt.label}
                </div>
                <div className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {bt.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Project Phase ── */}
      <div className="border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Hammer size={18} style={{ color: 'var(--color-purple)' }} />
          <h3
            className="text-lg font-medium"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Project Phase
          </h3>
        </div>
        <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
          The project phase fundamentally affects the takt planning approach, trade sequence, and buffer strategy.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PROJECT_PHASES.map((phase) => {
            const isActive = selectedPhase === phase.value;
            return (
              <button
                key={phase.value}
                onClick={() => onStateChange({ projectPhase: phase.value })}
                className="text-left rounded-lg border px-3 py-3 transition-all hover:scale-[1.01]"
                style={{
                  background: isActive ? 'rgba(139,92,246,0.08)' : 'var(--color-bg-card)',
                  borderColor: isActive ? 'var(--color-purple)' : 'var(--color-border)',
                  borderWidth: isActive ? 2 : 1,
                }}
              >
                <div className="text-xl mb-1">{phase.icon}</div>
                <div
                  className="text-[12px] font-semibold mb-0.5"
                  style={{ color: isActive ? 'var(--color-purple)' : 'var(--color-text)' }}
                >
                  {phase.label}
                </div>
                <div className="text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {phase.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
