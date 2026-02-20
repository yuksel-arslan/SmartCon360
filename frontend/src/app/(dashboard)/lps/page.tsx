'use client';

import TopBar from '@/components/layout/TopBar';
import { useState, useMemo, useCallback, useId, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ClipboardList, BarChart3, ChevronLeft, ChevronRight,
  Plus, Filter, GripVertical,
  TrendingUp, TrendingDown, AlertTriangle, Target, Users,
  ArrowUpRight, ArrowDownRight, Award, AlertCircle, X,
} from 'lucide-react';
import { DEMO_TRADES, DEMO_ZONES } from '@/lib/mockData';
import {
  getWeeklyCommitments,
  createWeeklyCommitment,
  updateCommitment as updateCommitmentAPI,
  getPPCHistory,
  getPPCByTrade,
  getVarianceAnalysis,
} from '@/lib/stores/progress-store';

// ─── Types ──────────────────────────────────────────────────────────────────

type MakeReadyStatus = 'can_do' | 'constraint' | 'in_progress';
type CommitmentStatus = 'committed' | 'completed' | 'failed';
type VarianceCategory = 'Design' | 'Material' | 'Equipment' | 'Labor' | 'Space' | 'Predecessor' | 'Permit' | 'Information';
type TabKey = 'lookahead' | 'weekly' | 'ppc';

interface LookaheadTask {
  id: string;
  trade: string;
  zone: string;
  description: string;
  weekIndex: number;
  status: MakeReadyStatus;
  constraintNote?: string;
}

interface Commitment {
  id: string;
  trade: string;
  tradeColor: string;
  zone: string;
  description: string;
  committedBy: string;
  status: CommitmentStatus;
  varianceReason?: VarianceCategory;
  weekId: string;
}

interface WeeklyPPC {
  weekLabel: string;
  weekId: string;
  ppc: number;
  committed: number;
  completed: number;
}

interface TradePPC {
  trade: string;
  color: string;
  ppc: number;
  committed: number;
  completed: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const VARIANCE_CATEGORIES: VarianceCategory[] = [
  'Design', 'Material', 'Equipment', 'Labor',
  'Space', 'Predecessor', 'Permit', 'Information',
];

const TRADES = DEMO_TRADES;
const ZONES = DEMO_ZONES;

const CREW_NAMES = [
  'M. Yilmaz', 'A. Demir', 'K. Ozturk', 'S. Kaya', 'B. Celik',
  'H. Arslan', 'E. Sahin', 'T. Aydin',
];

const TAB_CONFIG: { key: TabKey; label: string; icon: typeof Calendar }[] = [
  { key: 'lookahead', label: 'Lookahead', icon: Calendar },
  { key: 'weekly', label: 'Weekly Work Plan', icon: ClipboardList },
  { key: 'ppc', label: 'PPC Dashboard', icon: BarChart3 },
];

// ─── Mock Data Generation ───────────────────────────────────────────────────

function generateWeekDates(offset: number): { label: string; start: Date; end: Date }[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);

  return Array.from({ length: 6 }, (_, i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
    return { label: `${fmt(start)} - ${fmt(end)}`, start, end };
  });
}

const TASK_TEMPLATES: Record<string, string[]> = {
  Structure: ['Formwork installation', 'Rebar placement', 'Concrete pour', 'Post-tension stressing', 'Curing & strip'],
  'MEP Rough': ['HVAC duct routing', 'Plumbing rough-in', 'Electrical conduit', 'Fire sprinkler main', 'Sleeve install'],
  Drywall: ['Metal framing', 'Board installation', 'Taping & mud', 'Corner bead install', 'Sanding'],
  'MEP Finish': ['HVAC diffusers', 'Fixture trim-out', 'Switch & outlet', 'Testing & balance', 'Panel termination'],
  Flooring: ['Subfloor prep', 'Moisture testing', 'Tile layout', 'Grout & seal', 'Transition strips'],
  Paint: ['Surface prep', 'Primer coat', 'First coat', 'Second coat', 'Touch-up & punch'],
  Finishes: ['Ceiling grid', 'Ceiling tile', 'Door hardware', 'Signage install', 'Final clean'],
};

