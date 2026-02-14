'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import {
  Play,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Shuffle,
  Users,
  Timer,
  Shield,
  Layers,
  MinusCircle,
  ArrowRightLeft,
  Dices,
  ChevronDown,
  History,
  Zap,
  Target,
  Info,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

type ChangeType =
  | 'change_takt_time'
  | 'add_buffer'
  | 'add_crew'
  | 'move_trade'
  | 'remove_trade'
  | 'delay_zone';

interface ScenarioChange {
  id: string;
  type: ChangeType;
  parameters: Record<string, string | number>;
}

interface WhatIfResult {
  original_end_date: string;
  simulated_end_date: string;
  delta_days: number;
  trade_stacking_conflicts: string[];
  total_periods: number;
  cost_impact: number;
  risk_score_change: number;
  warnings: string[];
}

interface MonteCarloResult {
  p50_end_date: string;
  p80_end_date: string;
  p95_end_date: string;
  mean_duration_days: number;
  std_dev_days: number;
  on_time_probability: number;
  histogram: { min: number; max: number; count: number }[];
}

interface ScenarioHistoryItem {
  id: string;
  timestamp: string;
  type: 'what-if' | 'monte-carlo';
  changes: number;
  delta_days: number | null;
  risk_change: number | null;
  on_time_prob: number | null;
}

type ResultTab = 'what-if' | 'monte-carlo';

// ── Constants ──────────────────────────────────────────────────

const DEMO_TRADES = [
  'Structure',
  'MEP Rough-In',
  'Drywall',
  'MEP Finish',
  'Flooring',
  'Paint',
  'Final Finishes',
];

const CHANGE_TYPE_CONFIG: {
  type: ChangeType;
  label: string;
  icon: typeof Clock;
  color: string;
}[] = [
  { type: 'change_takt_time', label: 'Change Takt Time', icon: Timer, color: 'var(--color-accent)' },
  { type: 'add_buffer', label: 'Add Buffer', icon: Shield, color: 'var(--color-purple)' },
  { type: 'add_crew', label: 'Add Crew', icon: Users, color: 'var(--color-success)' },
  { type: 'move_trade', label: 'Move Trade', icon: ArrowRightLeft, color: 'var(--color-warning)' },
  { type: 'remove_trade', label: 'Remove Trade', icon: MinusCircle, color: 'var(--color-danger)' },
  { type: 'delay_zone', label: 'Delay Zone', icon: Clock, color: 'var(--color-cyan)' },
];

const BASE_PLAN = {
  zones: 6,
  wagons: 7,
  takt_time: 5,
  buffer_days: 2,
  start_date: '2026-03-01',
};

// ── Mock data generators ───────────────────────────────────────

function generateMockWhatIf(changes: ScenarioChange[]): WhatIfResult {
  const hasBufferChange = changes.some((c) => c.type === 'add_buffer');
  const hasTaktChange = changes.some((c) => c.type === 'change_takt_time');
  const hasCrewChange = changes.some((c) => c.type === 'add_crew');
  const hasRemoveTrade = changes.some((c) => c.type === 'remove_trade');

  let delta = 0;
  if (hasTaktChange) {
    const tc = changes.find((c) => c.type === 'change_takt_time');
    const newTakt = Number(tc?.parameters.new_takt_time ?? 5);
    delta += (newTakt - 5) * 6;
  }
  if (hasBufferChange) {
    const bc = changes.find((c) => c.type === 'add_buffer');
    delta += Number(bc?.parameters.buffer_periods ?? 1) * 2;
  }
  if (hasCrewChange) delta -= 3;
  if (hasRemoveTrade) delta -= 5;

  const warnings: string[] = [];
  if (delta > 5) warnings.push('Schedule extension exceeds 5 days -- review critical path impact');
  if (hasRemoveTrade) warnings.push('Removing a trade may affect downstream dependencies');
  if (hasTaktChange) {
    const tc = changes.find((c) => c.type === 'change_takt_time');
    const newTakt = Number(tc?.parameters.new_takt_time ?? 5);
    if (newTakt < 3) warnings.push('Takt time below 3 days increases stacking risk');
  }

  const stackingConflicts: string[] = [];
  if (delta < -3) stackingConflicts.push('MEP Rough-In / Drywall overlap in Zone C');
  if (hasTaktChange) {
    const tc = changes.find((c) => c.type === 'change_takt_time');
    if (Number(tc?.parameters.new_takt_time ?? 5) <= 3) {
      stackingConflicts.push('Paint / Final Finishes overlap in Zone D');
    }
  }

  const originalEnd = new Date('2026-05-22');
  const simEnd = new Date(originalEnd);
  simEnd.setDate(simEnd.getDate() + delta);

  return {
    original_end_date: originalEnd.toISOString().split('T')[0],
    simulated_end_date: simEnd.toISOString().split('T')[0],
    delta_days: delta,
    trade_stacking_conflicts: stackingConflicts,
    total_periods: Math.max(BASE_PLAN.zones * BASE_PLAN.wagons + delta, 20),
    cost_impact: delta * 4200,
    risk_score_change: delta > 0 ? delta * 2.1 : delta * 1.5,
    warnings,
  };
}

