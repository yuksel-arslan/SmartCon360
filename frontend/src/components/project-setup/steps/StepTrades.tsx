'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SetupStepProps, SubTradeTemplate, ContractType } from '../types';
import { DISCIPLINES, CONTRACT_TYPES } from '../types';
import { Check, Loader2, Users, Package, Wrench, ChevronDown, ChevronUp, Save, RefreshCw } from 'lucide-react';

interface TradeRow extends SubTradeTemplate {
  enabled: boolean;
  contractType: ContractType;
  subcontractorGroup: string;
  dbId?: string;        // database ID — present when trade is already saved
}

// DB trade shape from GET /api/v1/projects/:id/trades
interface SavedTrade {
  id: string;
  name: string;
  code: string;
  color: string;
  defaultCrewSize: number;
  discipline: string | null;
  contractType: string | null;
  subcontractorGroup: string | null;
  sortOrder: number;
  isActive: boolean;
}

const CONTRACT_TYPE_BADGE: Record<ContractType, { label: string; bg: string; color: string }> = {
  labor_only:      { label: 'Labor Only',  bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  supply_and_fix:  { label: 'Supply & Fix', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  supply_install:  { label: 'S & I & C',    bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
};

function isValidContractType(ct: string | null | undefined): ct is ContractType {
  return ct === 'labor_only' || ct === 'supply_and_fix' || ct === 'supply_install';
}

function cycleContractType(current: ContractType): ContractType {
  const order: ContractType[] = ['labor_only', 'supply_and_fix', 'supply_install'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export default function StepTrades({ projectId, state, onStateChange, authFetch }: SetupStepProps) {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applied, setApplied] = useState(state.tradeCount > 0);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<string>>(
    new Set(DISCIPLINES.filter((d) => d.value !== 'general').map((d) => d.value)),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupInput, setGroupInput] = useState('');

  // Snapshot of saved state to detect changes
  const savedSnapshot = useRef<Map<string, { contractType: ContractType; subcontractorGroup: string }>>(new Map());

  // Track pending group switch to prevent blur/click race condition
  const pendingGroupSwitch = useRef<string | null>(null);

  // Save current group editing (called before switching or closing)
  const commitCurrentGroupEdit = useCallback(() => {
    if (editingGroup) {
      const trimmed = groupInput.trim();
      setTrades((prev) => prev.map((t) =>
        t.code === editingGroup ? { ...t, subcontractorGroup: trimmed } : t
      ));
    }
  }, [editingGroup, groupInput]);

  // Load trades: first try DB, then fall back to templates
  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Try fetching saved trades from DB
      const savedRes = await authFetch(`/api/v1/projects/${projectId}/trades`);

      if (savedRes.ok) {
        const savedJson = await savedRes.json();
        const savedTrades: SavedTrade[] = savedJson.data || [];

        if (savedTrades.length > 0) {
          // Also fetch templates to get durationMultiplier and predecessorCodes
          const tmplRes = await authFetch(`/api/v1/projects/${projectId}/setup/trade-templates`);
          const tmplData = tmplRes.ok ? (await tmplRes.json()).data?.trades || [] : [];
          const tmplMap = new Map<string, SubTradeTemplate>();
          for (const t of tmplData) {
            tmplMap.set(t.code, t);
          }

          const rows: TradeRow[] = savedTrades.map((st) => {
            const tmpl = tmplMap.get(st.code);
            const ct = isValidContractType(st.contractType) ? st.contractType : 'supply_and_fix';
            return {
              name: st.name,
              code: st.code,
              color: st.color,
              discipline: st.discipline || '',
              defaultCrewSize: st.defaultCrewSize,
              durationMultiplier: tmpl?.durationMultiplier ?? 1.0,
              predecessorCodes: tmpl?.predecessorCodes ?? [],
              sortOrder: st.sortOrder,
              defaultContractType: tmpl?.defaultContractType ?? 'supply_and_fix',
              enabled: true,
              contractType: ct,
              subcontractorGroup: st.subcontractorGroup || '',
              dbId: st.id,
            };
          });

          setTrades(rows);
          setApplied(true);
          onStateChange({ tradeCount: rows.length });

          // Build snapshot for change detection
          const snap = new Map<string, { contractType: ContractType; subcontractorGroup: string }>();
          for (const r of rows) {
            snap.set(r.code, { contractType: r.contractType, subcontractorGroup: r.subcontractorGroup });
          }
          savedSnapshot.current = snap;

          // Set active disciplines from saved trades
          const activeDisciplines = new Set(rows.map((r) => r.discipline).filter(Boolean));
          if (activeDisciplines.size > 0) {
            setSelectedDisciplines(activeDisciplines);
          }

          setLoading(false);
          return;
        }
      }

      // 2. No saved trades — load templates
      const res = await authFetch(`/api/v1/projects/${projectId}/setup/trade-templates`);
      if (res.ok) {
        const json = await res.json();
        const templateTrades = json.data?.trades || [];
        setTrades(templateTrades.map((t: SubTradeTemplate) => ({
          ...t,
          enabled: true,
          contractType: t.defaultContractType || 'supply_and_fix',
          subcontractorGroup: '',
        })));
      }
    } catch {
      setError('Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [projectId, authFetch, onStateChange]);

  useEffect(() => {
    loadTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect changes against saved snapshot
  useEffect(() => {
    if (!applied || savedSnapshot.current.size === 0) {
      setHasChanges(false);
      return;
    }
    const changed = trades.some((t) => {
      if (!t.dbId) return false;
      const snap = savedSnapshot.current.get(t.code);
      if (!snap) return false;
      return snap.contractType !== t.contractType || snap.subcontractorGroup !== t.subcontractorGroup;
    });
    setHasChanges(changed);
  }, [trades, applied]);

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

  // Start editing a group: save current edit first, then switch
  const startEditingGroup = (tradeCode: string, currentGroup: string) => {
    // Save current group edit if any
    commitCurrentGroupEdit();
    setEditingGroup(tradeCode);
    setGroupInput(currentGroup);
  };

  // Finish editing the current group
  const finishEditingGroup = () => {
    commitCurrentGroupEdit();
    setEditingGroup(null);
    setGroupInput('');
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

  // Apply trades for the first time (create in DB)
  const handleApply = async () => {
    setApplying(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/setup/apply-trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const createdTrades: SavedTrade[] = json.data || [];

      // Update local state with DB IDs
      setTrades((prev) =>
        prev.map((t) => {
          const saved = createdTrades.find((s: SavedTrade) => s.code === t.code);
          return saved ? { ...t, dbId: saved.id } : t;
        }),
      );

      // Update snapshot
      const snap = new Map<string, { contractType: ContractType; subcontractorGroup: string }>();
      for (const t of enabledTrades) {
        snap.set(t.code, { contractType: t.contractType, subcontractorGroup: t.subcontractorGroup });
      }
      savedSnapshot.current = snap;

      setApplied(true);
      setHasChanges(false);
      onStateChange({ tradeCount: json.meta?.created || enabledTrades.length });
      setSuccessMsg(`${json.meta?.created || enabledTrades.length} trades applied successfully`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply trades');
    } finally {
      setApplying(false);
    }
  };

  // Save changes to existing trades (bulk PATCH)
  const handleSaveChanges = async () => {
    // Commit any pending group edit before saving
    commitCurrentGroupEdit();
    setEditingGroup(null);
    setGroupInput('');

    setSaving(true);
    setError('');
    setSuccessMsg('');

    // Use a microtask to ensure state is flushed after commitCurrentGroupEdit
    await new Promise((r) => setTimeout(r, 0));

    try {
      // Re-read trades from the latest state
      const currentTrades = trades;
      const modifiedTrades = currentTrades.filter((t) => {
        if (!t.dbId) return false;
        const snap = savedSnapshot.current.get(t.code);
        if (!snap) return false;
        return snap.contractType !== t.contractType || snap.subcontractorGroup !== t.subcontractorGroup;
      });

      if (modifiedTrades.length === 0) {
        setSaving(false);
        setSuccessMsg('No changes to save');
        setTimeout(() => setSuccessMsg(''), 2000);
        return;
      }

      const res = await authFetch(`/api/v1/projects/${projectId}/setup/save-trades`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: modifiedTrades.map((t) => ({
            id: t.dbId,
            contractType: t.contractType,
            subcontractorGroup: t.subcontractorGroup || null,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Failed to save changes');
      }

      const result = await res.json();
      const updatedCount = result.data?.updated ?? 0;

      if (updatedCount === 0) {
        throw new Error('Server reported 0 updates — changes may not have been saved');
      }

      // Update snapshot
      const snap = new Map<string, { contractType: ContractType; subcontractorGroup: string }>();
      for (const t of currentTrades) {
        if (t.dbId) {
          snap.set(t.code, { contractType: t.contractType, subcontractorGroup: t.subcontractorGroup });
        }
      }
      savedSnapshot.current = snap;
      setHasChanges(false);
      setSuccessMsg(`${updatedCount} trade${updatedCount > 1 ? 's' : ''} updated`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
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
                    const ctBadge = CONTRACT_TYPE_BADGE[trade.contractType] || CONTRACT_TYPE_BADGE.supply_and_fix;
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
                          onClick={() => !applied && toggleTrade(trade.code)}
                          className="flex items-center gap-2 flex-1 px-3 py-2 text-left min-w-0"
                          style={{ cursor: applied ? 'default' : 'pointer' }}
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
                                    // Check if we're switching to another group (pendingGroupSwitch)
                                    // If so, skip the close — startEditingGroup will handle it
                                    if (pendingGroupSwitch.current) {
                                      const nextCode = pendingGroupSwitch.current;
                                      pendingGroupSwitch.current = null;
                                      // Save current group
                                      setTradeGroup(trade.code, groupInput.trim());
                                      // Switch to next group
                                      const nextTrade = trades.find((t) => t.code === nextCode);
                                      setEditingGroup(nextCode);
                                      setGroupInput(nextTrade?.subcontractorGroup || '');
                                      return;
                                    }
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
                                onMouseDown={(e) => {
                                  // Prevent blur from stealing focus when switching between group inputs
                                  if (editingGroup && editingGroup !== trade.code) {
                                    e.preventDefault();
                                    pendingGroupSwitch.current = trade.code;
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingGroup(trade.code, trade.subcontractorGroup);
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
                {Object.entries(groupedTrades).map(([group, grpTrades]) => {
                  const isExpanded = expandedGroups.has(group);
                  const laborCount = grpTrades.filter((t) => t.contractType === 'labor_only').length;
                  const sfCount = grpTrades.filter((t) => t.contractType === 'supply_and_fix').length;
                  const siCount = grpTrades.filter((t) => t.contractType === 'supply_install').length;

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
                            {grpTrades.length} trades
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
                          {grpTrades.map((t) => (
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

          {/* Action bar */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                {enabledTrades.length} trades {applied ? 'saved' : 'selected'} across {selectedDisciplines.size} disciplines
                {hasChanges && (
                  <span className="ml-2 text-[10px] font-medium" style={{ color: '#F59E0B' }}>
                    (unsaved changes)
                  </span>
                )}
              </span>

              {/* Reload button */}
              {applied && (
                <button
                  onClick={() => { setEditingGroup(null); setGroupInput(''); loadTrades(); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Reload trades from database"
                >
                  <RefreshCw size={10} /> Reload
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Save changes button (when already applied and has changes) */}
              {applied && hasChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={14} /> Save Changes</>
                  )}
                </button>
              )}

              {/* Apply button (first time only) */}
              {!applied && (
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
              )}

              {/* Applied badge */}
              {applied && !hasChanges && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
                  <Check size={14} /> Trades saved
                </div>
              )}
            </div>
          </div>

          {/* Success message */}
          {successMsg && (
            <div
              className="mt-3 rounded-lg px-3 py-2 text-[11px]"
              style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--color-success)' }}
            >
              {successMsg}
            </div>
          )}

          {/* Error */}
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