function generateLookaheadTasks(): LookaheadTask[] {
  const tasks: LookaheadTask[] = [];
  let id = 1;
  TRADES.forEach((trade) => {
    const templates = TASK_TEMPLATES[trade.name] || ['General work'];
    ZONES.slice(0, 4).forEach((zone, zIdx) => {
      const weekIdx = Math.min(zIdx + Math.floor(Math.random() * 2), 5);
      const taskIdx = id % templates.length;
      const statuses: MakeReadyStatus[] = ['can_do', 'can_do', 'can_do', 'in_progress', 'constraint'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      tasks.push({
        id: `lt-${id++}`,
        trade: trade.name,
        zone: zone.name,
        description: `${templates[taskIdx]} — ${zone.name.split(' — ')[1] || zone.name}`,
        weekIndex: weekIdx,
        status,
        constraintNote: status === 'constraint' ? VARIANCE_CATEGORIES[Math.floor(Math.random() * VARIANCE_CATEGORIES.length)] : undefined,
      });
    });
  });
  return tasks;
}

function generatePPCHistory(): WeeklyPPC[] {
  const ppcValues = [62, 65, 68, 71, 74, 78, 82, 85, 87, 89, 91, 93];
  return ppcValues.map((ppc, i) => {
    const committed = 24 + Math.floor(Math.random() * 8);
    const completed = Math.round((ppc / 100) * committed);
    return {
      weekLabel: `W${i + 1}`,
      weekId: `w-${i + 1}`,
      ppc,
      committed,
      completed,
    };
  });
}

function generateCurrentWeekCommitments(): Commitment[] {
  const commitments: Commitment[] = [];
  let id = 1;

  TRADES.forEach((trade) => {
    const templates = TASK_TEMPLATES[trade.name] || ['General work'];
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const zone = ZONES[i % ZONES.length];
      const isFailed = id === 8 || id === 19;
      const isCommitted = id > 26;
      commitments.push({
        id: `cm-${id++}`,
        trade: trade.name,
        tradeColor: trade.color,
        zone: zone.name.split(' — ')[1] || zone.name,
        description: templates[i % templates.length],
        committedBy: CREW_NAMES[Math.floor(Math.random() * CREW_NAMES.length)],
        status: isFailed ? 'failed' : isCommitted ? 'committed' : 'completed',
        varianceReason: isFailed ? (id === 8 ? 'Material' : 'Labor') : undefined,
        weekId: 'w-12',
      });
    }
  });

  return commitments.slice(0, 28);
}

function generateTradePPC(): TradePPC[] {
  const ppcByTrade = [95, 88, 92, 90, 96, 85, 91];
  return TRADES.map((trade, i) => {
    const committed = 4;
    const completed = Math.round((ppcByTrade[i] / 100) * committed);
    return {
      trade: trade.name,
      color: trade.color,
      ppc: ppcByTrade[i],
      committed,
      completed,
    };
  });
}

// Variance distribution: Material 35%, Labor 25%, Design 15%, Predecessor 10%, Equipment 8%, Space 5%, Information 2%
const VARIANCE_DATA: { category: VarianceCategory; count: number; pct: number }[] = [
  { category: 'Material', count: 14, pct: 35 },
  { category: 'Labor', count: 10, pct: 25 },
  { category: 'Design', count: 6, pct: 15 },
  { category: 'Predecessor', count: 4, pct: 10 },
  { category: 'Equipment', count: 3, pct: 8 },
  { category: 'Space', count: 2, pct: 5 },
  { category: 'Information', count: 1, pct: 2 },
];

// ─── Helper Components ──────────────────────────────────────────────────────

function StatusChip({ status, onClick }: { status: MakeReadyStatus; onClick?: () => void }) {
  const config = {
    can_do: { label: 'Can Do', bg: 'rgba(16,185,129,0.12)', color: 'var(--color-success)' },
    constraint: { label: 'Constraint', bg: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)' },
    in_progress: { label: 'In Progress', bg: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)' },
  };
  const c = config[status];
  return (
    <button
      onClick={onClick}
      className="text-[9px] font-semibold px-2 py-0.5 rounded-md transition-opacity hover:opacity-80"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </button>
  );
}

function CommitmentStatusChip({ status, onClick }: { status: CommitmentStatus; onClick?: () => void }) {
  const config = {
    committed: { label: 'Committed', bg: 'rgba(232,115,26,0.12)', color: 'var(--color-accent)' },
    completed: { label: 'Completed', bg: 'rgba(16,185,129,0.12)', color: 'var(--color-success)' },
    failed: { label: 'Failed', bg: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)' },
  };
  const c = config[status];
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80 cursor-pointer"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </button>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: typeof Calendar }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={16} style={{ color: 'var(--color-accent)' }} />}
      <h3 className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>{children}</h3>
    </div>
  );
}

// ─── Tab: Lookahead ─────────────────────────────────────────────────────────

