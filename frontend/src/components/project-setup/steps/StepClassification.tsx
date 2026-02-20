'use client';

import type { SetupStepProps, WbsStandard } from '../types';
import { BUILDING_TYPES } from '../types';
import { Globe2, Building2, Layers, Minus, Plus } from 'lucide-react';

const WBS_STANDARDS: (WbsStandard & { icon: string })[] = [
  { value: 'uniclass', label: 'Uniclass 2015', description: 'UK NBS standard — Elements/Functions classification. Widely used internationally.', region: 'UK / International', icon: '🇬🇧' },
  { value: 'omniclass', label: 'OmniClass', description: 'International construction classification — Table 33 Disciplines (251 items). Used across North America and globally.', region: 'International', icon: '🌍' },
  { value: 'custom', label: 'Custom', description: 'Create your own WBS structure manually without a predefined standard.', region: 'Any', icon: '✏️' },
];

export default function StepClassification({ state, onStateChange }: SetupStepProps) {
  const selected = state.classificationStandard;
  const selectedBuildingType = state.buildingType || state.projectType || '';
  const floorCount = state.floorCount || 0;
  const basementCount = state.basementCount || 0;
  const zonesPerFloor = state.zonesPerFloor || 3;

  const handleBuildingTypeChange = (value: string) => {
    const bt = BUILDING_TYPES.find((b) => b.value === value);
    onStateChange({
      buildingType: value,
      projectType: value,
      floorCount: bt?.defaultFloors || 0,
      basementCount: bt?.defaultBasements || 0,
      zonesPerFloor: bt?.defaultZonesPerFloor || 3,
    });
  };

  const adjustValue = (field: 'floorCount' | 'basementCount' | 'zonesPerFloor', delta: number) => {
    const current = field === 'floorCount' ? floorCount : field === 'basementCount' ? basementCount : zonesPerFloor;
    const min = field === 'zonesPerFloor' ? 1 : 0;
    const max = field === 'floorCount' ? 200 : field === 'basementCount' ? 10 : 8;
    const next = Math.max(min, Math.min(max, current + delta));
    onStateChange({ [field]: next });
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
          Select the type of building/facility. This determines the default LBS template, trades, and takt configuration.
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

      {/* ── Section 3: Floor Configuration ── */}
      {selectedBuildingType && selectedBuildingType !== 'infrastructure' && (
        <div className="border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={18} style={{ color: 'var(--color-cyan)' }} />
            <h3
              className="text-lg font-medium"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Floor Configuration
            </h3>
          </div>
          <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Define the number of floors. This will be used to auto-generate the LBS (Location Breakdown Structure).
          </p>

          <div className="grid grid-cols-3 gap-4">
            {/* Floor count */}
            <div
              className="rounded-lg border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Above Ground Floors
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustValue('floorCount', -1)}
                  disabled={floorCount <= 0}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={floorCount}
                  onChange={(e) => onStateChange({ floorCount: Math.max(0, Math.min(200, parseInt(e.target.value) || 0)) })}
                  className="w-16 h-8 text-center text-[14px] font-semibold rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  onClick={() => adjustValue('floorCount', 1)}
                  disabled={floorCount >= 200}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Basement count */}
            <div
              className="rounded-lg border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Basement Floors
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustValue('basementCount', -1)}
                  disabled={basementCount <= 0}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={basementCount}
                  onChange={(e) => onStateChange({ basementCount: Math.max(0, Math.min(10, parseInt(e.target.value) || 0)) })}
                  className="w-16 h-8 text-center text-[14px] font-semibold rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  onClick={() => adjustValue('basementCount', 1)}
                  disabled={basementCount >= 10}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Zones per floor */}
            <div
              className="rounded-lg border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Zones per Floor
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustValue('zonesPerFloor', -1)}
                  disabled={zonesPerFloor <= 1}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={zonesPerFloor}
                  onChange={(e) => onStateChange({ zonesPerFloor: Math.max(1, Math.min(8, parseInt(e.target.value) || 1)) })}
                  className="w-16 h-8 text-center text-[14px] font-semibold rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  onClick={() => adjustValue('zonesPerFloor', 1)}
                  disabled={zonesPerFloor >= 8}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          {floorCount > 0 && (
            <div
              className="mt-4 rounded-lg px-4 py-3 text-[12px]"
              style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--color-success)' }}
            >
              LBS will be generated with <strong>{basementCount > 0 ? `${basementCount} basement + ` : ''}{floorCount} floor{floorCount !== 1 ? 's' : ''}</strong> and{' '}
              <strong>{zonesPerFloor} zone{zonesPerFloor !== 1 ? 's' : ''} per floor</strong>{' '}
              = <strong>{(floorCount + basementCount) * zonesPerFloor} total takt zones</strong>
            </div>
          )}
        </div>
      )}

      {/* Infrastructure note */}
      {selectedBuildingType === 'infrastructure' && (
        <div
          className="border-t pt-6 mt-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="rounded-lg px-4 py-3 text-[12px]"
            style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--color-purple)' }}
          >
            Infrastructure projects use linear sections instead of floors. Configure sections in the LBS step.
          </div>
        </div>
      )}
    </div>
  );
}
