'use client';

import { useState, useEffect, useCallback } from 'react';
import { Info, Loader2, Check, Sparkles } from 'lucide-react';
import { getTemplate } from '@/lib/core/project-templates';
import type { SetupStepProps } from '../types';
import { DEFAULT_WORKING_DAYS, calculateRecommendedTakt, calculateRecommendedBuffer } from '../types';

const ALL_DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export default function StepTaktConfig({ projectId, state, onStateChange, authHeaders }: SetupStepProps) {
  const template = getTemplate(state.buildingType || state.projectType);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(state.taktPlanGenerated);

  // AI takt recommendation based on building config parameters
  const taktRec = calculateRecommendedTakt(state);
  const bufferRec = calculateRecommendedBuffer(state);
  const hasRecommendation = !!(state.structuralSystem && state.mepComplexity);

  // Initialize from state or template defaults
  const defaultTaktTime = state.defaultTaktTime || template?.defaultTaktTime || 5;
  const bufferSize = state.bufferSize ?? (template?.defaultBufferSize ?? 1);
  const workingDays = state.workingDays?.length > 0 ? state.workingDays : [...DEFAULT_WORKING_DAYS];

  const zoneCount = state.zoneCount || 0;
  const tradeCount = state.tradeCount || 0;
  const totalTakts = tradeCount > 0 && zoneCount > 0
    ? zoneCount + tradeCount - 1 + (tradeCount - 1) * bufferSize
    : 0;
  const totalDays = totalTakts * defaultTaktTime;
  const calendarDays = workingDays.length > 0
    ? Math.ceil(totalDays / workingDays.length * 7)
    : 0;

  const toggleDay = (day: string) => {
    const current = workingDays;
    const updated = current.includes(day)
      ? current.filter((d: string) => d !== day)
      : [...current, day];
    if (updated.length > 0) {
      onStateChange({ workingDays: updated });
    }
  };

  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          defaultTaktTime,
          settings: {
            taktConfig: {
              defaultTaktTime,
              bufferSize,
              workingDays,
            },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to save takt configuration');
      }

      setSaved(true);
      onStateChange({ taktPlanGenerated: true });

      // Trigger plan generation (best-effort)
      fetch(`/api/v1/projects/${projectId}/plan/generate`, {
        method: 'POST',
        headers: { ...authHeaders },
      }).catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
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
        {/* AI Recommendation Banner */}
        {hasRecommendation && (
          <div
            className="rounded-xl border p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(232,115,26,0.06), rgba(139,92,246,0.06))',
              borderColor: 'rgba(232,115,26,0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                AI Recommendation
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(232,115,26,0.12)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                {taktRec.reasoning}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
                    {taktRec.recommended}d
                  </div>
                  <div className="text-[9px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Takt</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}>
                    {taktRec.range[0]}–{taktRec.range[1]}d
                  </div>
                  <div className="text-[9px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Range</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-purple)' }}>
                    {bufferRec}
                  </div>
                  <div className="text-[9px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Buffer</div>
                </div>
              </div>
              <button
                onClick={() => {
                  onStateChange({
                    defaultTaktTime: taktRec.recommended,
                    bufferSize: bufferRec,
                  });
                  setSaved(false);
                }}
                className="flex-shrink-0 px-4 py-2 rounded-lg text-[11px] font-medium text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Takt Time Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Takt Time
            </label>
            <span className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
              {defaultTaktTime} {defaultTaktTime === 1 ? 'day' : 'days'}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={14}
            value={defaultTaktTime}
            onChange={(e) => {
              onStateChange({ defaultTaktTime: parseInt(e.target.value) });
              setSaved(false);
            }}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>1 day</span>
            {hasRecommendation ? (
              <span style={{ color: 'var(--color-success)' }}>
                Recommended: {taktRec.range[0]}-{taktRec.range[1]} days
              </span>
            ) : template ? (
              <span style={{ color: 'var(--color-success)' }}>
                Recommended: {template.recommendedTaktRange[0]}-{template.recommendedTaktRange[1]} days
              </span>
            ) : null}
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
              {bufferSize} {bufferSize === 1 ? 'takt' : 'takts'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            value={bufferSize}
            onChange={(e) => {
              onStateChange({ bufferSize: parseInt(e.target.value) });
              setSaved(false);
            }}
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
              const active = workingDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  onClick={() => {
                    toggleDay(day.key);
                    setSaved(false);
                  }}
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
        {zoneCount > 0 && tradeCount > 0 && (
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
                { label: 'Trades', value: tradeCount, color: 'var(--color-purple)' },
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
        )}

        {zoneCount === 0 && (
          <div
            className="rounded-lg px-4 py-3 text-[12px]"
            style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--color-warning)' }}
          >
            No zones defined yet. Configure LBS first for accurate duration estimates.
          </div>
        )}

        {error && (
          <div
            className="rounded-lg px-4 py-3 text-[12px]"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
          >
            {error}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saved ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
              <Check size={14} /> Takt config saved
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving...</>
              ) : (
                <><Check size={14} /> Save Takt Configuration</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