function LookaheadTab() {
  const [tasks, setTasks] = useState<LookaheadTask[]>(generateLookaheadTasks);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<{ weekIndex: number; trade: string } | null>(null);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskZone, setNewTaskZone] = useState(ZONES[0].name);
  const [newTaskStatus, setNewTaskStatus] = useState<MakeReadyStatus>('can_do');
  const formId = useId();

  const weeks = useMemo(() => generateWeekDates(weekOffset), [weekOffset]);

  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'all') return TRADES;
    return TRADES.filter((t) => t.name === tradeFilter);
  }, [tradeFilter]);

  const tasksForCell = useCallback(
    (trade: string, weekIdx: number) =>
      tasks.filter((t) => t.trade === trade && t.weekIndex === weekIdx),
    [tasks],
  );

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDrop = (weekIndex: number) => {
    if (!draggedTaskId) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTaskId ? { ...t, weekIndex } : t)),
    );
    setDraggedTaskId(null);
  };

  const handleAddTask = () => {
    if (!showAddModal || !newTaskDesc.trim()) return;
    const newTask: LookaheadTask = {
      id: `lt-new-${Date.now()}`,
      trade: showAddModal.trade,
      zone: newTaskZone,
      description: newTaskDesc,
      weekIndex: showAddModal.weekIndex,
      status: newTaskStatus,
      constraintNote: newTaskStatus === 'constraint' ? 'Material' : undefined,
    };
    setTasks((prev) => [...prev, newTask]);
    setShowAddModal(null);
    setNewTaskDesc('');
    setNewTaskStatus('can_do');
  };

  const cycleStatus = (taskId: string) => {
    const order: MakeReadyStatus[] = ['can_do', 'in_progress', 'constraint'];
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextIdx = (order.indexOf(t.status) + 1) % order.length;
        const nextStatus = order[nextIdx];
        return {
          ...t,
          status: nextStatus,
          constraintNote: nextStatus === 'constraint' ? 'Material' : undefined,
        };
      }),
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
            aria-label="Previous weeks"
          >
            <ChevronLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-bg-input)', color: 'var(--color-text)' }}>
            {weeks[0]?.label.split(' - ')[0]} — {weeks[5]?.label.split(' - ')[1]}
          </span>
          <button
            onClick={() => setWeekOffset((p) => p + 1)}
            className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
            aria-label="Next weeks"
          >
            <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="text-[10px] font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-80"
            style={{ background: 'rgba(232,115,26,0.1)', color: 'var(--color-accent)' }}
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border outline-none cursor-pointer"
            style={{
              background: 'var(--color-bg-input)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <option value="all">All Trades</option>
            {TRADES.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status:</span>
        {([
          { status: 'can_do' as const, label: 'Can Do', color: 'var(--color-success)' },
          { status: 'in_progress' as const, label: 'In Progress', color: 'var(--color-warning)' },
          { status: 'constraint' as const, label: 'Constraint', color: 'var(--color-danger)' },
        ]).map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Week headers */}
          <div className="grid gap-1" style={{ gridTemplateColumns: '140px repeat(6, 1fr)' }}>
            <div className="p-2">
              <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>Trade</span>
            </div>
            {weeks.map((w, i) => (
              <div
                key={i}
                className="p-2 rounded-t-lg text-center"
                style={{ background: i === 0 ? 'rgba(232,115,26,0.08)' : 'transparent' }}
              >
                <div className="text-[10px] font-medium" style={{ color: i === 0 ? 'var(--color-accent)' : 'var(--color-text)' }}>
                  Week {weekOffset * 6 + i + 1}
                </div>
                <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{w.label}</div>
              </div>
            ))}
          </div>

          {/* Trade rows */}
          <AnimatePresence mode="popLayout">
            {filteredTrades.map((trade) => (
              <motion.div
                key={trade.name}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid gap-1 border-t"
                style={{ gridTemplateColumns: '140px repeat(6, 1fr)', borderColor: 'var(--color-border)' }}
              >
                {/* Trade name */}
                <div className="p-2 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: trade.color }} />
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>{trade.name}</span>
                </div>

                {/* Week cells */}
                {weeks.map((_, weekIdx) => {
                  const cellTasks = tasksForCell(trade.name, weekIdx);
                  return (
                    <div
                      key={weekIdx}
                      className="p-1.5 min-h-[72px] rounded-lg transition-colors relative group"
                      style={{
                        background: draggedTaskId ? 'rgba(232,115,26,0.04)' : 'transparent',
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(232,115,26,0.1)'; }}
                      onDragLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      onDrop={(e) => { e.preventDefault(); e.currentTarget.style.background = 'transparent'; handleDrop(weekIdx); }}
                    >
                      {cellTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onDragEnd={() => setDraggedTaskId(null)}
                          className="mb-1 p-1.5 rounded-md border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                          style={{
                            background: 'var(--color-bg-input)',
                            borderColor: task.status === 'constraint' ? 'var(--color-danger)' : task.status === 'in_progress' ? 'var(--color-warning)' : 'var(--color-border)',
                            borderLeftWidth: '3px',
                            borderLeftColor: task.status === 'constraint' ? 'var(--color-danger)' : task.status === 'in_progress' ? 'var(--color-warning)' : 'var(--color-success)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-medium leading-tight truncate" style={{ color: 'var(--color-text)' }}>
                                {task.description}
                              </p>
                              <p className="text-[8px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                                {task.zone.split(' — ')[1] || task.zone}
                              </p>
                            </div>
                            <GripVertical size={10} style={{ color: 'var(--color-text-muted)' }} className="flex-shrink-0 mt-0.5 opacity-40" />
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <StatusChip status={task.status} onClick={() => cycleStatus(task.id)} />
                            {task.constraintNote && (
                              <span className="text-[7px] font-semibold px-1 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}>
                                {task.constraintNote}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add button */}
                      <button
                        onClick={() => setShowAddModal({ weekIndex: weekIdx, trade: trade.name })}
                        className="w-full mt-0.5 py-1 rounded-md border border-dashed flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                        aria-label={`Add task for ${trade.name} in week ${weekIdx + 1}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowAddModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border p-5"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                  Add Lookahead Task
                </h3>
                <button onClick={() => setShowAddModal(null)} className="p-1 rounded-md hover:opacity-70" aria-label="Close">
                  <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{showAddModal.trade}</span>
                  <span>Week {weekOffset * 6 + showAddModal.weekIndex + 1}</span>
                </div>

                <div>
                  <label htmlFor={`${formId}-desc`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Task Description
                  </label>
                  <input
                    id={`${formId}-desc`}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="e.g. Install HVAC ductwork"
                    className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor={`${formId}-zone`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Zone
                  </label>
                  <select
                    id={`${formId}-zone`}
                    value={newTaskZone}
                    onChange={(e) => setNewTaskZone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border outline-none cursor-pointer"
                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={`${formId}-status`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Make-Ready Status
                  </label>
                  <select
                    id={`${formId}-status`}
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as MakeReadyStatus)}
                    className="w-full text-xs px-3 py-2 rounded-lg border outline-none cursor-pointer"
                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="can_do">Can Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="constraint">Constraint</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleAddTask}
                    className="flex-1 text-xs font-semibold py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    Add Task
                  </button>
                  <button
                    onClick={() => setShowAddModal(null)}
                    className="flex-1 text-xs font-semibold py-2 rounded-lg border transition-opacity hover:opacity-80"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Weekly Work Plan ──────────────────────────────────────────────────

function WeeklyWorkPlanTab() {
  const [commitments, setCommitments] = useState<Commitment[]>(generateCurrentWeekCommitments);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(11);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCommitment, setNewCommitment] = useState({
    trade: TRADES[0].name,
    zone: ZONES[0].name.split(' — ')[1] || ZONES[0].name,
    description: '',
    committedBy: '',
  });
  const formId = useId();

  const ppcHistory = useMemo(() => generatePPCHistory(), []);
  const currentWeek = ppcHistory[selectedWeekIdx];

  const weekCommitments = useMemo(
    () => commitments.filter((c) => c.weekId === currentWeek.weekId),
    [commitments, currentWeek.weekId],
  );

  const completedCount = weekCommitments.filter((c) => c.status === 'completed').length;
  const failedCount = weekCommitments.filter((c) => c.status === 'failed').length;
  const committedCount = weekCommitments.filter((c) => c.status === 'committed').length;
  const ppc = weekCommitments.length > 0
    ? Math.round((completedCount / weekCommitments.length) * 100)
    : 0;

  const cycleStatus = (id: string) => {
    const order: CommitmentStatus[] = ['committed', 'completed', 'failed'];
    setCommitments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextIdx = (order.indexOf(c.status) + 1) % order.length;
        return { ...c, status: order[nextIdx], varianceReason: order[nextIdx] === 'failed' ? 'Material' : undefined };
      }),
    );
  };

  const updateVariance = (id: string, reason: VarianceCategory) => {
    setCommitments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, varianceReason: reason } : c)),
    );
  };

  const addCommitment = async () => {
    if (!newCommitment.description.trim() || !newCommitment.committedBy.trim()) return;
    const trade = TRADES.find((t) => t.name === newCommitment.trade);
    const c: Commitment = {
      id: `cm-new-${Date.now()}`,
      trade: newCommitment.trade,
      tradeColor: trade?.color || '#94A3B8',
      zone: newCommitment.zone,
      description: newCommitment.description,
      committedBy: newCommitment.committedBy,
      status: 'committed',
      weekId: currentWeek.weekId,
    };
    setCommitments((prev) => [...prev, c]);
    setShowAddForm(false);
    setNewCommitment({ trade: TRADES[0].name, zone: ZONES[0].name.split(' — ')[1] || ZONES[0].name, description: '', committedBy: '' });

    // Persist to API
    try {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      await createWeeklyCommitment({
        projectId: 'demo-project-001',
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: friday.toISOString().split('T')[0],
        tradeId: trade?.name || c.trade,
        tradeName: c.trade,
        zoneId: c.zone,
        zoneName: c.zone,
        description: c.description,
        committed: true,
      });
    } catch { /* API unavailable — local state updated */ }
  };

  return (
    <div className="space-y-4">
      {/* Week selector and header */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setSelectedWeekIdx((p) => Math.max(0, p - 1))}
                className="w-7 h-7 rounded-md border flex items-center justify-center hover:opacity-80"
                style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
                aria-label="Previous week"
              >
                <ChevronLeft size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
              <h3 className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                {currentWeek.weekLabel} — Weekly Work Plan
              </h3>
              <button
                onClick={() => setSelectedWeekIdx((p) => Math.min(ppcHistory.length - 1, p + 1))}
                className="w-7 h-7 rounded-md border flex items-center justify-center hover:opacity-80"
                style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
                aria-label="Next week"
              >
                <ChevronRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
              </button>
              {selectedWeekIdx === 11 && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(232,115,26,0.1)', color: 'var(--color-accent)' }}>
                  Current
                </span>
              )}
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              10 Feb - 14 Feb 2026 &middot; PPC Target: 85%
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus size={14} />
            Add Commitment
          </button>
        </div>
      </Card>

      {/* Add Commitment Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label htmlFor={`${formId}-trade`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Trade</label>
                  <select
                    id={`${formId}-trade`}
                    value={newCommitment.trade}
                    onChange={(e) => setNewCommitment((p) => ({ ...p, trade: e.target.value }))}
                    className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border outline-none"
                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {TRADES.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${formId}-zone`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Zone</label>
                  <select
                    id={`${formId}-zone`}
                    value={newCommitment.zone}
                    onChange={(e) => setNewCommitment((p) => ({ ...p, zone: e.target.value }))}
                    className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border outline-none"
                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {ZONES.map((z) => <option key={z.id} value={z.name.split(' — ')[1] || z.name}>{z.name.split(' — ')[1] || z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${formId}-desc`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Description</label>
                  <input
                    id={`${formId}-desc`}
                    value={newCommitment.description}
                    onChange={(e) => setNewCommitment((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Task description"
                    className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border outline-none"
                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-by`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Committed By</label>
                  <input
                    id={`${formId}-by`}
                    value={newCommitment.committedBy}
                    onChange={(e) => setNewCommitment((p) => ({ ...p, committedBy: e.target.value }))}
                    placeholder="Person name"
                    className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border outline-none"
                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={addCommitment}
                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg text-white hover:opacity-90"
                    style={{ background: 'var(--color-success)' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border hover:opacity-80"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Committed', value: weekCommitments.length, color: 'var(--color-text)' },
          { label: 'Completed', value: completedCount, color: 'var(--color-success)' },
          { label: 'Failed', value: failedCount, color: 'var(--color-danger)' },
          { label: 'PPC', value: `${ppc}%`, color: ppc >= 85 ? 'var(--color-success)' : ppc >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' },
        ].map((stat) => (
          <Card key={stat.label} className="p-3 text-center">
            <div className="text-2xl font-medium" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {stat.label}
            </div>
          </Card>
        ))}
      </div>

      {/* Commitment table */}
      <Card className="overflow-hidden">
        {/* Table header */}
        <div
          className="grid gap-2 px-4 py-2.5 border-b text-[10px] font-semibold uppercase tracking-wide"
          style={{
            gridTemplateColumns: '100px 80px 1fr 100px 90px 120px',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>Trade</span>
          <span>Zone</span>
          <span>Task Description</span>
          <span>Committed By</span>
          <span>Status</span>
          <span>Variance Reason</span>
        </div>

        {/* Desktop table rows */}
        <div className="hidden lg:block">
          <AnimatePresence mode="popLayout">
            {weekCommitments.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="grid gap-2 px-4 py-2.5 border-b items-center"
                style={{
                  gridTemplateColumns: '100px 80px 1fr 100px 90px 120px',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c.tradeColor }} />
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>{c.trade}</span>
                </div>
                <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{c.zone}</span>
                <span className="text-[11px]" style={{ color: 'var(--color-text)' }}>{c.description}</span>
                <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{c.committedBy}</span>
                <CommitmentStatusChip status={c.status} onClick={() => cycleStatus(c.id)} />
                {c.status === 'failed' ? (
                  <select
                    value={c.varianceReason || ''}
                    onChange={(e) => updateVariance(c.id, e.target.value as VarianceCategory)}
                    className="text-[10px] px-2 py-1 rounded-md border outline-none"
                    style={{
                      background: 'rgba(239,68,68,0.06)',
                      borderColor: 'var(--color-danger)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    {VARIANCE_CATEGORIES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>--</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Mobile card rows */}
        <div className="lg:hidden divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {weekCommitments.map((c) => (
            <div key={c.id} className="p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.tradeColor }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>{c.trade}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{c.zone}</span>
                </div>
                <CommitmentStatusChip status={c.status} onClick={() => cycleStatus(c.id)} />
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{c.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{c.committedBy}</span>
                {c.status === 'failed' && (
                  <select
                    value={c.varianceReason || ''}
                    onChange={(e) => updateVariance(c.id, e.target.value as VarianceCategory)}
                    className="text-[10px] px-2 py-0.5 rounded-md border outline-none"
                    style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                  >
                    {VARIANCE_CATEGORIES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: PPC Dashboard ─────────────────────────────────────────────────────

function PPCLineChart({ data }: { data: WeeklyPPC[] }) {
  const width = 560;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minPPC = Math.max(0, Math.min(...data.map((d) => d.ppc)) - 10);
  const maxPPC = 100;

  const scaleX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const scaleY = (v: number) => padding.top + chartH - ((v - minPPC) / (maxPPC - minPPC)) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.ppc)}`)
    .join(' ');

  const areaPath = `${linePath} L ${scaleX(data.length - 1)} ${scaleY(minPPC)} L ${scaleX(0)} ${scaleY(minPPC)} Z`;

  const targetY = scaleY(85);

  // Color zones
  const greenZoneY = scaleY(maxPPC);
  const yellowZoneY = scaleY(85);
  const redZoneY = scaleY(70);
  const bottomY = scaleY(minPPC);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '240px' }}>
      {/* Color zone backgrounds */}
      <rect x={padding.left} y={greenZoneY} width={chartW} height={yellowZoneY - greenZoneY} fill="rgba(16,185,129,0.04)" />
      <rect x={padding.left} y={yellowZoneY} width={chartW} height={redZoneY - yellowZoneY} fill="rgba(245,158,11,0.04)" />
      <rect x={padding.left} y={redZoneY} width={chartW} height={bottomY - redZoneY} fill="rgba(239,68,68,0.04)" />

      {/* Grid lines */}
      {[60, 70, 80, 85, 90, 100].filter((v) => v >= minPPC).map((v) => (
        <g key={v}>
          <line
            x1={padding.left} y1={scaleY(v)} x2={padding.left + chartW} y2={scaleY(v)}
            stroke="var(--color-border)" strokeWidth={v === 85 ? 1.5 : 0.5}
            strokeDasharray={v === 85 ? '6 3' : '2 4'}
          />
          <text x={padding.left - 6} y={scaleY(v) + 3} textAnchor="end" fontSize="9" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
            {v}%
          </text>
        </g>
      ))}

      {/* Target label */}
      <text x={padding.left + chartW + 2} y={targetY + 3} fontSize="8" fill="var(--color-success)" fontWeight="600">
        Target
      </text>

      {/* Area fill */}
      <path d={areaPath} fill="url(#ppcGradient)" opacity={0.3} />
      <defs>
        <linearGradient id="ppcGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Line */}
      <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {data.map((d, i) => {
        const color = d.ppc >= 85 ? 'var(--color-success)' : d.ppc >= 70 ? 'var(--color-warning)' : 'var(--color-danger)';
        return (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(d.ppc)} r={4} fill={color} stroke="var(--color-bg-card)" strokeWidth={2} />
            <text x={scaleX(i)} y={scaleY(d.ppc) - 10} textAnchor="middle" fontSize="8" fill={color} fontWeight="600" fontFamily="var(--font-mono)">
              {d.ppc}%
            </text>
            <text x={scaleX(i)} y={height - 6} textAnchor="middle" fontSize="8" fill="var(--color-text-muted)">
              {d.weekLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TradeBarChart({ data }: { data: TradePPC[] }) {
  const maxPPC = 100;
  const barWidth = 40;
  const gap = 12;
  const width = data.length * (barWidth + gap) + 50;
  const height = 160;
  const padding = { top: 20, bottom: 30, left: 40 };
  const chartH = height - padding.top - padding.bottom;

  const scaleY = (v: number) => padding.top + chartH - (v / maxPPC) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '180px' }}>
      {/* Grid */}
      {[50, 70, 85, 100].map((v) => (
        <g key={v}>
          <line
            x1={padding.left} y1={scaleY(v)} x2={width} y2={scaleY(v)}
            stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="2 4"
          />
          <text x={padding.left - 5} y={scaleY(v) + 3} textAnchor="end" fontSize="8" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
            {v}%
          </text>
        </g>
      ))}

      {/* Target line */}
      <line
        x1={padding.left} y1={scaleY(85)} x2={width} y2={scaleY(85)}
        stroke="var(--color-success)" strokeWidth={1} strokeDasharray="4 3"
      />

      {/* Bars */}
      {data.map((d, i) => {
        const x = padding.left + 10 + i * (barWidth + gap);
        const barH = (d.ppc / maxPPC) * chartH;
        const y = scaleY(d.ppc);
        return (
          <g key={d.trade}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={d.color} opacity={0.85} />
            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="8" fontWeight="600" fill={d.color} fontFamily="var(--font-mono)">
              {d.ppc}%
            </text>
            <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" fontSize="7" fill="var(--color-text-muted)" fontWeight="500">
              {d.trade.length > 8 ? d.trade.substring(0, 7) + '..' : d.trade}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function VarianceParetoChart({ data }: { data: typeof VARIANCE_DATA }) {
  const maxCount = Math.max(...data.map((d) => d.count));
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const barWidth = (d.count / maxCount) * 100;
        const color = d.pct >= 25 ? 'var(--color-danger)' : d.pct >= 10 ? 'var(--color-warning)' : 'var(--color-accent)';
        return (
          <div key={d.category} className="flex items-center gap-2">
            <span className="text-[10px] font-medium w-24 text-right flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
              {d.category}
            </span>
            <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'var(--color-bg-input)' }}>
              <div
                className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-1.5"
                style={{ width: `${barWidth}%`, background: color, minWidth: '24px' }}
              >
                <span className="text-[8px] font-medium text-white">{d.pct}%</span>
              </div>
            </div>
            <span className="text-[9px] font-mono w-6 text-right flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PPCDashboardTab() {
  const [ppcHistory, setPpcHistory] = useState<WeeklyPPC[]>(generatePPCHistory);
  const [tradePPC, setTradePPC] = useState<TradePPC[]>(generateTradePPC);

  useEffect(() => {
    const projectId = 'demo-project-001';
    (async () => {
      try {
        const result = await getPPCHistory(projectId);
        if (result.data.length > 0) {
          setPpcHistory(result.data.map((r, i) => ({
            weekLabel: `W${i + 1}`,
            weekId: r.id,
            ppc: r.ppcPercent,
            committed: r.totalCommitted,
            completed: r.totalCompleted,
          })));
        }
      } catch { /* fallback to generated data */ }
      try {
        const tradeData = await getPPCByTrade(projectId);
        if (tradeData.byTrade && tradeData.byTrade.length > 0) {
          setTradePPC(tradeData.byTrade.map((t) => ({
            trade: t.tradeName,
            color: TRADES.find((tr) => tr.name === t.tradeName)?.color || '#94A3B8',
            ppc: t.ppc,
            committed: t.committed,
            completed: t.completed,
          })));
        }
      } catch { /* fallback to generated data */ }
    })();
  }, []);

  const currentPPC = ppcHistory[ppcHistory.length - 1].ppc;
  const prevPPC = ppcHistory[ppcHistory.length - 2].ppc;
  const ppcDelta = currentPPC - prevPPC;
  const isImproving = ppcDelta >= 0;

  const avgPPC4Weeks = Math.round(
    ppcHistory.slice(-4).reduce((sum, w) => sum + w.ppc, 0) / 4,
  );

  const bestTrade = tradePPC.reduce((a, b) => (a.ppc > b.ppc ? a : b));
  const topVariance = VARIANCE_DATA[0];

  return (
    <div className="space-y-4">
      {/* Key metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current PPC */}
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Current PPC</div>
              <div className="text-4xl font-medium mt-1" style={{
                fontFamily: 'var(--font-display)',
                color: currentPPC >= 85 ? 'var(--color-success)' : currentPPC >= 70 ? 'var(--color-warning)' : 'var(--color-danger)',
              }}>
                {currentPPC}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                {isImproving ? (
                  <ArrowUpRight size={12} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <ArrowDownRight size={12} style={{ color: 'var(--color-danger)' }} />
                )}
                <span className="text-[10px] font-semibold" style={{ color: isImproving ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {isImproving ? '+' : ''}{ppcDelta}% from last week
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Target size={20} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
        </Card>

        {/* Average PPC */}
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Avg PPC (4 Weeks)</div>
              <div className="text-4xl font-medium mt-1" style={{
                fontFamily: 'var(--font-display)',
                color: avgPPC4Weeks >= 85 ? 'var(--color-success)' : 'var(--color-warning)',
              }}>
                {avgPPC4Weeks}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp size={12} style={{ color: 'var(--color-success)' }} />
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-success)' }}>Improving trend</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232,115,26,0.1)' }}>
              <BarChart3 size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
          </div>
        </Card>

        {/* Best trade */}
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Best Trade</div>
              <div className="text-lg font-medium mt-1" style={{ fontFamily: 'var(--font-display)', color: bestTrade.color }}>
                {bestTrade.trade}
              </div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                {bestTrade.ppc}% PPC
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,63,0.1)' }}>
              <Award size={20} style={{ color: 'var(--color-purple)' }} />
            </div>
          </div>
        </Card>

        {/* Top variance reason */}
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Top Variance</div>
              <div className="text-lg font-medium mt-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-danger)' }}>
                {topVariance.category}
              </div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>
                {topVariance.pct}% of failures
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Improvement indicator */}
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: isImproving ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}
          >
            {isImproving ? (
              <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
            ) : (
              <TrendingDown size={16} style={{ color: 'var(--color-danger)' }} />
            )}
          </div>
          <div>
            <span className="text-[11px] font-semibold" style={{ color: isImproving ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {isImproving ? 'PPC is improving' : 'PPC is declining'}
            </span>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {isImproving
                ? `PPC has grown from ${ppcHistory[0].ppc}% to ${currentPPC}% over 12 weeks. Sustained improvement of +${currentPPC - ppcHistory[0].ppc} percentage points.`
                : 'Consider reviewing constraint management and resource allocation.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PPC Trend Line Chart */}
        <Card className="p-5">
          <SectionTitle icon={TrendingUp}>PPC Trend (12 Weeks)</SectionTitle>
          <PPCLineChart data={ppcHistory} />
        </Card>

        {/* PPC by Trade */}
        <Card className="p-5">
          <SectionTitle icon={Users}>PPC by Trade (Current Week)</SectionTitle>
          <TradeBarChart data={tradePPC} />
        </Card>
      </div>

      {/* Variance Pareto */}
      <Card className="p-5">
        <SectionTitle icon={AlertTriangle}>Variance Pareto Analysis</SectionTitle>
        <p className="text-[10px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Root cause distribution of failed commitments across all weeks. Focus improvement efforts on the top categories.
        </p>
        <VarianceParetoChart data={VARIANCE_DATA} />
      </Card>

      {/* Detailed PPC table */}
      <Card className="p-5">
        <SectionTitle icon={ClipboardList}>Weekly PPC History</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left pb-2 font-semibold">Week</th>
                <th className="text-right pb-2 font-semibold">Committed</th>
                <th className="text-right pb-2 font-semibold">Completed</th>
                <th className="text-right pb-2 font-semibold">PPC</th>
                <th className="text-right pb-2 font-semibold">Trend</th>
              </tr>
            </thead>
            <tbody>
              {ppcHistory.map((w, i) => {
                const prev = i > 0 ? ppcHistory[i - 1].ppc : w.ppc;
                const delta = w.ppc - prev;
                const ppcColor = w.ppc >= 85 ? 'var(--color-success)' : w.ppc >= 70 ? 'var(--color-warning)' : 'var(--color-danger)';
                return (
                  <tr key={w.weekId} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="py-2 font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{w.weekLabel}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{w.committed}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{w.completed}</td>
                    <td className="py-2 text-right font-medium" style={{ color: ppcColor, fontFamily: 'var(--font-mono)' }}>{w.ppc}%</td>
                    <td className="py-2 text-right">
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
                        style={{ color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                      >
                        {delta >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {delta >= 0 ? '+' : ''}{delta}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Main LPS Page ──────────────────────────────────────────────────────────

export default function LPSPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('lookahead');

  return (
    <>
      <TopBar title="Last Planner System" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--color-bg-input)' }}>
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(e) => {
                  const idx = TAB_CONFIG.findIndex((t) => t.key === activeTab);
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const next = TAB_CONFIG[(idx + 1) % TAB_CONFIG.length];
                    setActiveTab(next.key);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prev = TAB_CONFIG[(idx - 1 + TAB_CONFIG.length) % TAB_CONFIG.length];
                    setActiveTab(prev.key);
                  }
                }}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center"
                style={{
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="lps-tab-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: 'var(--color-bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'lookahead' && <LookaheadTab />}
            {activeTab === 'weekly' && <WeeklyWorkPlanTab />}
            {activeTab === 'ppc' && <PPCDashboardTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
