'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { DEMO_ZONES, DEMO_TRADES } from '@/lib/mockData';
import {
  calculateTotalPeriods,
  generateTaktGrid,
  detectTradeStacking,
  type ZoneInput,
  type WagonInput,
  type Assignment,
} from '@/lib/core/takt-calculator';
import {
  GripVertical,
  Plus,
  Save,
  Undo2,
  Redo2,
  Play,
  CheckCircle,
  Clock,
  CalendarDays,
  AlertTriangle,
  ShieldAlert,
  ArrowRightLeft,
  X,
  ChevronRight,
  Users,
  StickyNote,
  Layers,
  Timer,
  Calendar,
  Hash,
  Activity,
  TrendingUp,
  Shield,
  Loader2,
  Check,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

type CellStatus = 'completed' | 'in_progress' | 'planned' | 'delayed';

interface TradeRow {
  id: string;
  name: string;
  color: string;
  sequence: number;
  taktTime: number;
  bufferAfter: number;
  crewSize: number;
  notes: string;
}

interface Zone {
  id: string;
  name: string;
  sequence: number;
}

interface GridCell {
  tradeId: string;
  zoneId: string;
  periodNumber: number;
  plannedStart: Date;
  plannedEnd: Date;
  status: CellStatus;
  crewSize: number;
  notes: string;
}

interface SelectedCell {
  tradeId: string;
  zoneId: string;
}

interface Warning {
  id: string;
  type: 'stacking' | 'buffer' | 'predecessor';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
}

interface HistoryState {
  trades: TradeRow[];
  zones: Zone[];
  globalTaktTime: number;
  globalBuffer: number;
  cellOverrides: Record<string, Partial<GridCell>>;
}

// ── Initial Data ───────────────────────────────────────────────

const PROJECT_START = new Date('2026-02-16');

function buildInitialTrades(): TradeRow[] {
  return DEMO_TRADES.map((t, i) => ({
    id: `trade-${i}`,
    name: t.name,
    color: t.color,
    sequence: i + 1,
    taktTime: 5,
    bufferAfter: i < DEMO_TRADES.length - 1 ? 1 : 0,
    crewSize: Math.floor(Math.random() * 6) + 4,
    notes: '',
  }));
}

function buildInitialZones(): Zone[] {
  return DEMO_ZONES.map((z, i) => ({
    id: z.id,
    name: z.name,
    sequence: i + 1,
  }));
}

// ── Status Helpers ─────────────────────────────────────────────

const STATUS_CONFIG: Record<CellStatus, { bg: string; text: string; label: string; icon: typeof CheckCircle }> = {
  completed: { bg: 'rgba(16,185,129,0.15)', text: 'var(--color-success)', label: 'Completed', icon: CheckCircle },
  in_progress: { bg: 'rgba(232,115,26,0.15)', text: 'var(--color-accent)', label: 'In Progress', icon: Clock },
  planned: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)', label: 'Planned', icon: CalendarDays },
  delayed: { bg: 'rgba(239,68,68,0.15)', text: 'var(--color-danger)', label: 'Delayed', icon: AlertTriangle },
};

const STATUS_SYMBOLS: Record<CellStatus, string> = {
  completed: '\u2713',
  in_progress: '\u25CF',
  planned: '\u25CB',
  delayed: '\u26A0',
};

function computeCellStatus(periodNumber: number, totalPeriods: number): CellStatus {
  const progressFraction = 0.35;
  const completedThreshold = Math.floor(totalPeriods * progressFraction);
  const inProgressThreshold = completedThreshold + 2;

  if (periodNumber <= completedThreshold) return 'completed';
  if (periodNumber <= inProgressThreshold) return 'in_progress';
  return 'planned';
}

// ── Grid Computation ───────────────────────────────────────────

function computeGrid(
  trades: TradeRow[],
  zones: Zone[],
  globalTaktTime: number,
  cellOverrides: Record<string, Partial<GridCell>>,
): { cells: Map<string, GridCell>; assignments: Assignment[]; totalPeriods: number } {
  const zoneInputs: ZoneInput[] = zones.map((z) => ({
    id: z.id,
    name: z.name,
    sequence: z.sequence,
  }));

  const wagonInputs: WagonInput[] = trades.map((t) => ({
    id: t.id,
    tradeId: t.id,
    sequence: t.sequence,
    durationDays: t.taktTime || globalTaktTime,
    bufferAfter: t.bufferAfter,
  }));

  const assignments = generateTaktGrid(zoneInputs, wagonInputs, PROJECT_START, globalTaktTime);
  const totalPeriods = calculateTotalPeriods(zones.length, trades.length, trades.reduce((sum, t, i) => sum + (i < trades.length - 1 ? t.bufferAfter : 0), 0) / Math.max(trades.length - 1, 1));

  const maxPeriod = Math.max(...assignments.map((a) => a.periodNumber), 1);

  const cells = new Map<string, GridCell>();
  for (const a of assignments) {
    const key = `${a.wagonId}::${a.zoneId}`;
    const trade = trades.find((t) => t.id === a.wagonId);
    const override = cellOverrides[key];

    cells.set(key, {
      tradeId: a.wagonId,
      zoneId: a.zoneId,
      periodNumber: a.periodNumber,
      plannedStart: a.plannedStart,
      plannedEnd: a.plannedEnd,
      status: override?.status ?? computeCellStatus(a.periodNumber, maxPeriod),
      crewSize: override?.crewSize ?? trade?.crewSize ?? 5,
      notes: override?.notes ?? '',
    });
  }

  return { cells, assignments, totalPeriods: maxPeriod };
}