function generateMockMonteCarlo(): MonteCarloResult {
  const histogram: { min: number; max: number; count: number }[] = [];
  const buckets = [
    { min: 70, max: 75, count: 12 },
    { min: 75, max: 80, count: 45 },
    { min: 80, max: 85, count: 198 },
    { min: 85, max: 90, count: 312 },
    { min: 90, max: 95, count: 245 },
    { min: 95, max: 100, count: 112 },
    { min: 100, max: 105, count: 52 },
    { min: 105, max: 110, count: 18 },
    { min: 110, max: 115, count: 6 },
  ];
  histogram.push(...buckets);

  return {
    p50_end_date: '2026-05-20',
    p80_end_date: '2026-05-28',
    p95_end_date: '2026-06-05',
    mean_duration_days: 88,
    std_dev_days: 7.2,
    on_time_probability: 78.4,
    histogram,
  };
}

// ── Main Component ─────────────────────────────────────────────

export default function SimulationPage() {
  // Scenario builder state
  const [changes, setChanges] = useState<ScenarioChange[]>([]);
  const [showChangeTypeDropdown, setShowChangeTypeDropdown] = useState(false);
  const [iterationCount, setIterationCount] = useState(1000);
  const [variancePct, setVariancePct] = useState(15);

  // Results state
  const [activeTab, setActiveTab] = useState<ResultTab>('what-if');
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [loadingWhatIf, setLoadingWhatIf] = useState(false);
  const [loadingMonteCarlo, setLoadingMonteCarlo] = useState(false);
  const [usingApi, setUsingApi] = useState(false);

  // History state
  const [history, setHistory] = useState<ScenarioHistoryItem[]>([
    {
      id: 'h1',
      timestamp: '2026-02-12 14:32',
      type: 'what-if',
      changes: 2,
      delta_days: -3,
      risk_change: -4.5,
      on_time_prob: null,
    },
    {
      id: 'h2',
      timestamp: '2026-02-12 11:15',
      type: 'monte-carlo',
      changes: 0,
      delta_days: null,
      risk_change: null,
      on_time_prob: 82.1,
    },
    {
      id: 'h3',
      timestamp: '2026-02-11 16:48',
      type: 'what-if',
      changes: 3,
      delta_days: 6,
      risk_change: 12.6,
      on_time_prob: null,
    },
  ]);

  // ── Change management ──────────────────────────────────────

  const addChange = useCallback((type: ChangeType) => {
    const defaultParams: Record<ChangeType, Record<string, string | number>> = {
      change_takt_time: { new_takt_time: 5 },
      add_buffer: { buffer_periods: 1 },
      add_crew: { trade: DEMO_TRADES[0], additional_crew: 2 },
      move_trade: { trade: DEMO_TRADES[0], new_position: 2 },
      remove_trade: { trade: DEMO_TRADES[6] },
      delay_zone: { zone: 1, delay_days: 2 },
    };

    setChanges((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        parameters: { ...defaultParams[type] },
      },
    ]);
    setShowChangeTypeDropdown(false);
  }, []);

  const removeChange = useCallback((id: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateChangeParam = useCallback(
    (id: string, key: string, value: string | number) => {
      setChanges((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, parameters: { ...c.parameters, [key]: value } } : c
        )
      );
    },
    []
  );

  // ── Run What-If ────────────────────────────────────────────

  const runWhatIf = useCallback(async () => {
    if (changes.length === 0) return;
    setLoadingWhatIf(true);
    setActiveTab('what-if');

    try {
      const res = await fetch('/api/v1/simulate/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_plan: BASE_PLAN,
          changes: changes.map((c) => ({ type: c.type, parameters: c.parameters })),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setWhatIfResult(json.data);
        setUsingApi(true);
        setHistory((prev) => [
          {
            id: `h-${Date.now()}`,
            timestamp: new Date().toLocaleString('sv-SE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            type: 'what-if',
            changes: changes.length,
            delta_days: json.data.delta_days,
            risk_change: json.data.risk_score_change,
            on_time_prob: null,
          },
          ...prev,
        ]);
        setLoadingWhatIf(false);
        return;
      }
      throw new Error('API unavailable');
    } catch {
      // Fallback to mock
      await new Promise((r) => setTimeout(r, 1200));
      const result = generateMockWhatIf(changes);
      setWhatIfResult(result);
      setUsingApi(false);
      setHistory((prev) => [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          type: 'what-if',
          changes: changes.length,
          delta_days: result.delta_days,
          risk_change: result.risk_score_change,
          on_time_prob: null,
        },
        ...prev,
      ]);
    } finally {
      setLoadingWhatIf(false);
    }
  }, [changes]);

  // ── Run Monte Carlo ────────────────────────────────────────

  const runMonteCarlo = useCallback(async () => {
    setLoadingMonteCarlo(true);
    setActiveTab('monte-carlo');

    try {
      const res = await fetch('/api/v1/simulate/monte-carlo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_plan: BASE_PLAN,
          iterations: iterationCount,
          duration_variance_pct: variancePct,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setMonteCarloResult(json.data);
        setUsingApi(true);
        setHistory((prev) => [
          {
            id: `h-${Date.now()}`,
            timestamp: new Date().toLocaleString('sv-SE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            type: 'monte-carlo',
            changes: 0,
            delta_days: null,
            risk_change: null,
            on_time_prob: json.data.on_time_probability,
          },
          ...prev,
        ]);
        setLoadingMonteCarlo(false);
        return;
      }
      throw new Error('API unavailable');
    } catch {
      await new Promise((r) => setTimeout(r, 1800));
      const result = generateMockMonteCarlo();
      setMonteCarloResult(result);
      setUsingApi(false);
      setHistory((prev) => [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          type: 'monte-carlo',
          changes: 0,
          delta_days: null,
          risk_change: null,
          on_time_prob: result.on_time_probability,
        },
        ...prev,
      ]);
    } finally {
      setLoadingMonteCarlo(false);
    }
  }, [iterationCount, variancePct]);

  // ── Histogram max for scaling ──────────────────────────────

  const histogramMax = useMemo(() => {
    if (!monteCarloResult) return 1;
    return Math.max(...monteCarloResult.histogram.map((b) => b.count), 1);
  }, [monteCarloResult]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      <TopBar title="Simulation" />
      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-extrabold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              What-If Simulation
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Configure scenarios, run simulations, and compare outcomes against the baseline plan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!usingApi && (whatIfResult || monteCarloResult) && (
              <span
                className="text-[9px] font-semibold px-2 py-1 rounded"
                style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}
              >
                Demo Data
              </span>
            )}
          </div>
        </div>

        {/* ── Main 2-panel layout ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── LEFT PANEL: Scenario Builder (~40%) ────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Base Plan Info */}
            <div
              className="rounded-xl border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Layers size={15} style={{ color: 'var(--color-accent)' }} />
                <h3
                  className="text-sm font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  Base Plan
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Zones', value: BASE_PLAN.zones, color: 'var(--color-accent)' },
                  { label: 'Trades', value: BASE_PLAN.wagons, color: 'var(--color-purple)' },
                  { label: 'Takt Time', value: `${BASE_PLAN.takt_time}d`, color: 'var(--color-cyan)' },
                  { label: 'Buffer', value: `${BASE_PLAN.buffer_days}d`, color: 'var(--color-warning)' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg p-2.5 flex items-center gap-2.5"
                    style={{ background: 'var(--color-bg-input)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
                    >
                      <span
                        className="text-xs font-extrabold"
                        style={{ fontFamily: 'var(--font-mono)', color: item.color }}
                      >
                        {item.value}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <Calendar size={11} />
                <span>
                  Start:{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                    {BASE_PLAN.start_date}
                  </span>
                </span>
              </div>
            </div>

            {/* Scenario Configuration */}
            <div
              className="rounded-xl border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shuffle size={15} style={{ color: 'var(--color-purple)' }} />
                  <h3
                    className="text-sm font-bold"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    Scenario Configuration
                  </h3>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
                >
                  {changes.length} change{changes.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Change List */}
              <div className="space-y-2 mb-3">
                <AnimatePresence>
                  {changes.map((change) => {
                    const cfg = CHANGE_TYPE_CONFIG.find((c) => c.type === change.type);
                    if (!cfg) return null;
                    return (
                      <motion.div
                        key={change.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-lg border p-3"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <cfg.icon size={13} style={{ color: cfg.color }} />
                            <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>
                              {cfg.label}
                            </span>
                          </div>
                          <button
                            onClick={() => removeChange(change.id)}
                            className="w-5 h-5 rounded flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        {/* Parameter inputs based on type */}
                        <div className="space-y-2">
                          {change.type === 'change_takt_time' && (
                            <div>
                              <label
                                className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                New Takt Time: {change.parameters.new_takt_time} days
                              </label>
                              <input
                                type="range"
                                min={1}
                                max={10}
                                step={1}
                                value={Number(change.parameters.new_takt_time)}
                                onChange={(e) =>
                                  updateChangeParam(change.id, 'new_takt_time', Number(e.target.value))
                                }
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: 'var(--color-accent)' }}
                              />
                              <div
                                className="flex justify-between text-[8px] mt-0.5"
                                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                              >
                                <span>1d</span>
                                <span>5d</span>
                                <span>10d</span>
                              </div>
                            </div>
                          )}

                          {change.type === 'add_buffer' && (
                            <div>
                              <label
                                className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                Buffer Periods
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={5}
                                value={Number(change.parameters.buffer_periods)}
                                onChange={(e) =>
                                  updateChangeParam(change.id, 'buffer_periods', Number(e.target.value))
                                }
                                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                style={{
                                  background: 'var(--color-bg-card)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              />
                            </div>
                          )}

                          {change.type === 'add_crew' && (
                            <>
                              <div>
                                <label
                                  className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  Trade
                                </label>
                                <select
                                  value={String(change.parameters.trade)}
                                  onChange={(e) =>
                                    updateChangeParam(change.id, 'trade', e.target.value)
                                  }
                                  className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                  style={{
                                    background: 'var(--color-bg-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                  }}
                                >
                                  {DEMO_TRADES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label
                                  className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  Additional Crew
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={Number(change.parameters.additional_crew)}
                                  onChange={(e) =>
                                    updateChangeParam(change.id, 'additional_crew', Number(e.target.value))
                                  }
                                  className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                  style={{
                                    background: 'var(--color-bg-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                />
                              </div>
                            </>
                          )}

                          {change.type === 'move_trade' && (
                            <>
                              <div>
                                <label
                                  className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  Trade
                                </label>
                                <select
                                  value={String(change.parameters.trade)}
                                  onChange={(e) =>
                                    updateChangeParam(change.id, 'trade', e.target.value)
                                  }
                                  className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                  style={{
                                    background: 'var(--color-bg-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                  }}
                                >
                                  {DEMO_TRADES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label
                                  className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  New Position
                                </label>
                                <select
                                  value={Number(change.parameters.new_position)}
                                  onChange={(e) =>
                                    updateChangeParam(change.id, 'new_position', Number(e.target.value))
                                  }
                                  className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                  style={{
                                    background: 'var(--color-bg-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                  }}
                                >
                                  {DEMO_TRADES.map((_, i) => (
                                    <option key={i} value={i + 1}>
                                      Position {i + 1}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}

                          {change.type === 'remove_trade' && (
                            <div>
                              <label
                                className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                style={{ color: 'var(--color-text-muted)' }}
                              >
                                Trade to Remove
                              </label>
                              <select
                                value={String(change.parameters.trade)}
                                onChange={(e) =>
                                  updateChangeParam(change.id, 'trade', e.target.value)
                                }
                                className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                style={{
                                  background: 'var(--color-bg-card)',
                                  borderColor: 'var(--color-border)',
                                  color: 'var(--color-text)',
                                }}
                              >
                                {DEMO_TRADES.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {change.type === 'delay_zone' && (
                            <>
                              <div>
                                <label
                                  className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  Zone
                                </label>
                                <select
                                  value={Number(change.parameters.zone)}
                                  onChange={(e) =>
                                    updateChangeParam(change.id, 'zone', Number(e.target.value))
                                  }
                                  className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                  style={{
                                    background: 'var(--color-bg-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                  }}
                                >
                                  {Array.from({ length: BASE_PLAN.zones }, (_, i) => (
                                    <option key={i} value={i + 1}>
                                      Zone {String.fromCharCode(65 + i)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label
                                  className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  Delay (days)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={15}
                                  value={Number(change.parameters.delay_days)}
                                  onChange={(e) =>
                                    updateChangeParam(change.id, 'delay_days', Number(e.target.value))
                                  }
                                  className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                                  style={{
                                    background: 'var(--color-bg-card)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Add change button / dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowChangeTypeDropdown(!showChangeTypeDropdown)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed text-[11px] font-semibold transition-all hover:opacity-80"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                    background: 'transparent',
                  }}
                >
                  <Plus size={13} />
                  Add Change
                  <ChevronDown
                    size={10}
                    style={{
                      transform: showChangeTypeDropdown ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                <AnimatePresence>
                  {showChangeTypeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-1 rounded-lg border shadow-xl z-30 py-1"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      {CHANGE_TYPE_CONFIG.map((cfg) => (
                        <button
                          key={cfg.type}
                          onClick={() => addChange(cfg.type)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-opacity hover:opacity-70"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          <cfg.icon size={13} style={{ color: cfg.color }} />
                          {cfg.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Empty state */}
              {changes.length === 0 && (
                <div className="text-center py-4 mt-2">
                  <Shuffle
                    size={24}
                    style={{ color: 'var(--color-text-muted)', margin: '0 auto', opacity: 0.4 }}
                  />
                  <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    Add changes above to build your scenario.
                  </p>
                </div>
              )}
            </div>

            {/* Monte Carlo Settings */}
            <div
              className="rounded-xl border p-4"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Dices size={15} style={{ color: 'var(--color-cyan)' }} />
                <h3
                  className="text-sm font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  Monte Carlo Settings
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Iterations
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    step={100}
                    value={iterationCount}
                    onChange={(e) => setIterationCount(Number(e.target.value))}
                    className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                    style={{
                      background: 'var(--color-bg-input)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[9px] font-bold uppercase tracking-wider block mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Variance %
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    step={5}
                    value={variancePct}
                    onChange={(e) => setVariancePct(Number(e.target.value))}
                    className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                    style={{
                      background: 'var(--color-bg-input)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={runWhatIf}
                disabled={loadingWhatIf || changes.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
              >
                {loadingWhatIf ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    Run What-If
                  </>
                )}
              </button>
              <button
                onClick={runMonteCarlo}
                disabled={loadingMonteCarlo}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--color-cyan), var(--color-accent))' }}
              >
                {loadingMonteCarlo ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Dices size={15} />
                    Monte Carlo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL: Results (~60%) ────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Tab Bar */}
            <div
              className="rounded-xl border p-1 flex gap-1"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              {[
                { id: 'what-if' as ResultTab, label: 'What-If Results', icon: BarChart3, color: 'var(--color-accent)' },
                { id: 'monte-carlo' as ResultTab, label: 'Monte Carlo', icon: Dices, color: 'var(--color-cyan)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: activeTab === tab.id ? 'var(--color-bg-input)' : 'transparent',
                    color: activeTab === tab.id ? tab.color : 'var(--color-text-muted)',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
                  }}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── What-If Results Tab ──────────────────────── */}
            {activeTab === 'what-if' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {loadingWhatIf ? (
                  <div
                    className="rounded-xl border p-12 flex flex-col items-center justify-center"
                    style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  >
                    <Loader2 size={28} className="animate-spin mb-3" style={{ color: 'var(--color-accent)' }} />
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      Running simulation...
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Evaluating {changes.length} change{changes.length !== 1 ? 's' : ''} against base plan
                    </p>
                  </div>
                ) : whatIfResult ? (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        {
                          label: 'Original End',
                          value: whatIfResult.original_end_date,
                          icon: Calendar,
                          color: 'var(--color-text-secondary)',
                          mono: true,
                        },
                        {
                          label: 'Simulated End',
                          value: whatIfResult.simulated_end_date,
                          icon: Target,
                          color: whatIfResult.delta_days <= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          mono: true,
                        },
                        {
                          label: 'Delta',
                          value: `${whatIfResult.delta_days > 0 ? '+' : ''}${whatIfResult.delta_days}d`,
                          icon: whatIfResult.delta_days <= 0 ? TrendingDown : TrendingUp,
                          color: whatIfResult.delta_days <= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          mono: true,
                        },
                        {
                          label: 'Cost Impact',
                          value:
                            whatIfResult.cost_impact === 0
                              ? '$0'
                              : `${whatIfResult.cost_impact > 0 ? '+' : ''}$${Math.abs(whatIfResult.cost_impact).toLocaleString()}`,
                          icon: whatIfResult.cost_impact <= 0 ? TrendingDown : TrendingUp,
                          color: whatIfResult.cost_impact <= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          mono: true,
                        },
                      ].map((kpi) => (
                        <motion.div
                          key={kpi.label}
                          className="rounded-xl border p-3"
                          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {kpi.label}
                            </span>
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center"
                              style={{ background: `color-mix(in srgb, ${kpi.color} 12%, transparent)` }}
                            >
                              <kpi.icon size={12} style={{ color: kpi.color }} />
                            </div>
                          </div>
                          <div
                            className="text-lg font-extrabold"
                            style={{
                              fontFamily: kpi.mono ? 'var(--font-mono)' : 'var(--font-display)',
                              color: kpi.color,
                            }}
                          >
                            {kpi.value}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Risk Score Change */}
                    <div
                      className="rounded-xl border p-4"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap size={14} style={{ color: 'var(--color-warning)' }} />
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                            Risk Score Change
                          </span>
                        </div>
                        <span
                          className="text-sm font-extrabold"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color:
                              whatIfResult.risk_score_change <= 0
                                ? 'var(--color-success)'
                                : 'var(--color-danger)',
                          }}
                        >
                          {whatIfResult.risk_score_change > 0 ? '+' : ''}
                          {whatIfResult.risk_score_change.toFixed(1)}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full w-full overflow-hidden"
                        style={{ background: 'var(--color-bg-input)' }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background:
                              whatIfResult.risk_score_change <= 0
                                ? 'var(--color-success)'
                                : whatIfResult.risk_score_change < 10
                                  ? 'var(--color-warning)'
                                  : 'var(--color-danger)',
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(Math.abs(whatIfResult.risk_score_change) * 3, 100)}%`,
                          }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <div
                        className="flex justify-between mt-1 text-[9px]"
                        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                      >
                        <span>Lower risk</span>
                        <span>Higher risk</span>
                      </div>
                    </div>

                    {/* Stacking Conflicts */}
                    {whatIfResult.trade_stacking_conflicts.length > 0 && (
                      <div
                        className="rounded-xl border p-4"
                        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
                          <span className="text-[11px] font-bold" style={{ color: 'var(--color-danger)' }}>
                            Trade Stacking Conflicts ({whatIfResult.trade_stacking_conflicts.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {whatIfResult.trade_stacking_conflicts.map((conflict, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium"
                              style={{
                                background: 'rgba(239,68,68,0.06)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: 'var(--color-danger)' }}
                              />
                              {conflict}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {whatIfResult.warnings.length > 0 && (
                      <div
                        className="rounded-xl border p-4"
                        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Info size={14} style={{ color: 'var(--color-warning)' }} />
                          <span className="text-[11px] font-bold" style={{ color: 'var(--color-warning)' }}>
                            Warnings ({whatIfResult.warnings.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {whatIfResult.warnings.map((warning, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] font-medium"
                              style={{
                                background: 'rgba(245,158,11,0.06)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                                style={{ background: 'var(--color-warning)' }}
                              />
                              {warning}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Empty state */
                  <div
                    className="rounded-xl border p-12 flex flex-col items-center justify-center"
                    style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' }}
                    >
                      <BarChart3 size={24} style={{ color: 'var(--color-accent)', opacity: 0.5 }} />
                    </div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      No simulation results yet
                    </p>
                    <p className="text-[11px] mt-1 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                      Add changes to the scenario builder and click &quot;Run What-If&quot; to see projected outcomes.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Monte Carlo Results Tab ──────────────────── */}
            {activeTab === 'monte-carlo' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {loadingMonteCarlo ? (
                  <div
                    className="rounded-xl border p-12 flex flex-col items-center justify-center"
                    style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  >
                    <Loader2 size={28} className="animate-spin mb-3" style={{ color: 'var(--color-cyan)' }} />
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                      Running Monte Carlo simulation...
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {iterationCount.toLocaleString()} iterations with {variancePct}% variance
                    </p>
                  </div>
                ) : monteCarloResult ? (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        {
                          label: 'P50 End Date',
                          value: monteCarloResult.p50_end_date,
                          sub: '50th percentile',
                          color: 'var(--color-success)',
                          icon: Target,
                        },
                        {
                          label: 'P80 End Date',
                          value: monteCarloResult.p80_end_date,
                          sub: '80th percentile',
                          color: 'var(--color-warning)',
                          icon: Target,
                        },
                        {
                          label: 'P95 End Date',
                          value: monteCarloResult.p95_end_date,
                          sub: '95th percentile',
                          color: 'var(--color-danger)',
                          icon: Target,
                        },
                      ].map((kpi) => (
                        <motion.div
                          key={kpi.label}
                          className="rounded-xl border p-3"
                          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {kpi.label}
                            </span>
                            <kpi.icon size={12} style={{ color: kpi.color }} />
                          </div>
                          <div
                            className="text-base font-extrabold"
                            style={{ fontFamily: 'var(--font-mono)', color: kpi.color }}
                          >
                            {kpi.value}
                          </div>
                          <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {kpi.sub}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: 'On-Time Probability',
                          value: `${monteCarloResult.on_time_probability}%`,
                          color:
                            monteCarloResult.on_time_probability >= 80
                              ? 'var(--color-success)'
                              : monteCarloResult.on_time_probability >= 60
                                ? 'var(--color-warning)'
                                : 'var(--color-danger)',
                        },
                        {
                          label: 'Mean Duration',
                          value: `${monteCarloResult.mean_duration_days}d`,
                          color: 'var(--color-accent)',
                        },
                        {
                          label: 'Std Deviation',
                          value: `${monteCarloResult.std_dev_days}d`,
                          color: 'var(--color-purple)',
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-xl border p-3 text-center"
                          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                        >
                          <div
                            className="text-xl font-extrabold"
                            style={{ fontFamily: 'var(--font-display)', color: stat.color }}
                          >
                            {stat.value}
                          </div>
                          <div
                            className="text-[9px] font-semibold uppercase tracking-wider mt-1"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Histogram */}
                    <div
                      className="rounded-xl border p-5"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 size={15} style={{ color: 'var(--color-cyan)' }} />
                          <h3
                            className="text-sm font-bold"
                            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                          >
                            Duration Distribution
                          </h3>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            background: 'var(--color-bg-input)',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {iterationCount.toLocaleString()} iterations
                        </span>
                      </div>

                      {/* SVG Histogram */}
                      <svg
                        viewBox="0 0 500 200"
                        className="w-full"
                        style={{ overflow: 'visible' }}
                      >
                        {/* Y axis line */}
                        <line
                          x1="45"
                          y1="10"
                          x2="45"
                          y2="165"
                          stroke="var(--color-border)"
                          strokeWidth="1"
                        />
                        {/* X axis line */}
                        <line
                          x1="45"
                          y1="165"
                          x2="490"
                          y2="165"
                          stroke="var(--color-border)"
                          strokeWidth="1"
                        />

                        {/* Y axis labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                          const yVal = Math.round(histogramMax * frac);
                          const y = 165 - frac * 150;
                          return (
                            <g key={frac}>
                              <text
                                x="40"
                                y={y + 3}
                                textAnchor="end"
                                fill="var(--color-text-muted)"
                                fontSize="9"
                                fontFamily="var(--font-mono)"
                              >
                                {yVal}
                              </text>
                              <line
                                x1="45"
                                y1={y}
                                x2="490"
                                y2={y}
                                stroke="var(--color-border)"
                                strokeWidth="0.5"
                                strokeDasharray="4 4"
                                opacity="0.5"
                              />
                            </g>
                          );
                        })}

                        {/* Bars */}
                        {monteCarloResult.histogram.map((bucket, idx) => {
                          const barWidth =
                            (490 - 55) / monteCarloResult.histogram.length - 4;
                          const x = 55 + idx * ((490 - 55) / monteCarloResult.histogram.length) + 2;
                          const barHeight = (bucket.count / histogramMax) * 150;
                          const y = 165 - barHeight;

                          const midpoint = (bucket.min + bucket.max) / 2;
                          const isP50 = midpoint >= 85 && midpoint <= 90;
                          const isP80 = midpoint >= 90 && midpoint <= 95;
                          const isP95 = midpoint >= 100 && midpoint <= 105;

                          let fillColor = 'var(--color-accent)';
                          if (isP95) fillColor = 'var(--color-danger)';
                          else if (isP80) fillColor = 'var(--color-warning)';
                          else if (isP50) fillColor = 'var(--color-success)';

                          return (
                            <g key={idx}>
                              <motion.rect
                                x={x}
                                width={barWidth}
                                rx="2"
                                ry="2"
                                fill={fillColor}
                                opacity="0.75"
                                initial={{ y: 165, height: 0 }}
                                animate={{ y, height: barHeight }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                              />
                              {/* X axis label */}
                              <text
                                x={x + barWidth / 2}
                                y="178"
                                textAnchor="middle"
                                fill="var(--color-text-muted)"
                                fontSize="8"
                                fontFamily="var(--font-mono)"
                              >
                                {bucket.min}
                              </text>
                              {/* Count label on top of bar */}
                              {bucket.count > 30 && (
                                <motion.text
                                  x={x + barWidth / 2}
                                  textAnchor="middle"
                                  fill="var(--color-text-secondary)"
                                  fontSize="8"
                                  fontWeight="600"
                                  fontFamily="var(--font-mono)"
                                  initial={{ y: 165, opacity: 0 }}
                                  animate={{ y: y - 4, opacity: 1 }}
                                  transition={{ duration: 0.5, delay: idx * 0.05 + 0.2 }}
                                >
                                  {bucket.count}
                                </motion.text>
                              )}
                            </g>
                          );
                        })}

                        {/* X axis title */}
                        <text
                          x="270"
                          y="195"
                          textAnchor="middle"
                          fill="var(--color-text-muted)"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                        >
                          Duration (days)
                        </text>
                      </svg>

                      {/* Legend */}
                      <div className="flex items-center justify-center gap-4 mt-3">
                        {[
                          { label: 'P50 range', color: 'var(--color-success)' },
                          { label: 'P80 range', color: 'var(--color-warning)' },
                          { label: 'P95 range', color: 'var(--color-danger)' },
                          { label: 'Other', color: 'var(--color-accent)' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ background: item.color, opacity: 0.75 }}
                            />
                            <span className="text-[9px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Critical Trades */}
                    <div
                      className="rounded-xl border p-4"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Zap size={14} style={{ color: 'var(--color-warning)' }} />
                        <h3
                          className="text-[12px] font-bold"
                          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                        >
                          Critical Trades (Highest Variance)
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {[
                          { trade: 'MEP Rough-In', sensitivity: 0.82, avgDelay: 2.3 },
                          { trade: 'Drywall', sensitivity: 0.65, avgDelay: 1.1 },
                          { trade: 'Structure', sensitivity: 0.48, avgDelay: 0.8 },
                        ].map((item) => (
                          <div
                            key={item.trade}
                            className="flex items-center gap-3 p-2.5 rounded-lg"
                            style={{ background: 'var(--color-bg-input)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                                  {item.trade}
                                </span>
                                <span
                                  className="text-[10px] font-bold"
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    color:
                                      item.sensitivity >= 0.7
                                        ? 'var(--color-danger)'
                                        : item.sensitivity >= 0.5
                                          ? 'var(--color-warning)'
                                          : 'var(--color-text-secondary)',
                                  }}
                                >
                                  {(item.sensitivity * 100).toFixed(0)}% sensitivity
                                </span>
                              </div>
                              <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'var(--color-bg-card)' }}
                              >
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{
                                    background:
                                      item.sensitivity >= 0.7
                                        ? 'var(--color-danger)'
                                        : item.sensitivity >= 0.5
                                          ? 'var(--color-warning)'
                                          : 'var(--color-accent)',
                                  }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.sensitivity * 100}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                              <div
                                className="text-[9px] mt-1"
                                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                              >
                                Avg delay: +{item.avgDelay}d
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Empty state */
                  <div
                    className="rounded-xl border p-12 flex flex-col items-center justify-center"
                    style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'color-mix(in srgb, var(--color-cyan) 10%, transparent)' }}
                    >
                      <Dices size={24} style={{ color: 'var(--color-cyan)', opacity: 0.5 }} />
                    </div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      No Monte Carlo results yet
                    </p>
                    <p className="text-[11px] mt-1 max-w-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                      Configure iterations and variance, then click &quot;Monte Carlo&quot; to run a probabilistic analysis.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Section 3: Scenario History ──────────────────── */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="flex items-center gap-2">
              <History size={16} style={{ color: 'var(--color-text-muted)' }} />
              <h3
                className="text-sm font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                Scenario History
              </h3>
            </div>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
            >
              {history.length} runs
            </span>
          </div>

          <div className="p-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Type', 'Timestamp', 'Changes', 'Delta Days', 'Risk Change', 'On-Time Prob'].map(
                    (header) => (
                      <th
                        key={header}
                        className="text-left text-[10px] font-semibold uppercase tracking-wider pb-3 px-3"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {history.map((item) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="border-t"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td className="py-3 px-3">
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md"
                          style={{
                            background:
                              item.type === 'what-if'
                                ? 'rgba(232,115,26,0.1)'
                                : 'rgba(6,182,212,0.1)',
                            color:
                              item.type === 'what-if'
                                ? 'var(--color-accent)'
                                : 'var(--color-cyan)',
                          }}
                        >
                          {item.type === 'what-if' ? 'What-If' : 'Monte Carlo'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
                        >
                          {item.timestamp}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-medium" style={{ color: 'var(--color-text)' }}>
                          {item.changes > 0 ? item.changes : '--'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {item.delta_days !== null ? (
                          <span
                            className="text-[11px] font-bold"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color:
                                item.delta_days <= 0
                                  ? 'var(--color-success)'
                                  : 'var(--color-danger)',
                            }}
                          >
                            {item.delta_days > 0 ? '+' : ''}
                            {item.delta_days}d
                          </span>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            --
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {item.risk_change !== null ? (
                          <span
                            className="text-[11px] font-bold"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color:
                                item.risk_change <= 0
                                  ? 'var(--color-success)'
                                  : 'var(--color-danger)',
                            }}
                          >
                            {item.risk_change > 0 ? '+' : ''}
                            {item.risk_change.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            --
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {item.on_time_prob !== null ? (
                          <span
                            className="text-[11px] font-bold"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color:
                                item.on_time_prob >= 80
                                  ? 'var(--color-success)'
                                  : item.on_time_prob >= 60
                                    ? 'var(--color-warning)'
                                    : 'var(--color-danger)',
                            }}
                          >
                            {item.on_time_prob}%
                          </span>
                        ) : (
                          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                            --
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {history.length === 0 && (
              <div className="text-center py-8">
                <History size={24} style={{ color: 'var(--color-text-muted)', margin: '0 auto', opacity: 0.4 }} />
                <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  No simulation runs yet. Results will appear here after you run a scenario.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
