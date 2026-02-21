'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetupStepProps, SubTradeTemplate, ContractType } from '../types';
import { DISCIPLINES, CONTRACT_TYPES } from '../types';
import { Check, Loader2, Users, Package, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

interface TradeRow extends SubTradeTemplate {
  enabled: boolean;
  contractType: ContractType;
  subcontractorGroup: string;
}

const CONTRACT_TYPE_BADGE: Record<ContractType, { label: string; bg: string; color: string }> = {
  labor_only:      { label: 'Labor Only',  bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  supply_and_fix:  { label: 'Supply & Fix', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  supply_install:  { label: 'S & I & C',    bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
};

function cycleContractType(current: ContractType): ContractType {
  const order: ContractType[] = ['labor_only', 'supply_and_fix', 'supply_install'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export default function StepTrades({ projectId, state, onStateChange, onComplete, authHeaders }: SetupStepProps) {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(state.tradeCount > 0);
  const [error, setError] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<string>>(
    new Set(DISCIPLINES.filter((d) => d.value !== 'general').map((d) => d.value)),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupInput, setGroupInput] = useState('');

  const fetchTradeTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/setup/trade-templates`, {
        headers: { ...authHeaders },
      });
      if (res.ok) {
        const json = await res.json();
        setTrades((json.data.trades || []).map((t: SubTradeTemplate) => ({
          ...t,
          enabled: true,
          contractType: t.defaultContractType || 'supply_and_fix',
          subcontractorGroup: '',
        })));
      }
    } catch {
      setError('Failed to load trade templates');
    } finally {
      setLoading(false);
    }
  }, [projectId, authHeaders]);

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

  const setTradeContractType = (code: string, ct: ContractType) => {
    setTrades((prev) => prev.map((t) => (t.code === code ? { ...t, contractType: ct } : t)));
  };

  const setTradeGroup = (code: string, group: string) => {
    setTrades((prev) => prev.map((t) => (t.code === code ? { ...t, subcontractorGroup: group } : t)));
  };

  const applyGroupToMultiple = (codes: string[], group: string) => {
    setTrades((prev) => prev.map((t) => (codes.includes(t.code) ? { ...t, subcontractorGroup: group } : t)));
  };

  const filteredTrades = trades.filter((t) => selectedDisciplines.has(t.discipline));
  const enabledTrades = filteredTrades.filter((t) => t.enabled);

  // Build subcontractor group summary
  const groupedTrades = enabledTrades.reduce<Record<string, TradeRow[]>>((acc, t) => {
    const key = t.subcontractorGroup || '(Unassigned)';
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Get existing group names for autocomplete
  const existingGroups = [...new Set(trades.filter((t) => t.subcontractorGroup).map((t) => t.subcontractorGroup))];

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
          tradeOverrides: enabledTrades.reduce<Record<string, { contractType: string; subcontractorGroup: string }>>((acc, t) => {
            acc[t.code] = { contractType: t.contractType, subcontractorGroup: t.subcontractorGroup };
            return acc;
          }, {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to apply trades');
      }

      const json = await res.json();
      setApplied(true);
      onStateChange({ tradeCount: json.data?.created || enabledTrades.length });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply trades');
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
        Select the disciplines and sub-trades (wagons) for your Takt plan. Set contract type and
        group trades under subcontractor packages.
      </p>

      {/* Contract type legend */}
      <div className="flex flex-wrap gap-3 mb-5 p-3 rounded-lg" style={{ background: 'var(--color-bg-input)' }}>
        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>
          Contract Types:
        </span>
        {CONTRACT_TYPES.map((ct) => (
          <div key={ct.value} className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: CONTRACT_TYPE_BADGE[ct.value].bg, color: CONTRACT_TYPE_BADGE[ct.value].color }}
            >
              {CONTRACT_TYPE_BADGE[ct.value].label}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{ct.description}</span>
          </div>
        ))}
      </div>

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
                  {discTrades.map((trade) => {
                    const ctBadge = CONTRACT_TYPE_BADGE[trade.contractType];
                    return (
                      <div
                        key={trade.code}
                        className="flex items-center rounded-lg border transition-all"
                        style={{
                          background: trade.enabled ? 'var(--color-bg-card)' : 'transparent',
                          borderColor: trade.enabled ? 'var(--color-border)' : 'transparent',
                          opacity: trade.enabled ? 1 : 0.5,
                        }}
                      >
                        {/* Enable toggle + trade info */}
                        <button
                          onClick={() => toggleTrade(trade.code)}
                          className="flex items-center gap-2 flex-1 px-3 py-2 text-left min-w-0"
                        >
                          <div
                            className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                            style={{
                              background: trade.enabled ? trade.color : 'transparent',
                              borderColor: trade.enabled ? trade.color : 'var(--color-border)',
                            }}
                          >
                            {trade.enabled && <Check size={10} color="white" />}
                          </div>
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
                          >
                            {trade.code}
                          </span>
                          <span className="text-[12px] truncate" style={{ color: 'var(--color-text)' }}>{trade.name}</span>
                        </button>

                        {/* Right side: crew, contract type, group */}
                        {trade.enabled && (
                          <div className="flex items-center gap-2 pr-3 shrink-0">
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              <Users size={10} /> {trade.defaultCrewSize}
                            </span>

                            {/* Contract type toggle */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setTradeContractType(trade.code, cycleContractType(trade.contractType)); }}
                              className="text-[9px] font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-all hover:scale-105"
                              style={{ background: ctBadge.bg, color: ctBadge.color }}
                              title="Click to change contract type"
                            >
                              {ctBadge.label}
                            </button>

                            {/* Subcontractor group */}
                            {editingGroup === trade.code ? (
                              <div className="relative">
                                <input
                                  autoFocus
                                  value={groupInput}
                                  onChange={(e) => setGroupInput(e.target.value)}
                                  onBlur={() => {
                                    setTradeGroup(trade.code, groupInput.trim());
                                    setEditingGroup(null);
                                    setGroupInput('');
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setTradeGroup(trade.code, groupInput.trim());
                                      setEditingGroup(null);
                                      setGroupInput('');
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingGroup(null);
                                      setGroupInput('');
                                    }
                                  }}
                                  placeholder="Group name..."
                                  className="w-28 text-[10px] px-2 py-0.5 rounded border outline-none"
                                  style={{
                                    background: 'var(--color-bg-input)',
                                    borderColor: 'var(--color-accent)',
                                    color: 'var(--color-text)',
                                  }}
                                  list={`groups-${trade.code}`}
                                />
                                {existingGroups.length > 0 && (
                                  <datalist id={`groups-${trade.code}`}>
                                    {existingGroups.map((g) => (
                                      <option key={g} value={g} />
                                    ))}
                                  </datalist>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGroup(trade.code);
                                  setGroupInput(trade.subcontractorGroup);
                                }}
                                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors"
                                style={{
                                  background: trade.subcontractorGroup ? 'rgba(139,92,246,0.1)' : 'var(--color-bg-input)',
                                  color: trade.subcontractorGroup ? '#8B5CF6' : 'var(--color-text-muted)',
                                }}
                                title="Assign subcontractor group"
                              >
                                <Package size={10} />
                                {trade.subcontractorGroup || 'Group'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Subcontractor Package Summary */}
          {enabledTrades.length > 0 && Object.keys(groupedTrades).length > 0 && (
            <div
              className="mt-6 rounded-xl border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Wrench size={14} style={{ color: 'var(--color-accent)' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  Subcontractor Packages
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  ({Object.keys(groupedTrades).length} packages)
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(groupedTrades).map(([group, groupTrades]) => {
                  const isExpanded = expandedGroups.has(group);
                  const laborCount = groupTrades.filter((t) => t.contractType === 'labor_only').length;
                  const sfCount = groupTrades.filter((t) => t.contractType === 'supply_and_fix').length;
                  const siCount = groupTrades.filter((t) => t.contractType === 'supply_install').length;

                  return (
                    <div key={group}>
                      <button
                        onClick={() => toggleGroup(group)}
                        className="flex items-center justify-between w-full rounded-lg px-3 py-2 transition-colors"
                        style={{ background: 'var(--color-bg-input)' }}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          <span className="text-[12px] font-medium" style={{ color: group === '(Unassigned)' ? 'var(--color-text-muted)' : '#8B5CF6' }}>
                            {group}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                            {groupTrades.length} trades
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {laborCount > 0 && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: CONTRACT_TYPE_BADGE.labor_only.bg, color: CONTRACT_TYPE_BADGE.labor_only.color }}>
                              {laborCount} Labor
                            </span>
                          )}
                          {sfCount > 0 && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: CONTRACT_TYPE_BADGE.supply_and_fix.bg, color: CONTRACT_TYPE_BADGE.supply_and_fix.color }}>
                              {sfCount} S&F
                            </span>
                          )}
                          {siCount > 0 && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: CONTRACT_TYPE_BADGE.supply_install.bg, color: CONTRACT_TYPE_BADGE.supply_install.color }}>
                              {siCount} S&I
                            </span>
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          {groupTrades.map((t) => (
                            <div key={t.code} className="flex items-center gap-2 px-2 py-1 text-[11px]">
                              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                              <span style={{ color: 'var(--color-text-muted)' }} className="font-mono text-[10px]">{t.code}</span>
                              <span style={{ color: 'var(--color-text)' }}>{t.name}</span>
                              <span
                                className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: CONTRACT_TYPE_BADGE[t.contractType].bg, color: CONTRACT_TYPE_BADGE[t.contractType].color }}
                              >
                                {CONTRACT_TYPE_BADGE[t.contractType].label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