// ── Warning Detection ──────────────────────────────────────────

function detectWarnings(
  trades: TradeRow[],
  zones: Zone[],
  assignments: Assignment[],
): Warning[] {
  const warnings: Warning[] = [];

  // Detect trade stacking
  const stacking = detectTradeStacking(assignments);
  for (const conflict of stacking) {
    const t1 = trades.find((t) => t.id === conflict.wagon1);
    const t2 = trades.find((t) => t.id === conflict.wagon2);
    const zone = zones.find((z) => z.id === conflict.zoneId);
    warnings.push({
      id: `stack-${conflict.wagon1}-${conflict.wagon2}-${conflict.zoneId}`,
      type: 'stacking',
      severity: 'critical',
      message: `Trade stacking: ${t1?.name ?? conflict.wagon1} & ${t2?.name ?? conflict.wagon2}`,
      details: `Overlap in ${zone?.name ?? conflict.zoneId} during periods T${conflict.period1}-T${conflict.period2} (${conflict.overlapStart} to ${conflict.overlapEnd})`,
    });
  }

  // Detect buffer warnings
  const sortedTrades = [...trades].sort((a, b) => a.sequence - b.sequence);
  for (let i = 0; i < sortedTrades.length - 1; i++) {
    const t = sortedTrades[i];
    if (t.bufferAfter === 0) {
      warnings.push({
        id: `buffer-${t.id}`,
        type: 'buffer',
        severity: 'warning',
        message: `No buffer between ${t.name} and ${sortedTrades[i + 1].name}`,
        details: `Zero buffer days may cause trade stacking if ${t.name} is delayed. Recommended: at least 1 buffer period.`,
      });
    }
  }

  // Detect predecessor violations (simplified: trades should follow sequence order)
  for (let i = 1; i < sortedTrades.length; i++) {
    const current = sortedTrades[i];
    const predecessor = sortedTrades[i - 1];
    if (current.sequence <= predecessor.sequence) {
      warnings.push({
        id: `pred-${current.id}`,
        type: 'predecessor',
        severity: 'warning',
        message: `Sequence conflict: ${current.name} at position ${current.sequence}`,
        details: `${current.name} should follow ${predecessor.name} in the trade sequence.`,
      });
    }
  }

  return warnings;
}

// ── Format Date ────────────────────────────────────────────────

function formatDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatDateFull(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Main Component ─────────────────────────────────────────────

export default function TaktEditorPage() {
  // ── Core State ──
  const [trades, setTrades] = useState<TradeRow[]>(buildInitialTrades);
  const [zones, setZones] = useState<Zone[]>(buildInitialZones);
  const [globalTaktTime, setGlobalTaktTime] = useState(5);
  const [globalBuffer, setGlobalBuffer] = useState(1);
  const [cellOverrides, setCellOverrides] = useState<Record<string, Partial<GridCell>>>({});

  // ── UI State ──
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [editingField, setEditingField] = useState<{ tradeId: string; field: 'taktTime' | 'buffer' | 'crewSize' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newTradeName, setNewTradeName] = useState('');
  const [newTradeColor, setNewTradeColor] = useState('#6366F1');
  const [newZoneName, setNewZoneName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // ── Drag & Drop State ──
  const [draggedTradeId, setDraggedTradeId] = useState<string | null>(null);
  const [dragOverTradeId, setDragOverTradeId] = useState<string | null>(null);

  // ── History (Undo/Redo) ──
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const snapshot: HistoryState = {
      trades: JSON.parse(JSON.stringify(trades)),
      zones: JSON.parse(JSON.stringify(zones)),
      globalTaktTime,
      globalBuffer,
      cellOverrides: JSON.parse(JSON.stringify(cellOverrides)),
    };
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [trades, zones, globalTaktTime, globalBuffer, cellOverrides, historyIndex]);

  // Push initial state
  useEffect(() => {
    if (history.length === 0) {
      const snapshot: HistoryState = {
        trades: JSON.parse(JSON.stringify(trades)),
        zones: JSON.parse(JSON.stringify(zones)),
        globalTaktTime,
        globalBuffer,
        cellOverrides: JSON.parse(JSON.stringify(cellOverrides)),
      };
      setHistory([snapshot]);
      setHistoryIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedoRef.current = true;
    const prevState = history[historyIndex - 1];
    setTrades(prevState.trades);
    setZones(prevState.zones);
    setGlobalTaktTime(prevState.globalTaktTime);
    setGlobalBuffer(prevState.globalBuffer);
    setCellOverrides(prevState.cellOverrides);
    setHistoryIndex((i) => i - 1);
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedoRef.current = true;
    const nextState = history[historyIndex + 1];
    setTrades(nextState.trades);
    setZones(nextState.zones);
    setGlobalTaktTime(nextState.globalTaktTime);
    setGlobalBuffer(nextState.globalBuffer);
    setCellOverrides(nextState.cellOverrides);
    setHistoryIndex((i) => i + 1);
  }, [canRedo, history, historyIndex]);

  // ── Computed Grid ──
  const { cells, assignments, totalPeriods } = useMemo(
    () => computeGrid(trades, zones, globalTaktTime, cellOverrides),
    [trades, zones, globalTaktTime, cellOverrides],
  );

  // ── Warnings ──
  const warnings = useMemo(
    () => detectWarnings(trades, zones, assignments),
    [trades, zones, assignments],
  );

  // ── Statistics ──
  const stats = useMemo(() => {
    const allCells = Array.from(cells.values());
    const completedCount = allCells.filter((c) => c.status === 'completed').length;
    const inProgressCount = allCells.filter((c) => c.status === 'in_progress').length;
    const delayedCount = allCells.filter((c) => c.status === 'delayed').length;
    const totalCells = allCells.length;

    const minStart = allCells.length > 0 ? new Date(Math.min(...allCells.map((c) => c.plannedStart.getTime()))) : PROJECT_START;
    const maxEnd = allCells.length > 0 ? new Date(Math.max(...allCells.map((c) => c.plannedEnd.getTime()))) : PROJECT_START;

    const diffMs = maxEnd.getTime() - minStart.getTime();
    const totalDurationDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const stackingCount = warnings.filter((w) => w.type === 'stacking').length;
    const bufferWarningCount = warnings.filter((w) => w.type === 'buffer').length;
    const totalBufferSlots = Math.max(trades.length - 1, 0);
    const healthyBuffers = totalBufferSlots - bufferWarningCount;
    const bufferHealth = totalBufferSlots > 0 ? Math.round((healthyBuffers / totalBufferSlots) * 100) : 100;

    return {
      totalPeriods,
      totalDurationDays,
      startDate: minStart,
      endDate: maxEnd,
      tradeCount: trades.length,
      zoneCount: zones.length,
      stackingCount,
      bufferHealth,
      completedCount,
      inProgressCount,
      delayedCount,
      totalCells,
    };
  }, [cells, warnings, trades, zones, totalPeriods]);

  // ── Selected Cell Data ──
  const selectedCellData = useMemo(() => {
    if (!selectedCell) return null;
    const key = `${selectedCell.tradeId}::${selectedCell.zoneId}`;
    const cell = cells.get(key);
    const trade = trades.find((t) => t.id === selectedCell.tradeId);
    const zone = zones.find((z) => z.id === selectedCell.zoneId);
    if (!cell || !trade || !zone) return null;

    const sortedTrades = [...trades].sort((a, b) => a.sequence - b.sequence);
    const tradeIndex = sortedTrades.findIndex((t) => t.id === trade.id);
    const predecessor = tradeIndex > 0 ? sortedTrades[tradeIndex - 1] : null;
    const successor = tradeIndex < sortedTrades.length - 1 ? sortedTrades[tradeIndex + 1] : null;

    return { cell, trade, zone, predecessor, successor };
  }, [selectedCell, cells, trades, zones]);

  // ── Drag & Drop Handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, tradeId: string) => {
    setDraggedTradeId(tradeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tradeId);
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    setDraggedTradeId(null);
    setDragOverTradeId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, tradeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTradeId(tradeId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTradeId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetTradeId: string) => {
    e.preventDefault();
    const sourceTradeId = e.dataTransfer.getData('text/plain');
    if (!sourceTradeId || sourceTradeId === targetTradeId) {
      setDraggedTradeId(null);
      setDragOverTradeId(null);
      return;
    }

    pushHistory();

    setTrades((prev) => {
      const sorted = [...prev].sort((a, b) => a.sequence - b.sequence);
      const sourceIdx = sorted.findIndex((t) => t.id === sourceTradeId);
      const targetIdx = sorted.findIndex((t) => t.id === targetTradeId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const [moved] = sorted.splice(sourceIdx, 1);
      sorted.splice(targetIdx, 0, moved);

      return sorted.map((t, i) => ({ ...t, sequence: i + 1 }));
    });

    setDraggedTradeId(null);
    setDragOverTradeId(null);
  }, [pushHistory]);

  // ── Inline Edit Handlers ──
  const startInlineEdit = useCallback((tradeId: string, field: 'taktTime' | 'buffer' | 'crewSize', currentValue: number) => {
    setEditingField({ tradeId, field });
    setEditValue(String(currentValue));
  }, []);

  const commitInlineEdit = useCallback(() => {
    if (!editingField) return;
    const numValue = parseInt(editValue, 10);
    if (isNaN(numValue) || numValue < 0) {
      setEditingField(null);
      return;
    }

    pushHistory();

    setTrades((prev) =>
      prev.map((t) => {
        if (t.id !== editingField.tradeId) return t;
        if (editingField.field === 'taktTime') return { ...t, taktTime: Math.max(1, Math.min(numValue, 20)) };
        if (editingField.field === 'buffer') return { ...t, bufferAfter: Math.max(0, Math.min(numValue, 10)) };
        if (editingField.field === 'crewSize') return { ...t, crewSize: Math.max(1, Math.min(numValue, 50)) };
        return t;
      }),
    );
    setEditingField(null);
  }, [editingField, editValue, pushHistory]);

  const handleInlineKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitInlineEdit();
    if (e.key === 'Escape') setEditingField(null);
  }, [commitInlineEdit]);

  // ── Cell Click ──
  const handleCellClick = useCallback((tradeId: string, zoneId: string) => {
    setSelectedCell((prev) =>
      prev?.tradeId === tradeId && prev?.zoneId === zoneId ? null : { tradeId, zoneId },
    );
  }, []);

  // ── Status Change from Panel ──
  const handleStatusChange = useCallback((status: CellStatus) => {
    if (!selectedCell) return;
    pushHistory();
    const key = `${selectedCell.tradeId}::${selectedCell.zoneId}`;
    setCellOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], status },
    }));
  }, [selectedCell, pushHistory]);

  // ── Panel Notes Change ──
  const handleNotesChange = useCallback((notes: string) => {
    if (!selectedCell) return;
    const key = `${selectedCell.tradeId}::${selectedCell.zoneId}`;
    setCellOverrides((prev) => ({
      ...prev,
      [key]: { ...prev[key], notes },
    }));
  }, [selectedCell]);

  // ── Add Trade ──
  const handleAddTrade = useCallback(() => {
    if (!newTradeName.trim()) return;
    pushHistory();
    const maxSeq = Math.max(...trades.map((t) => t.sequence), 0);
    const newTrade: TradeRow = {
      id: `trade-${Date.now()}`,
      name: newTradeName.trim(),
      color: newTradeColor,
      sequence: maxSeq + 1,
      taktTime: globalTaktTime,
      bufferAfter: globalBuffer,
      crewSize: 5,
      notes: '',
    };
    setTrades((prev) => [...prev, newTrade]);
    setNewTradeName('');
    setNewTradeColor('#6366F1');
    setShowAddTrade(false);
  }, [newTradeName, newTradeColor, globalTaktTime, globalBuffer, trades, pushHistory]);

  // ── Add Zone ──
  const handleAddZone = useCallback(() => {
    if (!newZoneName.trim()) return;
    pushHistory();
    const maxSeq = Math.max(...zones.map((z) => z.sequence), 0);
    const newZone: Zone = {
      id: `z-${Date.now()}`,
      name: newZoneName.trim(),
      sequence: maxSeq + 1,
    };
    setZones((prev) => [...prev, newZone]);
    setNewZoneName('');
    setShowAddZone(false);
  }, [newZoneName, zones, pushHistory]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    // Simulate save to API
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLastSaved(new Date());
    setIsSaving(false);
  }, []);

  // ── Simulate ──
  const handleSimulate = useCallback(async () => {
    setIsSimulating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSimulating(false);
  }, []);

  // ── Global Takt Time Change ──
  const handleGlobalTaktChange = useCallback((val: number) => {
    pushHistory();
    setGlobalTaktTime(val);
    setTrades((prev) => prev.map((t) => ({ ...t, taktTime: val })));
  }, [pushHistory]);

  // ── Global Buffer Change ──
  const handleGlobalBufferChange = useCallback((val: number) => {
    pushHistory();
    setGlobalBuffer(val);
    setTrades((prev) =>
      prev.map((t, i) => ({
        ...t,
        bufferAfter: i < prev.length - 1 ? val : 0,
      })),
    );
  }, [pushHistory]);

  // ── Sorted trades for rendering ──
  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => a.sequence - b.sequence),
    [trades],
  );

  const sortedZones = useMemo(
    () => [...zones].sort((a, b) => a.sequence - b.sequence),
    [zones],
  );

  // ── Trade color palette for Add Trade ──
  const tradeColors = [
    '#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#10B981',
    '#EC4899', '#F97316', '#6366F1', '#14B8A6', '#EF4444',
    '#84CC16', '#A855F7',
  ];

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        setSelectedCell(null);
        setEditingField(null);
        setShowAddTrade(false);
        setShowAddZone(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleSave]);

  return (
    <>
      <TopBar title="Takt Editor" />
      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── Toolbar ──────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0 flex-wrap"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            {/* Add buttons */}
            <button
              onClick={() => setShowAddTrade(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              <Plus size={13} />
              Add Trade
            </button>
            <button
              onClick={() => setShowAddZone(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--color-purple)', color: 'white' }}
            >
              <Plus size={13} />
              Add Zone
            </button>

            {/* Separator */}
            <div className="w-px h-6 mx-1" style={{ background: 'var(--color-border)' }} />

            {/* Takt Time selector */}
            <div className="flex items-center gap-1.5">
              <Timer size={13} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Takt:</span>
              <select
                value={globalTaktTime}
                onChange={(e) => handleGlobalTaktChange(Number(e.target.value))}
                className="text-[11px] font-semibold rounded-md px-2 py-1 border outline-none cursor-pointer"
                style={{
                  background: 'var(--color-bg-input)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'day' : 'days'}</option>
                ))}
              </select>
            </div>

            {/* Buffer selector */}
            <div className="flex items-center gap-1.5">
              <Shield size={13} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Buffer:</span>
              <select
                value={globalBuffer}
                onChange={(e) => handleGlobalBufferChange(Number(e.target.value))}
                className="text-[11px] font-semibold rounded-md px-2 py-1 border outline-none cursor-pointer"
                style={{
                  background: 'var(--color-bg-input)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {Array.from({ length: 6 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'day' : 'days'}</option>
                ))}
              </select>
            </div>

            {/* Separator */}
            <div className="w-px h-6 mx-1" style={{ background: 'var(--color-border)' }} />

            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg transition-all hover:opacity-70 disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg transition-all hover:opacity-70 disabled:opacity-30"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={15} />
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Auto-save indicator */}
            {lastSaved && (
              <span className="text-[9px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--color-success)', color: 'white' }}
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            {/* Simulate */}
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--color-cyan)', color: 'white' }}
            >
              {isSimulating ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {isSimulating ? 'Running...' : 'Simulate'}
            </button>
          </div>

          {/* ── Statistics Bar ──────────────────────────────── */}
          <div
            className="flex items-center gap-4 px-4 py-2 border-b flex-shrink-0 flex-wrap"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            {[
              { label: 'Periods', value: stats.totalPeriods, icon: Hash, color: 'var(--color-accent)' },
              { label: 'Duration', value: `${stats.totalDurationDays}d`, icon: Calendar, color: 'var(--color-purple)' },
              { label: 'Start', value: formatDate(stats.startDate), icon: CalendarDays, color: 'var(--color-success)' },
              { label: 'End', value: formatDate(stats.endDate), icon: CalendarDays, color: 'var(--color-danger)' },
              { label: 'Trades', value: stats.tradeCount, icon: Layers, color: 'var(--color-warning)' },
              { label: 'Zones', value: stats.zoneCount, icon: Activity, color: 'var(--color-cyan)' },
              { label: 'Stacking', value: stats.stackingCount, icon: AlertTriangle, color: stats.stackingCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
              { label: 'Buffer Health', value: `${stats.bufferHealth}%`, icon: TrendingUp, color: stats.bufferHealth >= 80 ? 'var(--color-success)' : stats.bufferHealth >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <stat.icon size={12} style={{ color: stat.color }} />
                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</span>
                <span className="text-[11px] font-medium" style={{ color: stat.color, fontFamily: 'var(--font-mono)' }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Takt Grid ───────────────────────────────────── */}
          <div className="flex-1 overflow-auto">
            <div className="p-3 sm:p-4 md:p-6 lg:p-8">
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ minWidth: 800 }}>
                    <thead>
                      <tr>
                        {/* Drag handle column */}
                        <th
                          className="w-8 border-b"
                          style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
                        />
                        {/* Trade column header */}
                        <th
                          className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-3 border-b"
                          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', minWidth: 180 }}
                        >
                          <div className="flex items-center gap-3">
                            <span>Trade</span>
                            <span className="text-[9px] font-normal" style={{ color: 'var(--color-text-muted)' }}>Takt</span>
                            <span className="text-[9px] font-normal" style={{ color: 'var(--color-text-muted)' }}>Buf</span>
                            <span className="text-[9px] font-normal" style={{ color: 'var(--color-text-muted)' }}>Crew</span>
                          </div>
                        </th>
                        {/* Zone column headers */}
                        {sortedZones.map((zone) => (
                          <th
                            key={zone.id}
                            className="text-center text-[9px] font-semibold uppercase tracking-wider px-2 py-3 border-b border-l"
                            style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', minWidth: 100 }}
                          >
                            {zone.name.includes(' — ') ? zone.name.split(' — ')[0] : zone.name}
                            <div className="text-[8px] font-normal mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {zone.name.includes(' — ') ? zone.name.split(' — ')[1] : ''}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {sortedTrades.map((trade) => {
                          const isDragOver = dragOverTradeId === trade.id && draggedTradeId !== trade.id;

                          return (
                            <motion.tr
                              key={trade.id}
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{
                                opacity: draggedTradeId === trade.id ? 0.5 : 1,
                                y: 0,
                                backgroundColor: isDragOver ? 'rgba(232,115,26,0.08)' : 'transparent',
                              }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.25, type: 'spring', stiffness: 500, damping: 30 }}
                              draggable
                              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, trade.id)}
                              onDragEnd={(e) => handleDragEnd(e as unknown as React.DragEvent)}
                              onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, trade.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e as unknown as React.DragEvent, trade.id)}
                              style={{
                                borderTop: isDragOver ? '2px solid var(--color-accent)' : '2px solid transparent',
                              }}
                            >
                              {/* Drag handle */}
                              <td
                                className="border-b cursor-grab active:cursor-grabbing px-1"
                                style={{ borderColor: 'var(--color-border)' }}
                              >
                                <div className="flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                                  <GripVertical size={14} />
                                </div>
                              </td>

                              {/* Trade info cell */}
                              <td
                                className="px-3 py-2.5 border-b"
                                style={{ borderColor: 'var(--color-border)' }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: trade.color }} />
                                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                                    {trade.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {/* Takt time (inline editable) */}
                                    {editingField?.tradeId === trade.id && editingField.field === 'taktTime' ? (
                                      <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={commitInlineEdit}
                                        onKeyDown={handleInlineKeyDown}
                                        autoFocus
                                        className="w-8 text-center text-[10px] font-medium rounded border outline-none"
                                        style={{
                                          background: 'var(--color-bg-input)',
                                          borderColor: 'var(--color-accent)',
                                          color: 'var(--color-text)',
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                      />
                                    ) : (
                                      <button
                                        onClick={() => startInlineEdit(trade.id, 'taktTime', trade.taktTime)}
                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-all hover:opacity-70"
                                        style={{
                                          background: 'rgba(232,115,26,0.1)',
                                          color: 'var(--color-accent)',
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                        title="Click to edit takt time"
                                      >
                                        {trade.taktTime}d
                                      </button>
                                    )}

                                    {/* Buffer (inline editable) */}
                                    {editingField?.tradeId === trade.id && editingField.field === 'buffer' ? (
                                      <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={commitInlineEdit}
                                        onKeyDown={handleInlineKeyDown}
                                        autoFocus
                                        className="w-8 text-center text-[10px] font-medium rounded border outline-none"
                                        style={{
                                          background: 'var(--color-bg-input)',
                                          borderColor: 'var(--color-warning)',
                                          color: 'var(--color-text)',
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                      />
                                    ) : (
                                      <button
                                        onClick={() => startInlineEdit(trade.id, 'buffer', trade.bufferAfter)}
                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-all hover:opacity-70"
                                        style={{
                                          background: trade.bufferAfter === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                          color: trade.bufferAfter === 0 ? 'var(--color-danger)' : 'var(--color-warning)',
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                        title="Click to edit buffer"
                                      >
                                        b{trade.bufferAfter}
                                      </button>
                                    )}

                                    {/* Crew size (inline editable) */}
                                    {editingField?.tradeId === trade.id && editingField.field === 'crewSize' ? (
                                      <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={commitInlineEdit}
                                        onKeyDown={handleInlineKeyDown}
                                        autoFocus
                                        className="w-8 text-center text-[10px] font-medium rounded border outline-none"
                                        style={{
                                          background: 'var(--color-bg-input)',
                                          borderColor: 'var(--color-success)',
                                          color: 'var(--color-text)',
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                      />
                                    ) : (
                                      <button
                                        onClick={() => startInlineEdit(trade.id, 'crewSize', trade.crewSize)}
                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-all hover:opacity-70"
                                        style={{
                                          background: 'rgba(16,185,129,0.1)',
                                          color: 'var(--color-success)',
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                        title="Click to edit crew size"
                                      >
                                        <span className="inline-flex items-center gap-0.5">
                                          <Users size={9} />
                                          {trade.crewSize}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Zone cells */}
                              {sortedZones.map((zone) => {
                                const key = `${trade.id}::${zone.id}`;
                                const cell = cells.get(key);
                                if (!cell) return <td key={zone.id} className="border-b border-l" style={{ borderColor: 'var(--color-border)' }} />;

                                const statusCfg = STATUS_CONFIG[cell.status];
                                const isSelected = selectedCell?.tradeId === trade.id && selectedCell?.zoneId === zone.id;
                                const isHovered = hoveredCell === key;

                                return (
                                  <td
                                    key={zone.id}
                                    className="px-1.5 py-1.5 border-b border-l text-center cursor-pointer"
                                    style={{ borderColor: 'var(--color-border)' }}
                                    onClick={() => handleCellClick(trade.id, zone.id)}
                                    onMouseEnter={() => setHoveredCell(key)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                  >
                                    <motion.div
                                      layout
                                      className="rounded-lg px-1.5 py-1.5 mx-auto relative"
                                      style={{
                                        background: statusCfg.bg,
                                        maxWidth: 90,
                                        boxShadow: isSelected
                                          ? `0 0 0 2px ${trade.color}, 0 0 0 4px var(--color-bg-card)`
                                          : isHovered
                                          ? `0 0 0 1px ${trade.color}40`
                                          : 'none',
                                      }}
                                      whileHover={{ scale: 1.04 }}
                                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    >
                                      {/* Status indicator */}
                                      <div className="flex items-center justify-center gap-1 mb-0.5">
                                        <statusCfg.icon size={9} style={{ color: statusCfg.text }} />
                                        <span className="text-[8px] font-semibold" style={{ color: statusCfg.text }}>
                                          {statusCfg.label}
                                        </span>
                                      </div>
                                      {/* Period */}
                                      <div
                                        className="text-[10px] font-medium"
                                        style={{ color: statusCfg.text, fontFamily: 'var(--font-mono)' }}
                                      >
                                        T{cell.periodNumber}
                                      </div>
                                      {/* Date range */}
                                      <div
                                        className="text-[8px] mt-0.5"
                                        style={{ color: statusCfg.text, fontFamily: 'var(--font-mono)', opacity: 0.7 }}
                                      >
                                        {formatDate(cell.plannedStart)}
                                      </div>
                                      {/* Trade color stripe at bottom */}
                                      <div
                                        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-lg"
                                        style={{ background: trade.color }}
                                      />

                                      {/* Hover tooltip */}
                                      <AnimatePresence>
                                        {isHovered && !isSelected && (
                                          <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none"
                                          >
                                            <div
                                              className="rounded-lg px-3 py-2 shadow-lg text-left whitespace-nowrap"
                                              style={{
                                                background: 'var(--color-bg-secondary)',
                                                border: '1px solid var(--color-border)',
                                              }}
                                            >
                                              <div className="text-[10px] font-medium" style={{ color: 'var(--color-text)' }}>
                                                {trade.name} - {zone.name.split(' — ')[0]}
                                              </div>
                                              <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                                Period T{cell.periodNumber} | {formatDate(cell.plannedStart)} - {formatDate(cell.plannedEnd)}
                                              </div>
                                              <div className="text-[9px] mt-0.5" style={{ color: statusCfg.text }}>
                                                {STATUS_SYMBOLS[cell.status]} {statusCfg.label}
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.div>
                                  </td>
                                );
                              })}
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── Warnings Panel ──────────────────────────────── */}
          {warnings.length > 0 && (
            <div
              className="border-t px-4 py-3 flex-shrink-0 max-h-40 overflow-auto"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={14} style={{ color: 'var(--color-warning)' }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                  Warnings ({warnings.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {warnings.map((w) => {
                  const severityColor =
                    w.severity === 'critical' ? 'var(--color-danger)' :
                    w.severity === 'warning' ? 'var(--color-warning)' :
                    'var(--color-accent)';
                  const severityBg =
                    w.severity === 'critical' ? 'rgba(239,68,68,0.08)' :
                    w.severity === 'warning' ? 'rgba(245,158,11,0.08)' :
                    'rgba(232,115,26,0.08)';
                  const TypeIcon =
                    w.type === 'stacking' ? Layers :
                    w.type === 'buffer' ? Shield :
                    ArrowRightLeft;

                  return (
                    <div
                      key={w.id}
                      className="flex items-start gap-2 p-2 rounded-lg"
                      style={{ background: severityBg }}
                    >
                      <TypeIcon size={12} className="flex-shrink-0 mt-0.5" style={{ color: severityColor }} />
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold truncate" style={{ color: severityColor }}>
                          {w.message}
                        </div>
                        <div className="text-[9px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                          {w.details}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Detail Sidebar Panel ──────────────────────────── */}
        <AnimatePresence>
          {selectedCellData && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex-shrink-0 border-l overflow-hidden"
              style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-80 h-full flex flex-col overflow-auto">
                {/* Panel Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: selectedCellData.trade.color }} />
                    <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                      Cell Details
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="p-1 rounded-md transition-all hover:opacity-70"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Panel Body */}
                <div className="flex-1 p-4 space-y-4 overflow-auto">
                  {/* Trade & Zone */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Trade
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-4 rounded" style={{ background: selectedCellData.trade.color }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          {selectedCellData.trade.name}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Zone
                      </label>
                      <div className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>
                        {selectedCellData.zone.name}
                      </div>
                    </div>
                  </div>

                  {/* Period & Dates */}
                  <div
                    className="rounded-lg p-3 space-y-2"
                    style={{ background: 'var(--color-bg-input)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Period</span>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                        T{selectedCellData.cell.periodNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Start</span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                        {formatDateFull(selectedCellData.cell.plannedStart)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>End</span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                        {formatDateFull(selectedCellData.cell.plannedEnd)}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(STATUS_CONFIG) as CellStatus[]).map((status) => {
                        const cfg = STATUS_CONFIG[status];
                        const isActive = selectedCellData.cell.status === status;
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-semibold transition-all"
                            style={{
                              background: isActive ? cfg.bg : 'var(--color-bg-input)',
                              color: isActive ? cfg.text : 'var(--color-text-muted)',
                              border: isActive ? `1px solid ${cfg.text}` : '1px solid transparent',
                            }}
                          >
                            <cfg.icon size={11} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Crew Size */}
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      <span className="inline-flex items-center gap-1"><Users size={10} /> Crew Size</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                        {selectedCellData.cell.crewSize}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>workers</span>
                    </div>
                  </div>

                  {/* Predecessors & Successors */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--color-text-muted)' }}>
                      Sequence
                    </label>
                    {selectedCellData.predecessor && (
                      <div
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: 'var(--color-bg-input)' }}
                      >
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: selectedCellData.predecessor.color }} />
                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          {selectedCellData.predecessor.name}
                        </span>
                        <ChevronRight size={10} style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-accent)' }}>Predecessor</span>
                      </div>
                    )}
                    <div
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: `${selectedCellData.trade.color}15`, border: `1px solid ${selectedCellData.trade.color}40` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: selectedCellData.trade.color }} />
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text)' }}>
                        {selectedCellData.trade.name}
                      </span>
                      <span className="text-[9px] ml-auto" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        #{selectedCellData.trade.sequence}
                      </span>
                    </div>
                    {selectedCellData.successor && (
                      <div
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: 'var(--color-bg-input)' }}
                      >
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: selectedCellData.successor.color }} />
                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          {selectedCellData.successor.name}
                        </span>
                        <ChevronRight size={10} style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-[10px] font-medium" style={{ color: 'var(--color-success)' }}>Successor</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      <span className="inline-flex items-center gap-1"><StickyNote size={10} /> Notes</span>
                    </label>
                    <textarea
                      value={selectedCellData.cell.notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Add notes about this assignment..."
                      rows={3}
                      className="w-full text-[11px] rounded-lg p-2.5 border outline-none resize-none"
                      style={{
                        background: 'var(--color-bg-input)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Add Trade Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showAddTrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowAddTrade(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-xl border p-6 w-full max-w-md shadow-2xl"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-lg font-medium mb-4"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                Add Trade to Wagon Train
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Trade Name
                  </label>
                  <input
                    value={newTradeName}
                    onChange={(e) => setNewTradeName(e.target.value)}
                    placeholder="e.g., HVAC Install"
                    className="w-full text-sm rounded-lg px-3 py-2 border outline-none"
                    style={{
                      background: 'var(--color-bg-input)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTrade(); }}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tradeColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewTradeColor(c)}
                        className="w-7 h-7 rounded-lg transition-all"
                        style={{
                          background: c,
                          boxShadow: newTradeColor === c ? `0 0 0 2px var(--color-bg-card), 0 0 0 4px ${c}` : 'none',
                          transform: newTradeColor === c ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        {newTradeColor === c && <Check size={14} className="mx-auto text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAddTrade(false)}
                  className="px-4 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-70"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTrade}
                  disabled={!newTradeName.trim()}
                  className="px-4 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  Add Trade
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Zone Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showAddZone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowAddZone(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-xl border p-6 w-full max-w-md shadow-2xl"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-lg font-medium mb-4"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                Add Zone
              </h3>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Zone Name
                </label>
                <input
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g., Zone G — 6th Floor"
                  className="w-full text-sm rounded-lg px-3 py-2 border outline-none"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddZone(); }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAddZone(false)}
                  className="px-4 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-70"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddZone}
                  disabled={!newZoneName.trim()}
                  className="px-4 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'var(--color-purple)', color: 'white' }}
                >
                  Add Zone
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
