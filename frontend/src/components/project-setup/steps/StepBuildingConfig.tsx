'use client';

import type { SetupStepProps } from '../types';
import {
  STRUCTURAL_SYSTEMS,
  MEP_COMPLEXITY_LEVELS,
  FLOW_DIRECTIONS,
  DELIVERY_METHODS,
  SITE_CONDITIONS,
  calculateRecommendedTakt,
  calculateRecommendedBuffer,
} from '../types';
import { Layers, Minus, Plus, Building, Zap, ArrowUpDown, FileText, MapPin, Calculator, Grid3x3 } from 'lucide-react';

export default function StepBuildingConfig({ state, onStateChange }: SetupStepProps) {
  const floorCount = state.floorCount || 0;
  const basementCount = state.basementCount || 0;
  const zonesPerFloor = state.zonesPerFloor || 3;
  const structuralZonesPerFloor = state.structuralZonesPerFloor || 1;
  const typicalFloorArea = state.typicalFloorArea || 0;
  const isInfra = state.buildingType === 'infrastructure';

  type AdjustableField = 'floorCount' | 'basementCount' | 'zonesPerFloor' | 'structuralZonesPerFloor' | 'numberOfBuildings';

  const adjustValue = (field: AdjustableField, delta: number) => {
    const current = field === 'floorCount' ? floorCount
      : field === 'basementCount' ? basementCount
      : field === 'numberOfBuildings' ? (state.numberOfBuildings || 1)
      : field === 'structuralZonesPerFloor' ? structuralZonesPerFloor
      : zonesPerFloor;
    const min = (field === 'zonesPerFloor' || field === 'structuralZonesPerFloor') ? 1 : field === 'numberOfBuildings' ? 1 : 0;
    const max = field === 'floorCount' ? 200 : field === 'basementCount' ? 10 : field === 'numberOfBuildings' ? 20 : 8;
    const next = Math.max(min, Math.min(max, current + delta));
    onStateChange({ [field]: next });
  };

  // Calculate takt recommendation preview
  const taktRec = calculateRecommendedTakt(state);
  const bufferRec = calculateRecommendedBuffer(state);
  const finishingZoneArea = typicalFloorArea > 0 && zonesPerFloor > 0 ? Math.round(typicalFloorArea / zonesPerFloor) : 0;
  const structuralZoneArea = typicalFloorArea > 0 && structuralZonesPerFloor > 0 ? Math.round(typicalFloorArea / structuralZonesPerFloor) : 0;
  const totalFloors = floorCount + basementCount;
  const totalStructuralZones = isInfra ? 0 : totalFloors * structuralZonesPerFloor;
  const totalFinishingZones = isInfra ? 0 : totalFloors * zonesPerFloor;
  const gfa = typicalFloorArea > 0 ? typicalFloorArea * totalFloors : 0;

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Building Configuration
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Define the physical characteristics of your project. These parameters drive the LBS generation, takt time calculation, and trade sequencing.
      </p>

      {/* ── Section 1: Floor Configuration ── */}
      {!isInfra && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} style={{ color: 'var(--color-cyan)' }} />
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
              Floor Configuration
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Above ground floors */}
            <NumberStepper
              label="Above Ground"
              value={floorCount}
              min={0} max={200}
              onChange={(v) => onStateChange({ floorCount: v })}
              onStep={(d) => adjustValue('floorCount', d)}
            />
            {/* Basements */}
            <NumberStepper
              label="Basements"
              value={basementCount}
              min={0} max={10}
              onChange={(v) => onStateChange({ basementCount: v })}
              onStep={(d) => adjustValue('basementCount', d)}
            />
            {/* Typical floor area */}
            <div
              className="rounded-lg border p-3"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Floor Area (m²)
              </label>
              <input
                type="number"
                min={0}
                max={50000}
                value={typicalFloorArea || ''}
                placeholder="e.g. 1200"
                onChange={(e) => onStateChange({ typicalFloorArea: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full h-8 text-center text-[14px] font-semibold rounded-lg border"
                style={{
                  background: 'var(--color-bg-input)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          </div>

          {/* ── Zone Configuration: Kaba İnşaat vs İnce İş ── */}
          <div
            className="mt-4 rounded-xl border p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(16,185,129,0.04))',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Grid3x3 size={14} style={{ color: 'var(--color-purple)' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                Takt Zone Configuration
              </span>
            </div>
            <p className="text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Structural (Kaba İnşaat) uses larger zones (typically full floor), while finishing (İnce İş) uses finer subdivisions per floor.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Structural zones (Kaba İnşaat) */}
              <div
                className="rounded-lg border p-3"
                style={{ background: 'var(--color-bg-card)', borderColor: 'rgba(99,102,241,0.3)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#6366F1' }} />
                  <label className="text-[10px] font-semibold uppercase" style={{ color: '#6366F1' }}>
                    Kaba İnşaat (Structural)
                  </label>
                </div>
                <NumberStepper
                  label="Zones / Floor"
                  value={structuralZonesPerFloor}
                  min={1} max={4}
                  onChange={(v) => onStateChange({ structuralZonesPerFloor: v })}
                  onStep={(d) => adjustValue('structuralZonesPerFloor', d)}
                />
                {structuralZoneArea > 0 && (
                  <div className="mt-1.5 text-[10px] text-center" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {structuralZoneArea.toLocaleString()} m² / zone
                  </div>
                )}
              </div>

              {/* Finishing zones (İnce İş) */}
              <div
                className="rounded-lg border p-3"
                style={{ background: 'var(--color-bg-card)', borderColor: 'rgba(16,185,129,0.3)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                  <label className="text-[10px] font-semibold uppercase" style={{ color: '#10B981' }}>
                    İnce İş (Finishing)
                  </label>
                </div>
                <NumberStepper
                  label="Zones / Floor"
                  value={zonesPerFloor}
                  min={1} max={8}
                  onChange={(v) => onStateChange({ zonesPerFloor: v })}
                  onStep={(d) => adjustValue('zonesPerFloor', d)}
                />
                {finishingZoneArea > 0 && (
                  <div className="mt-1.5 text-[10px] text-center" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {finishingZoneArea.toLocaleString()} m² / zone
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          {floorCount > 0 && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Structural Zones', value: totalStructuralZones, color: '#6366F1' },
                { label: 'Finishing Zones', value: totalFinishingZones, color: '#10B981' },
                { label: 'GFA', value: gfa > 0 ? `${gfa.toLocaleString()} m²` : '—', color: 'var(--color-accent)' },
                { label: 'Total Floors', value: totalFloors, color: 'var(--color-cyan)' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'var(--color-bg-input)' }}
                >
                  <div className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-mono)', color: s.color }}>
                    {s.value}
                  </div>
                  <div className="text-[9px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Infrastructure note */}
      {isInfra && (
        <div
          className="rounded-lg px-4 py-3 text-[12px] mb-8"
          style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--color-purple)' }}
        >
          Infrastructure projects use linear sections instead of floors. Configure sections in the LBS step.
        </div>
      )}

      {/* ── Section 2: Structural System ── */}
      <div className="border-t pt-6 mb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Building size={16} style={{ color: 'var(--color-accent)' }} />
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
            Structural System
          </h3>
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Determines structural trade duration and sequence. Steel is faster to erect, precast is most consistent for takt.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {STRUCTURAL_SYSTEMS.map((sys) => {
            const isActive = state.structuralSystem === sys.value;
            return (
              <button
                key={sys.value}
                onClick={() => onStateChange({ structuralSystem: sys.value })}
                className="text-left rounded-lg border px-3 py-2.5 transition-all hover:scale-[1.01]"
                style={{
                  background: isActive ? 'rgba(232,115,26,0.08)' : 'var(--color-bg-card)',
                  borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                  borderWidth: isActive ? 2 : 1,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{sys.icon}</span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text)' }}
                  >
                    {sys.label}
                  </span>
                  {sys.taktMultiplier !== 1.0 && (
                    <span
                      className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono font-medium"
                      style={{
                        background: sys.taktMultiplier < 1.0 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: sys.taktMultiplier < 1.0 ? 'var(--color-success)' : 'var(--color-warning)',
                      }}
                    >
                      {sys.taktMultiplier < 1.0 ? '' : '+'}{Math.round((sys.taktMultiplier - 1) * 100)}%
                    </span>
                  )}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {sys.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: MEP Complexity ── */}
      <div className="border-t pt-6 mb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} style={{ color: '#F59E0B' }} />
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
            MEP Complexity
          </h3>
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
          The single biggest takt time multiplier. Hospital/data center MEP can add 30-50% to takt duration.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MEP_COMPLEXITY_LEVELS.map((mep) => {
            const isActive = state.mepComplexity === mep.value;
            return (
              <button
                key={mep.value}
                onClick={() => onStateChange({ mepComplexity: mep.value })}
                className="text-left rounded-lg border px-3 py-2.5 transition-all hover:scale-[1.01]"
                style={{
                  background: isActive ? `${mep.color}12` : 'var(--color-bg-card)',
                  borderColor: isActive ? mep.color : 'var(--color-border)',
                  borderWidth: isActive ? 2 : 1,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: isActive ? mep.color : 'var(--color-text)' }}
                  >
                    {mep.label}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium"
                    style={{
                      background: `${mep.color}18`,
                      color: mep.color,
                    }}
                  >
                    ×{mep.taktMultiplier}
                  </span>
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {mep.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 4: Flow Direction + Delivery + Site (compact row) ── */}
      <div className="border-t pt-6 mb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Flow Direction */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUpDown size={14} style={{ color: 'var(--color-cyan)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                Flow Direction
              </span>
            </div>
            <div className="space-y-1.5">
              {FLOW_DIRECTIONS.map((fd) => {
                const isActive = state.flowDirection === fd.value;
                return (
                  <button
                    key={fd.value}
                    onClick={() => onStateChange({ flowDirection: fd.value })}
                    className="w-full text-left rounded-lg border px-3 py-2 transition-all text-[11px]"
                    style={{
                      background: isActive ? 'rgba(6,182,212,0.08)' : 'var(--color-bg-card)',
                      borderColor: isActive ? 'var(--color-cyan)' : 'var(--color-border)',
                      borderWidth: isActive ? 2 : 1,
                      color: isActive ? 'var(--color-cyan)' : 'var(--color-text)',
                    }}
                  >
                    <strong>{fd.label}</strong>
                    <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {fd.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery Method */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={14} style={{ color: 'var(--color-purple)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                Delivery Method
              </span>
            </div>
            <select
              value={state.deliveryMethod || ''}
              onChange={(e) => onStateChange({ deliveryMethod: e.target.value })}
              className="w-full h-9 rounded-lg border px-3 text-[11px] font-medium"
              style={{
                background: 'var(--color-bg-input)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select...</option>
              {DELIVERY_METHODS.map((dm) => (
                <option key={dm.value} value={dm.value}>{dm.label}</option>
              ))}
            </select>
            {state.deliveryMethod && (
              <div className="mt-1.5 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                {DELIVERY_METHODS.find((d) => d.value === state.deliveryMethod)?.description}
              </div>
            )}
          </div>

          {/* Site Conditions */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin size={14} style={{ color: 'var(--color-warning)' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                Site Conditions
              </span>
            </div>
            <div className="space-y-1.5">
              {SITE_CONDITIONS.map((sc) => {
                const isActive = state.siteCondition === sc.value;
                return (
                  <button
                    key={sc.value}
                    onClick={() => onStateChange({ siteCondition: sc.value })}
                    className="w-full text-left rounded-lg border px-3 py-1.5 transition-all text-[11px]"
                    style={{
                      background: isActive ? 'rgba(245,158,11,0.08)' : 'var(--color-bg-card)',
                      borderColor: isActive ? 'var(--color-warning)' : 'var(--color-border)',
                      borderWidth: isActive ? 2 : 1,
                      color: isActive ? 'var(--color-warning)' : 'var(--color-text)',
                    }}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Takt Recommendation Preview ── */}
      {state.structuralSystem && state.mepComplexity && (
        <div
          className="rounded-xl border p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(232,115,26,0.04), rgba(139,92,246,0.04))',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
              AI Takt Recommendation
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
                {taktRec.recommended}
              </div>
              <div className="text-[9px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Recommended Takt (days)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}>
                {taktRec.range[0]}–{taktRec.range[1]}
              </div>
              <div className="text-[9px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Optimal Range (days)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-purple)' }}>
                {bufferRec}
              </div>
              <div className="text-[9px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Recommended Buffer
              </div>
            </div>
          </div>
          <div
            className="text-[10px] px-3 py-1.5 rounded"
            style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {taktRec.reasoning}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable number stepper ──

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
  onStep,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onStep: (delta: number) => void;
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <label className="block text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onStep(-1)}
          disabled={value <= min}
          className="w-7 h-7 rounded border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <Minus size={12} />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          className="w-14 h-7 text-center text-[13px] font-semibold rounded border"
          style={{
            background: 'var(--color-bg-input)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-mono)',
          }}
        />
        <button
          onClick={() => onStep(1)}
          disabled={value >= max}
          className="w-7 h-7 rounded border flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-30"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
