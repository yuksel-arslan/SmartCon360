'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetupStepProps, SubTradeTemplate } from '../types';
import { DISCIPLINES } from '../types';
import { Check, Loader2, Users } from 'lucide-react';

export default function StepTrades({ projectId, state, onStateChange, authHeaders }: SetupStepProps) {
  const [trades, setTrades] = useState<(SubTradeTemplate & { enabled: boolean })[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<string>>(
    new Set(DISCIPLINES.filter((d) => d.value !== 'general').map((d) => d.value)),
  );

  const fetchTradeTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/setup/trade-templates`, {
        headers: { ...authHeaders },
      });
      if (res.ok) {
        const json = await res.json();
        setTrades((json.data.trades || []).map((t: SubTradeTemplate) => ({ ...t, enabled: true })));
      }
    } catch {
      setError('Failed to load trade templates');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTradeTemplates();
  }, [fetchTradeTemplates]);

  const toggleDiscipline = (disc: string) => {
    setSelectedDisciplines((prev) => {
      const next = new Set(prev);
      if (next.has(disc)) next.delete(disc);
      else next.add(disc);
      return next;
    });
  };

  const toggleTrade = (code: string) => {
    setTrades((prev) => prev.map((t) => (t.code === code ? { ...t, enabled: !t.enabled } : t)));
  };

  const filteredTrades = trades.filter((t) => selectedDisciplines.has(t.discipline));
  const enabledTrades = filteredTrades.filter((t) => t.enabled);

  const handleApply = async () => {
    setApplying(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/setup/apply-trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          selectedDisciplines: Array.from(selectedDisciplines),
          selectedTradeCodes: enabledTrades.map((t) => t.code),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to apply trades');
      }

      const json = await res.json();
      setApplied(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Discipline Trades
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Select the disciplines and sub-trades (wagons) for your Takt plan. These will become the work packages
        that flow through zones in TaktFlow.
      </p>

      {/* Discipline filter */}
      <div className="mb-5">
        <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Active Disciplines
        </label>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.filter((d) => d.value !== 'general').map((d) => {
            const isActive = selectedDisciplines.has(d.value);
            const count = trades.filter((t) => t.discipline === d.value && t.enabled).length;
            return (
              <button
                key={d.value}
                onClick={() => toggleDiscipline(d.value)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: isActive ? d.color + '15' : 'var(--color-bg-input)',
                  color: isActive ? d.color : 'var(--color-text-muted)',
                  border: `1.5px solid ${isActive ? d.color : 'var(--color-border)'}`,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color, opacity: isActive ? 1 : 0.3 }} />
                {d.label}
                {isActive && <span className="text-[10px] opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      ) : (
        <>
          {/* Trade list by discipline */}
          {DISCIPLINES.filter((d) => d.value !== 'general' && selectedDisciplines.has(d.value)).map((disc) => {
            const discTrades = trades.filter((t) => t.discipline === disc.value);
            if (discTrades.length === 0) return null;

            return (
              <div key={disc.value} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: disc.color }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    {disc.label} ({discTrades.filter((t) => t.enabled).length}/{discTrades.length})
                  </span>
                </div>

                <div className="space-y-1">
                  {discTrades.map((trade) => (
                    <button
                      key={trade.code}
                      onClick={() => toggleTrade(trade.code)}
                      className="flex items-center justify-between w-full rounded-lg px-3 py-2 border transition-all text-left"
                      style={{
                        background: trade.enabled ? 'var(--color-bg-card)' : 'transparent',
                        borderColor: trade.enabled ? 'var(--color-border)' : 'transparent',
                        opacity: trade.enabled ? 1 : 0.5,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border flex items-center justify-center"
                          style={{
                            background: trade.enabled ? trade.color : 'transparent',
                            borderColor: trade.enabled ? trade.color : 'var(--color-border)',
                          }}
                        >
                          {trade.enabled && <Check size={10} color="white" />}
                        </div>
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
                        >
                          {trade.code}
                        </span>
                        <span className="text-[12px]" style={{ color: 'var(--color-text)' }}>{trade.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {trade.defaultCrewSize}
                        </span>
                        <span>{trade.durationMultiplier}x takt</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Apply button */}
          <div className="mt-6 flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {enabledTrades.length} trades selected across {selectedDisciplines.size} disciplines
            </span>

            {!applied ? (
              <button
                onClick={handleApply}
                disabled={applying || enabledTrades.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
              >
                {applying ? (
                  <><Loader2 size={14} className="animate-spin" /> Applying...</>
                ) : (
                  <><Check size={14} /> Apply Trades to Project</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
                <Check size={14} /> Trades applied
              </div>
            )}
          </div>

          {error && (
            <div
              className="mt-3 rounded-lg px-3 py-2 text-[11px]"
              style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
            >
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
