'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { generatePlan, savePlan, listPlans, getPlan } from '@/lib/stores/takt-plans';
import api from '@/lib/api';
import { useProjectStore } from '@/stores/projectStore';
import { useTaktPlanStore } from '@/stores/taktPlanStore';
import { useAuthStore } from '@/stores/authStore';
import { useRealtimeFlowline } from '@/hooks/useRealtimeFlowline';
import { ContractPolicyBanner } from '@/components/modules';
import {
  calculateTotalPeriods,
  generateTaktGrid,
  detectTradeStacking,
  type ZoneInput,
  type WagonInput,
  type Assignment,
} from '@/lib/core/takt-calculator';
import {
  getAllRelationshipTemplates,
  getSubActivityRelationships,
  type ActivityRelationshipTemplate,
} from '@/lib/templates/activity-relationship-templates';
import {
  getTradesForProjectType,
  type SubTradeTemplate,
} from '@/lib/templates/trade-discipline-templates';
import {
  GripVertical,
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
  Wrench,
  Building2,
  Link2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  Palette,
} from 'lucide-react';
import {
  type TaktPhase,
  type TaktPlanGroup,
  classifyTradePhase,
  classifyLocationPhase,
  phaseMatchesGroup,
  TAKT_PHASE_MAP,
  TAKT_PLAN_GROUPS,
} from '@/lib/core/work-phase-classification';

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
  discipline: string;
  taktPhase: TaktPhase; // OmniClass-aligned phase classification
}

interface Zone {
  id: string;
  name: string;
  sequence: number;
  parentFloor: string; // LBS hierarchy — floor name from Project Setup
  group: TaktPlanGroup | null; // shell / fitout / null (both)
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

// Phase classification is handled by @/lib/core/work-phase-classification.ts
// Uses OmniClass Table 21 / Uniclass 2015 standard taxonomy

// ── Initial Data ───────────────────────────────────────────────

const DEFAULT_PROJECT_START = new Date('2026-02-16');

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

function computeCellStatus(): CellStatus {
  return 'planned';
}

// ── Grid Computation ───────────────────────────────────────────

/**
 * Compute takt grid with phase-zone matching.
 *
 * Takt Planning methodology: each trade (wagon) only flows through
 * zones that match its phase group. Substructure trades go through
 * sector/grid zones only, shell trades through floor zones, etc.
 *
 * The grid is computed per plan group (filtered externally via planGroup state).
 */
function computeGrid(
  trades: TradeRow[],
  zones: Zone[],
  globalTaktTime: number,
  cellOverrides: Record<string, Partial<GridCell>>,
  projectStart: Date,
): { cells: Map<string, GridCell>; assignments: Assignment[]; totalPeriods: number } {
  // Build sequential zone inputs (already filtered by planGroup externally)
  const zoneInputs: ZoneInput[] = zones.map((z, i) => ({
    id: z.id,
    name: z.name,
    sequence: i + 1,
  }));

  // Build wagon inputs (already filtered by planGroup externally)
  // Buffer only between wagons in the same takt train, not the last one
  const wagonInputs: WagonInput[] = trades.map((t, i) => ({
    id: t.id,
    tradeId: t.id,
    sequence: i + 1,
    durationDays: t.taktTime || globalTaktTime,
    bufferAfter: i < trades.length - 1 ? t.bufferAfter : 0,
  }));

  const assignments = generateTaktGrid(zoneInputs, wagonInputs, projectStart, globalTaktTime);

  // totalDays = last day (end) of last assignment
  const maxPeriod = assignments.length > 0
    ? Math.max(...assignments.map((a) => {
        const wagon = wagonInputs.find((w) => w.id === a.wagonId);
        return a.periodNumber + (wagon?.durationDays || globalTaktTime) - 1;
      }), 1)
    : 0;

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
      status: override?.status ?? computeCellStatus(),
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
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const token = useAuthStore((s) => s.token);

  // ── Real-time WebSocket ──
  const { emit: wsEmit } = useRealtimeFlowline({ projectId: activeProjectId });

  // ── Core State ──
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [globalTaktTime, setGlobalTaktTime] = useState(5);
  const [globalBuffer, setGlobalBuffer] = useState(1);
  const [cellOverrides, setCellOverrides] = useState<Record<string, Partial<GridCell>>>({});
  const [projectStart, setProjectStart] = useState<Date>(DEFAULT_PROJECT_START);
  const [planGroup, setPlanGroup] = useState<TaktPlanGroup>('shell');

  // ── UI State ──
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [editingField, setEditingField] = useState<{ tradeId: string; field: 'taktTime' | 'buffer' | 'crewSize' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSubActivities, setShowSubActivities] = useState(false);

  // ── Wagon Editing State ──
  const [showAddWagon, setShowAddWagon] = useState(false);
  const [hiddenTradeIds, setHiddenTradeIds] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState<{ tradeId: string; value: string } | null>(null);
  const [editingColor, setEditingColor] = useState<string | null>(null); // tradeId being color-edited

  // ── Project Relationships (loaded from DB) ──
  interface ProjectRelationship {
    predecessorTradeCode: string;
    successorTradeCode: string;
    type: string;
    lagDays: number;
    mandatory: boolean;
    description: string;
    predecessorTradeName: string;
    successorTradeName: string;
    predecessorTradeColor: string;
    successorTradeColor: string;
  }
  const [projectRelationships, setProjectRelationships] = useState<ProjectRelationship[]>([]);

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

  // ── Filtered & sorted trades/zones by plan group (OmniClass aligned) ──
  // Must be computed before grid so the grid only contains trades/zones for the active plan group
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => phaseMatchesGroup(t.taktPhase, planGroup) && !hiddenTradeIds.has(t.id));
  }, [trades, planGroup, hiddenTradeIds]);

  const filteredZones = useMemo(() => {
    return zones.filter((z) => z.group === null || z.group === planGroup);
  }, [zones, planGroup]);

  const sortedTrades = useMemo(
    () => [...filteredTrades].sort((a, b) => a.sequence - b.sequence),
    [filteredTrades],
  );

  const sortedZones = useMemo(
    () => [...filteredZones].sort((a, b) => a.sequence - b.sequence),
    [filteredZones],
  );

  // ── Computed Grid (uses filtered trades/zones per active plan group) ──
  // Each plan group tab computes its own takt train independently
  const { cells, assignments, totalPeriods } = useMemo(
    () => computeGrid(sortedTrades, sortedZones, globalTaktTime, cellOverrides, projectStart),
    [sortedTrades, sortedZones, globalTaktTime, cellOverrides, projectStart],
  );

  // ── Day columns (1 column = 1 working day) ──
  const dayColumns = useMemo(
    () => Array.from({ length: totalPeriods }, (_, i) => i + 1),
    [totalPeriods],
  );

  // ── Zone Row Segments (wagon cells span taktTime columns) ──
  interface ZoneSegment {
    type: 'wagon' | 'gap';
    startDay: number;
    colSpan: number;
    cell?: GridCell;
    trade?: TradeRow;
  }

  const buildZoneSegments = useCallback((zoneId: string): ZoneSegment[] => {
    const zoneAssigns = assignments
      .filter((a) => a.zoneId === zoneId)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    const segs: ZoneSegment[] = [];
    let currentDay = 1;

    for (const assign of zoneAssigns) {
      const trade = sortedTrades.find((t) => t.id === assign.wagonId);
      const duration = trade?.taktTime || globalTaktTime;

      // Gap before this wagon (buffer + empty space)
      if (assign.periodNumber > currentDay) {
        segs.push({ type: 'gap', startDay: currentDay, colSpan: assign.periodNumber - currentDay });
      }

      // Wagon cell spanning its duration
      const cellKey = `${assign.wagonId}::${zoneId}`;
      const cellData = cells.get(cellKey);
      segs.push({
        type: 'wagon',
        startDay: assign.periodNumber,
        colSpan: duration,
        cell: cellData,
        trade: trade || undefined,
      });
      currentDay = assign.periodNumber + duration;
    }

    // Trailing gap
    if (currentDay <= totalPeriods) {
      segs.push({ type: 'gap', startDay: currentDay, colSpan: totalPeriods - currentDay + 1 });
    }

    return segs;
  }, [assignments, sortedTrades, cells, totalPeriods, globalTaktTime]);

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

    const minStart = allCells.length > 0 ? new Date(Math.min(...allCells.map((c) => c.plannedStart.getTime()))) : projectStart;
    const maxEnd = allCells.length > 0 ? new Date(Math.max(...allCells.map((c) => c.plannedEnd.getTime()))) : projectStart;

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
  }, [cells, warnings, trades, zones, totalPeriods, projectStart]);

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

  // ── Activity Relationships for selected wagon ──
  // Use DB relationships if available (project-specific), fallback to templates
  const allRelationships = useMemo(() => {
    if (projectRelationships.length > 0) {
      // Convert DB relationships to template format for compatibility
      return projectRelationships.map((r) => ({
        predecessorCode: r.predecessorTradeCode,
        successorCode: r.successorTradeCode,
        type: r.type as 'FS' | 'SS' | 'FF' | 'SF',
        lagDays: r.lagDays,
        mandatory: r.mandatory,
        description: r.description,
      }));
    }
    return getAllRelationshipTemplates();
  }, [projectRelationships]);

  const selectedWagonRelationships = useMemo(() => {
    if (!selectedCellData) return { predecessors: [] as (ActivityRelationshipTemplate & { tradeName: string; tradeColor: string })[], successors: [] as (ActivityRelationshipTemplate & { tradeName: string; tradeColor: string })[] };

    // Find trade code by matching trade name/id against known codes
    const tradeCodeMap = new Map<string, { name: string; color: string }>();
    for (const t of trades) {
      tradeCodeMap.set(t.id, { name: t.name, color: t.color });
    }

    // Get relationships where this trade is predecessor or successor
    const tradeCodes = trades.map((t) => t.id);
    const codeSet = new Set(tradeCodes);
    const currentCode = selectedCellData.trade.id;

    const predecessors = allRelationships
      .filter((r) => r.successorCode === currentCode && codeSet.has(r.predecessorCode))
      .map((r) => {
        const t = tradeCodeMap.get(r.predecessorCode);
        return { ...r, tradeName: t?.name || r.predecessorCode, tradeColor: t?.color || '#999' };
      });

    const successors = allRelationships
      .filter((r) => r.predecessorCode === currentCode && codeSet.has(r.successorCode))
      .map((r) => {
        const t = tradeCodeMap.get(r.successorCode);
        return { ...r, tradeName: t?.name || r.successorCode, tradeColor: t?.color || '#999' };
      });

    return { predecessors, successors };
  }, [selectedCellData, trades, allRelationships]);

  const selectedSubActivities = useMemo(() => {
    if (!selectedCellData) return [];
    return getSubActivityRelationships(selectedCellData.trade.id);
  }, [selectedCellData]);

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

  // ── Resolve Sequence Conflicts ──
  const resolveSequenceConflicts = useCallback(() => {
    pushHistory();
    setTrades((prev) => {
      const sorted = [...prev].sort((a, b) => a.sequence - b.sequence);
      return sorted.map((t, i) => ({ ...t, sequence: i + 1 }));
    });
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

  // ── Wagon Editing Handlers ──

  // Available template trades not yet in the plan
  const availableTemplateTrades = useMemo(() => {
    const projectType = activeProject?.projectType || 'hotel';
    const allTemplates = getTradesForProjectType(projectType);
    const existingCodes = new Set(trades.map((t) => {
      // Match by code if available, otherwise try to find by name
      const templateMatch = allTemplates.find((tmpl) => tmpl.name === t.name);
      return templateMatch?.code || '';
    }));
    // Also check if any trades have a code stored somewhere
    return allTemplates.filter((t) => !existingCodes.has(t.code));
  }, [trades, activeProject]);

  const handleAddWagon = useCallback((template: SubTradeTemplate) => {
    pushHistory();
    const maxSeq = trades.length > 0 ? Math.max(...trades.map((t) => t.sequence)) : 0;
    const newTrade: TradeRow = {
      id: `new-${template.code}-${Date.now()}`,
      name: template.name,
      color: template.color,
      sequence: maxSeq + 1,
      taktTime: globalTaktTime,
      bufferAfter: 1,
      crewSize: template.defaultCrewSize,
      notes: '',
      discipline: template.discipline,
      taktPhase: classifyTradePhase(template.discipline, template.name),
    };
    setTrades((prev) => [...prev, newTrade]);
    setShowAddWagon(false);
  }, [trades, globalTaktTime, pushHistory]);

  const handleRemoveWagon = useCallback((tradeId: string) => {
    pushHistory();
    setTrades((prev) => {
      const filtered = prev.filter((t) => t.id !== tradeId);
      return filtered.map((t, i) => ({ ...t, sequence: i + 1 }));
    });
    if (selectedCell?.tradeId === tradeId) setSelectedCell(null);
  }, [pushHistory, selectedCell]);

  const handleToggleWagonVisibility = useCallback((tradeId: string) => {
    setHiddenTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) next.delete(tradeId);
      else next.add(tradeId);
      return next;
    });
  }, []);

  const handleRenameWagon = useCallback((tradeId: string, newName: string) => {
    if (!newName.trim()) return;
    pushHistory();
    setTrades((prev) => prev.map((t) => t.id === tradeId ? { ...t, name: newName.trim() } : t));
    setEditingName(null);
  }, [pushHistory]);

  const handleChangeColor = useCallback((tradeId: string, newColor: string) => {
    pushHistory();
    setTrades((prev) => prev.map((t) => t.id === tradeId ? { ...t, color: newColor } : t));
    setEditingColor(null);
  }, [pushHistory]);

  const PRESET_COLORS = [
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
    '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#0EA5E9',
    '#92400E', '#DC2626', '#0369A1', '#059669', '#7C3AED',
    '#D97706', '#BE185D', '#334155', '#475569', '#14B8A6',
  ];

  // ── Save ──
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const projectId = activeProjectId || '';

  // ── Load project zones & trades from API ──
  useEffect(() => {
    if (!activeProjectId) return;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    (async () => {
      try {
        const res = await fetch(`/api/v1/projects/${activeProjectId}`, { headers: authHeaders });
        if (!res.ok) return;
        const { data } = await res.json();

        // Use project's planned start date
        if (data.plannedStart) {
          setProjectStart(new Date(data.plannedStart));
        }

        // Check for existing takt plan first — it has the real data
        const plans = await listPlans(activeProjectId);
        if (plans.length > 0) {
          setCurrentPlanId(plans[0].id);
          try {
            const plan = await getPlan(activeProjectId, plans[0].id);

            // Load zones from plan — look up location metadata for phase and parent floor
            // Include zone, sector, and grid types for substructure support
            const locationGroupMap = new Map<string, TaktPlanGroup | null>();
            const locationFloorMap = new Map<string, string>();
            const allLocations = data.locations || [];
            const taktLocTypes = ['zone', 'sector', 'grid'];
            for (const loc of allLocations) {
              if (taktLocTypes.includes(loc.locationType)) {
                // Sector/grid locations default to 'substructure' group
                const group = loc.locationType === 'sector' || loc.locationType === 'grid'
                  ? 'substructure' as TaktPlanGroup
                  : classifyLocationPhase(loc.metadata);
                locationGroupMap.set(loc.id, group);
                // Find parent floor name from hierarchy
                const parent = allLocations.find((p: { id: string }) => p.id === loc.parentId);
                locationFloorMap.set(loc.id, parent?.name || '');
              }
            }

            if (plan.zones.length > 0) {
              setZones(plan.zones.map((z) => ({
                id: z.id,
                name: z.name,
                sequence: z.sequence,
                parentFloor: locationFloorMap.get(z.id) || '',
                group: locationGroupMap.get(z.id) ?? null,
              })));
            }

            // Load trades (wagons) from plan with real crew sizes & buffers
            const tradeDiscMap = new Map<string, string>();
            for (const t of (data.trades || [])) {
              tradeDiscMap.set(t.id, t.discipline || '');
            }

            if (plan.wagons.length > 0) {
              setTrades(plan.wagons.map((w) => {
                const disc = tradeDiscMap.get(w.tradeId) || '';
                return {
                  id: w.tradeId,
                  name: w.tradeName,
                  color: w.tradeColor || '#6366F1',
                  sequence: w.sequence,
                  taktTime: w.durationDays,
                  bufferAfter: w.bufferAfter,
                  crewSize: w.crewSize || 5,
                  notes: '',
                  discipline: disc,
                  taktPhase: classifyTradePhase(disc, w.tradeName),
                };
              }));
            }

            // Load real assignment statuses as cell overrides
            // Map wagonId → tradeId since grid cells use tradeId as key
            if (plan.assignments.length > 0) {
              const wagonToTradeId = new Map(plan.wagons.map((w) => [w.id, w.tradeId]));
              const overrides: Record<string, Partial<GridCell>> = {};
              for (const a of plan.assignments) {
                const tradeId = wagonToTradeId.get(a.wagonId) || a.wagonId;
                const key = `${tradeId}::${a.zoneId}`;
                overrides[key] = {
                  status: (a.status as CellStatus) || 'planned',
                  notes: a.notes || '',
                };
              }
              setCellOverrides(overrides);
            }

            // Use plan's takt time and buffer
            setGlobalTaktTime(plan.taktTime);
            setGlobalBuffer(plan.bufferSize);
            if (plan.startDate) {
              setProjectStart(new Date(plan.startDate));
            }
            return; // Plan data loaded, skip project fallback
          } catch { /* plan detail fetch failed, fall back to project data */ }
        }

        // Fallback: build zones from project locations (no takt plan yet)
        // Include zone, sector, and grid types for substructure support
        const fallbackLocations = data.locations || [];
        const taktLocationTypes = ['zone', 'sector', 'grid'];
        const projectLocations = fallbackLocations.filter((l: { locationType: string }) => taktLocationTypes.includes(l.locationType));
        if (projectLocations.length > 0) {
          setZones(projectLocations.map((l: { id: string; name: string; locationType: string; sortOrder: number; parentId?: string; metadata?: Record<string, unknown> }, i: number) => {
            const parent = fallbackLocations.find((p: { id: string }) => p.id === l.parentId);
            // Sector/grid locations default to 'substructure' group
            const group = l.locationType === 'sector' || l.locationType === 'grid'
              ? 'substructure' as TaktPlanGroup
              : classifyLocationPhase(l.metadata);
            return {
              id: l.id,
              name: l.name,
              sequence: l.sortOrder || i + 1,
              parentFloor: parent?.name || '',
              group,
            };
          }));
        }

        // Fallback: build trades from project trades
        const projectTrades = data.trades || [];
        if (projectTrades.length > 0) {
          setTrades(projectTrades.map((t: { id: string; name: string; color: string; sortOrder: number; discipline?: string; defaultCrewSize?: number }, i: number) => ({
            id: t.id,
            name: t.name,
            color: t.color || '#6366F1',
            sequence: t.sortOrder || i + 1,
            taktTime: data.defaultTaktTime || 5,
            bufferAfter: i < projectTrades.length - 1 ? 1 : 0,
            crewSize: t.defaultCrewSize || 5,
            notes: '',
            discipline: t.discipline || '',
            taktPhase: classifyTradePhase(t.discipline, t.name),
          })));
          setGlobalTaktTime(data.defaultTaktTime || 5);
        }
      } catch { /* project data not available */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  // ── Load project relationships from DB ──
  useEffect(() => {
    if (!activeProjectId) return;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    (async () => {
      try {
        const res = await fetch(`/api/v1/projects/${activeProjectId}/relationships`, { headers: authHeaders });
        if (!res.ok) return;
        const { data } = await res.json();
        setProjectRelationships(data.map((r: Record<string, unknown>) => ({
          predecessorTradeCode: r.predecessorTradeCode || '',
          successorTradeCode: r.successorTradeCode || '',
          type: r.type || 'FS',
          lagDays: r.lagDays || 0,
          mandatory: r.mandatory ?? true,
          description: r.description || '',
          predecessorTradeName: r.predecessorTradeName || '',
          successorTradeName: r.successorTradeName || '',
          predecessorTradeColor: r.predecessorTradeColor || '#999',
          successorTradeColor: r.successorTradeColor || '#999',
        })));
      } catch { /* relationships not available */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  // ── Sync Templates ──
  const handleSyncTemplates = useCallback(async () => {
    if (!activeProjectId) return;
    setIsSyncing(true);
    try {
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/projects/${activeProjectId}/setup/sync-templates`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ removeOrphans: false }),
      });

      if (res.ok) {
        // Reload the page data by re-fetching
        window.location.reload();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [activeProjectId, token]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const planData = {
        name: 'Takt Plan',
        taktTime: globalTaktTime,
        bufferType: 'fixed',
        bufferSize: globalBuffer,
        startDate: projectStart.toISOString(),
        zones: zones.map((z) => ({ id: z.id, name: z.name, code: z.id, sequence: z.sequence })),
        wagons: trades.map((t) => ({
          tradeId: t.id,
          tradeName: t.name,
          tradeCode: t.id,
          tradeColor: t.color,
          sequence: t.sequence,
          durationDays: t.taktTime,
          bufferAfter: t.bufferAfter,
          crewSize: t.crewSize,
        })),
        assignments: Array.from(cells.entries()).map(([, cell]) => {
          const zone = zones.find((z) => z.id === cell.zoneId);
          const trade = trades.find((t) => t.id === cell.tradeId);
          return {
            zoneSequence: zone?.sequence ?? 1,
            wagonSequence: trade?.sequence ?? 1,
            periodNumber: cell.periodNumber,
            plannedStart: cell.plannedStart.toISOString(),
            plannedEnd: cell.plannedEnd.toISOString(),
            status: cell.status,
            progressPct: cell.status === 'completed' ? 100 : cell.status === 'in_progress' ? 50 : 0,
            notes: cell.notes || undefined,
          };
        }),
      };

      if (currentPlanId) {
        await savePlan(projectId, currentPlanId, planData);
      } else {
        const created = await generatePlan(projectId);
        setCurrentPlanId(created.id);
      }
      setLastSaved(new Date());
      // Broadcast to other clients
      wsEmit('plan:updated', { projectId, planId: currentPlanId });
      // Invalidate shared store so other pages (flowline, LPS, dashboard) refresh
      useTaktPlanStore.getState().invalidate();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, currentPlanId, globalTaktTime, globalBuffer, zones, trades, cells, projectStart, wsEmit]);

  // ── Simulate ──
  const handleSimulate = useCallback(async () => {
    setIsSimulating(true);
    try {
      const payload = {
        zones: zones.map((z) => ({ id: z.id, name: z.name, sequence: z.sequence })),
        wagons: trades.map((t) => ({
          id: t.id,
          trade_id: t.id,
          sequence: t.sequence,
          duration_days: t.taktTime,
          buffer_after: t.bufferAfter,
        })),
        takt_time: globalTaktTime,
        start_date: projectStart.toISOString().split('T')[0],
      };
      await api<Record<string, unknown>>('/takt/compute/validate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [zones, trades, globalTaktTime, projectStart]);

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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleSave]);

  return (
    <>
      <TopBar title="Takt Editor" />
      <div className="px-4 pt-2">
        <ContractPolicyBanner
          module="takt_flow"
          policyLabels={{ 'progress.unit': 'Progress Unit', 'design.concurrent': 'Fast-Track' }}
        />
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── Toolbar ──────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0 flex-wrap"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            {/* Plan Group Tabs — OmniClass Table 21 */}
            <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--color-bg-input)' }}>
              {TAKT_PLAN_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setPlanGroup(g.id)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all"
                  style={{
                    background: planGroup === g.id ? g.color : 'transparent',
                    color: planGroup === g.id ? 'white' : 'var(--color-text-muted)',
                  }}
                  title={g.description}
                >
                  {g.label}
                </button>
              ))}
            </div>

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

            {/* Sync Templates */}
            <button
              onClick={handleSyncTemplates}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--color-purple)', color: 'white' }}
              title="Sync trades &amp; relationships with latest templates"
            >
              {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {isSyncing ? 'Syncing...' : 'Sync Templates'}
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
              { label: 'Days', value: stats.totalPeriods, icon: Hash, color: 'var(--color-accent)' },
              { label: 'Duration', value: `${stats.totalDurationDays}d`, icon: Calendar, color: 'var(--color-purple)' },
              { label: 'Start', value: formatDate(stats.startDate), icon: CalendarDays, color: 'var(--color-success)' },
              { label: 'End', value: formatDate(stats.endDate), icon: CalendarDays, color: 'var(--color-danger)' },
              { label: 'Trades', value: stats.tradeCount, icon: Layers, color: 'var(--color-warning)' },
              { label: 'Zones', value: stats.zoneCount, icon: Activity, color: 'var(--color-cyan)' },
              { label: 'Relationships', value: projectRelationships.length || allRelationships.length, icon: Link2, color: 'var(--color-purple)' },
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


          {/* ── Takt Train (Vagon Dizisi) ───────────────────── */}
          <div
            className="px-4 py-2.5 border-b flex-shrink-0"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers size={12} style={{ color: TAKT_PLAN_GROUPS.find((g) => g.id === planGroup)?.color || 'var(--color-accent)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Takt Train — {TAKT_PLAN_GROUPS.find((g) => g.id === planGroup)?.label || 'Wagons'}
              </span>
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {sortedTrades.length} wagon{sortedTrades.length !== 1 ? 's' : ''} → {sortedZones.length} zone{sortedZones.length !== 1 ? 's' : ''}
              </span>
              {hiddenTradeIds.size > 0 && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>
                  {hiddenTradeIds.size} hidden
                </span>
              )}
              <div className="flex-1" />
              {/* Add Wagon Button */}
              <div className="relative">
                <button
                  onClick={() => setShowAddWagon(!showAddWagon)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <Plus size={11} />
                  Add Wagon
                </button>
                {/* Add Wagon Dropdown */}
                <AnimatePresence>
                  {showAddWagon && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full mt-1 z-50 w-64 rounded-xl border shadow-xl overflow-hidden"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="p-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                          Available Wagons ({availableTemplateTrades.length})
                        </span>
                      </div>
                      <div className="max-h-60 overflow-auto p-1">
                        {availableTemplateTrades.length === 0 ? (
                          <div className="text-[10px] text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                            All template trades are already in the plan
                          </div>
                        ) : (
                          availableTemplateTrades.map((tmpl) => (
                            <button
                              key={tmpl.code}
                              onClick={() => handleAddWagon(tmpl)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all hover:opacity-80"
                              style={{ background: 'transparent' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-input)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: tmpl.color }} />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{tmpl.name}</span>
                                <span className="text-[8px] uppercase" style={{ color: 'var(--color-text-muted)' }}>{tmpl.code} · {tmpl.discipline}</span>
                              </div>
                              <Plus size={10} className="flex-shrink-0 ml-auto" style={{ color: 'var(--color-accent)' }} />
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {sortedTrades.map((trade, i) => (
                <div key={trade.id} style={{ display: 'contents' }}>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, trade.id)}
                    onDragEnd={(e) => handleDragEnd(e)}
                    onDragOver={(e) => handleDragOver(e, trade.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, trade.id)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing flex-shrink-0 transition-all group relative"
                    style={{
                      background: `${trade.color}15`,
                      border: `1.5px solid ${trade.color}60`,
                      opacity: draggedTradeId === trade.id ? 0.5 : 1,
                      borderTopWidth: dragOverTradeId === trade.id && draggedTradeId !== trade.id ? 3 : 1.5,
                      borderTopColor: dragOverTradeId === trade.id && draggedTradeId !== trade.id ? 'var(--color-accent)' : `${trade.color}60`,
                    }}
                  >
                    <GripVertical size={10} style={{ color: `${trade.color}80` }} />
                    {/* Color swatch — click to edit color */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingColor(editingColor === trade.id ? null : trade.id); }}
                        className="text-[8px] font-bold w-4 h-4 rounded flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-offset-1 transition-all"
                        style={{ background: trade.color, color: 'white', fontFamily: 'var(--font-mono)' }}
                        title="Change color"
                      >
                        {i + 1}
                      </button>
                      {editingColor === trade.id && (
                        <div
                          className="absolute top-full left-0 mt-1 z-50 p-2 rounded-lg border shadow-xl grid grid-cols-5 gap-1"
                          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => handleChangeColor(trade.id, c)}
                              className="w-5 h-5 rounded-sm transition-all hover:scale-110"
                              style={{ background: c, border: c === trade.color ? '2px solid white' : 'none', boxShadow: c === trade.color ? `0 0 0 1px ${c}` : 'none' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      {/* Editable wagon name */}
                      {editingName?.tradeId === trade.id ? (
                        <input
                          type="text"
                          value={editingName.value}
                          onChange={(e) => setEditingName({ tradeId: trade.id, value: e.target.value })}
                          onBlur={() => handleRenameWagon(trade.id, editingName.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameWagon(trade.id, editingName.value); if (e.key === 'Escape') setEditingName(null); }}
                          autoFocus
                          className="text-[10px] font-semibold leading-tight bg-transparent border-b outline-none w-20"
                          style={{ color: 'var(--color-text)', borderColor: 'var(--color-accent)' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingName({ tradeId: trade.id, value: trade.name }); }}
                          className="text-[10px] font-semibold whitespace-nowrap leading-tight text-left hover:underline"
                          style={{ color: 'var(--color-text)' }}
                          title="Click to rename"
                        >
                          {trade.name}
                        </button>
                      )}
                      <span className="text-[7px] font-medium uppercase leading-tight" style={{ color: TAKT_PHASE_MAP.get(trade.taktPhase)?.color || 'var(--color-text-muted)' }}>
                        Wagon {i + 1} · {TAKT_PHASE_MAP.get(trade.taktPhase)?.shortLabel || trade.taktPhase}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-1">
                      {editingField?.tradeId === trade.id && editingField.field === 'taktTime' ? (
                        <input type="number" min={1} max={20} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitInlineEdit} onKeyDown={handleInlineKeyDown} autoFocus className="w-7 text-center text-[9px] font-medium rounded border outline-none" style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-accent)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }} />
                      ) : (
                        <button onClick={() => startInlineEdit(trade.id, 'taktTime', trade.taktTime)} className="text-[9px] font-medium px-1 py-0.5 rounded hover:opacity-70" style={{ background: 'rgba(232,115,26,0.1)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }} title="Takt time">{trade.taktTime}d</button>
                      )}
                      {editingField?.tradeId === trade.id && editingField.field === 'buffer' ? (
                        <input type="number" min={0} max={10} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitInlineEdit} onKeyDown={handleInlineKeyDown} autoFocus className="w-7 text-center text-[9px] font-medium rounded border outline-none" style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-warning)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }} />
                      ) : (
                        <button onClick={() => startInlineEdit(trade.id, 'buffer', trade.bufferAfter)} className="text-[9px] font-medium px-1 py-0.5 rounded hover:opacity-70" style={{ background: trade.bufferAfter === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: trade.bufferAfter === 0 ? 'var(--color-danger)' : 'var(--color-warning)', fontFamily: 'var(--font-mono)' }} title="Buffer">b{trade.bufferAfter}</button>
                      )}
                      {editingField?.tradeId === trade.id && editingField.field === 'crewSize' ? (
                        <input type="number" min={1} max={50} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitInlineEdit} onKeyDown={handleInlineKeyDown} autoFocus className="w-7 text-center text-[9px] font-medium rounded border outline-none" style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-success)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }} />
                      ) : (
                        <button onClick={() => startInlineEdit(trade.id, 'crewSize', trade.crewSize)} className="text-[9px] font-medium px-1 py-0.5 rounded hover:opacity-70" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }} title="Crew size"><span className="inline-flex items-center gap-0.5"><Users size={8} />{trade.crewSize}</span></button>
                      )}
                    </div>
                    {/* Wagon action buttons — visible on hover */}
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleWagonVisibility(trade.id); }}
                        className="p-0.5 rounded hover:opacity-70"
                        style={{ color: 'var(--color-text-muted)' }}
                        title="Hide from takt plan"
                      >
                        <EyeOff size={10} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveWagon(trade.id); }}
                        className="p-0.5 rounded hover:opacity-70"
                        style={{ color: 'var(--color-danger)' }}
                        title="Remove wagon"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  {i < sortedTrades.length - 1 && (() => {
                    const nextTrade = sortedTrades[i + 1];
                    const rel = allRelationships.find(
                      (r) => r.predecessorCode === trade.id && r.successorCode === nextTrade.id,
                    );
                    return (
                      <div className="flex-shrink-0 flex flex-col items-center px-0.5 gap-0">
                        {rel && (
                          <span className="text-[7px] font-bold px-1 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-purple)', fontFamily: 'var(--font-mono)' }}>
                            {rel.type}{rel.lagDays > 0 ? `+${rel.lagDays}` : ''}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                          {trade.bufferAfter > 0 ? `\u2192 b${trade.bufferAfter} \u2192` : '\u2192'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
            {/* Hidden wagons bar */}
            {hiddenTradeIds.size > 0 && (
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t flex-wrap" style={{ borderColor: 'var(--color-border)' }}>
                <EyeOff size={10} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-[9px] font-medium mr-1" style={{ color: 'var(--color-text-muted)' }}>Hidden:</span>
                {trades.filter((t) => hiddenTradeIds.has(t.id)).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleToggleWagonVisibility(t.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all hover:opacity-80"
                    style={{ background: `${t.color}15`, color: t.color, border: `1px dashed ${t.color}40` }}
                    title="Click to show"
                  >
                    <Eye size={9} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Takt Grid — Wagons flowing through Zones per Takt Period ── */}
          <div className="flex-1 overflow-auto">
            <div className="p-3 sm:p-4 md:p-6 lg:p-8">
              {/* Empty state for plan group with no trades or zones */}
              {(sortedTrades.length === 0 || sortedZones.length === 0) && (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                >
                  <Layers size={32} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-3" />
                  <h3 className="text-sm font-medium mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                    No {TAKT_PLAN_GROUPS.find((g) => g.id === planGroup)?.label || planGroup} Data
                  </h3>
                  <p className="text-[11px] max-w-md mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    {sortedTrades.length === 0
                      ? `No trades for "${planGroup}" phase. Use the "Add Wagon" button above to add trades, or switch to another plan group tab.`
                      : `No ${planGroup === 'substructure' ? 'sector/grid' : 'zone'} locations found. Add locations in Project Setup.`}
                  </p>
                  {sortedTrades.length === 0 && (
                    <button
                      onClick={() => setShowAddWagon(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
                      style={{ background: 'var(--color-accent)', color: 'white' }}
                    >
                      <Plus size={12} />
                      Add Wagon
                    </button>
                  )}
                </div>
              )}
              {sortedTrades.length > 0 && sortedZones.length > 0 && (
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ minWidth: Math.max(800, 140 + dayColumns.length * 36) }}>
                    <thead>
                      <tr>
                        <th
                          className="text-left text-[10px] font-semibold uppercase tracking-wider px-3 py-3 border-b sticky left-0 z-10"
                          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', minWidth: 140 }}
                        >
                          Zone / LBS
                        </th>
                        {dayColumns.map((d) => (
                          <th
                            key={d}
                            className="text-center text-[8px] font-semibold px-0 py-3 border-b border-l"
                            style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', minWidth: 36, width: 36 }}
                          >
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedZones.map((zone) => (
                        <tr key={zone.id}>
                          <td
                            className="px-3 py-2 border-b text-xs font-semibold sticky left-0 z-10"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text)' }}
                          >
                            <div className="flex items-start gap-1.5">
                              <div className="flex flex-col min-w-0">
                                {zone.parentFloor && (
                                  <div className="flex items-center gap-1 text-[7px] font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>
                                    <Building2 size={7} />
                                    {zone.parentFloor}
                                  </div>
                                )}
                                <span className="truncate">{zone.name}</span>
                              </div>
                              {zone.group && (
                                <span
                                  className="text-[6px] font-bold uppercase px-1 py-0.5 rounded flex-shrink-0 mt-0.5"
                                  style={{
                                    background: zone.group === 'shell' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
                                    color: zone.group === 'shell' ? '#6366F1' : '#10B981',
                                  }}
                                >
                                  {zone.group === 'shell' ? 'S&C' : 'FO'}
                                </span>
                              )}
                            </div>
                          </td>
                          {buildZoneSegments(zone.id).map((seg, segIdx) => {
                            if (seg.type === 'gap') {
                              return (
                                <td key={`gap-${segIdx}`} colSpan={seg.colSpan} className="px-0 py-1 border-b border-l" style={{ borderColor: 'var(--color-border)' }}>
                                  <div className="h-14" />
                                </td>
                              );
                            }
                            const trade = seg.trade;
                            const cell = seg.cell;
                            if (!trade || !cell) {
                              return <td key={`empty-${segIdx}`} colSpan={seg.colSpan} className="border-b border-l" style={{ borderColor: 'var(--color-border)' }} />;
                            }
                            const statusCfg = STATUS_CONFIG[cell.status];
                            const isSelected = selectedCell?.tradeId === cell.tradeId && selectedCell?.zoneId === zone.id;
                            const hoverKey = `${cell.tradeId}::${zone.id}`;
                            const isHovered = hoveredCell === hoverKey;
                            return (
                              <td
                                key={`w-${segIdx}`}
                                colSpan={seg.colSpan}
                                className="px-0.5 py-1 border-b border-l text-center cursor-pointer"
                                style={{ borderColor: 'var(--color-border)' }}
                                onClick={() => handleCellClick(cell.tradeId, zone.id)}
                                onMouseEnter={() => setHoveredCell(hoverKey)}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                <motion.div
                                  className="rounded-lg px-1.5 py-1 relative h-14 flex flex-col justify-center"
                                  style={{
                                    background: `${trade.color}20`,
                                    boxShadow: isSelected
                                      ? `0 0 0 2px ${trade.color}, 0 0 0 4px var(--color-bg-card)`
                                      : isHovered
                                      ? `0 0 0 1px ${trade.color}40`
                                      : 'none',
                                  }}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                >
                                  <div className="flex items-center gap-0.5 justify-center">
                                    <span className="text-[7px] font-bold w-3 h-3 rounded flex items-center justify-center flex-shrink-0" style={{ background: trade.color, color: 'white', fontFamily: 'var(--font-mono)' }}>
                                      {sortedTrades.findIndex((t) => t.id === trade.id) + 1}
                                    </span>
                                    <span className="text-[9px] font-bold truncate" style={{ color: trade.color }}>
                                      {seg.colSpan >= 3 ? trade.name : (trade.name.length > 8 ? trade.name.substring(0, 8) + '\u2026' : trade.name)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                    <statusCfg.icon size={8} style={{ color: statusCfg.text }} />
                                    <span className="text-[7px] font-semibold" style={{ color: statusCfg.text }}>{statusCfg.label}</span>
                                  </div>
                                  {seg.colSpan >= 2 && (
                                    <div className="text-[7px] mt-0.5 text-center" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                      {formatDate(cell.plannedStart)}{seg.colSpan >= 4 ? ` – ${formatDate(cell.plannedEnd)}` : ''}
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-lg" style={{ background: trade.color }} />
                                  <AnimatePresence>
                                    {isHovered && !isSelected && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none"
                                      >
                                        <div className="rounded-lg px-3 py-2 shadow-lg text-left whitespace-nowrap" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                                          <div className="text-[10px] font-medium" style={{ color: 'var(--color-text)' }}>
                                            {trade.name} — {zone.name}
                                          </div>
                                          <div className="text-[8px] mt-0.5 font-semibold uppercase" style={{ color: TAKT_PHASE_MAP.get(trade.taktPhase)?.color || 'var(--color-text-muted)' }}>
                                            {TAKT_PHASE_MAP.get(trade.taktPhase)?.label} ({TAKT_PHASE_MAP.get(trade.taktPhase)?.omniclass})
                                          </div>
                                          <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            Day {cell.periodNumber} ({seg.colSpan}d) | {formatDate(cell.plannedStart)} – {formatDate(cell.plannedEnd)}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
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
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold truncate" style={{ color: severityColor }}>
                          {w.message}
                        </div>
                        <div className="text-[9px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                          {w.details}
                        </div>
                      </div>
                      {w.type === 'predecessor' && (
                        <button
                          onClick={resolveSequenceConflicts}
                          className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md transition-all hover:opacity-80 flex-shrink-0"
                          style={{ background: 'var(--color-accent)', color: 'white' }}
                        >
                          <Wrench size={9} />
                          Resolve
                        </button>
                      )}
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
                  {/* Wagon & OmniClass Phase */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Wagon #{sortedTrades.findIndex((t) => t.id === selectedCellData.trade.id) + 1}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-4 rounded" style={{ background: selectedCellData.trade.color }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          {selectedCellData.trade.name}
                        </span>
                      </div>
                      {(() => {
                        const phaseInfo = TAKT_PHASE_MAP.get(selectedCellData.trade.taktPhase);
                        return phaseInfo ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${phaseInfo.color}18`, color: phaseInfo.color }}>
                              {phaseInfo.shortLabel}
                            </span>
                            <span className="text-[8px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                              OmniClass {phaseInfo.omniclass} | Uniclass {phaseInfo.uniclass}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Zone (LBS)
                      </label>
                      {selectedCellData.zone.parentFloor && (
                        <div className="flex items-center gap-1 mt-1 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                          <Building2 size={9} />
                          <span>{selectedCellData.zone.parentFloor}</span>
                          <ChevronRight size={8} />
                        </div>
                      )}
                      <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>
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

                  {/* Activity Relationships */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Link2 size={10} style={{ color: 'var(--color-purple)' }} />
                      <label className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Activity Relationships
                      </label>
                      <span className="text-[8px] font-medium px-1 py-0.5 rounded-full ml-auto" style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {selectedWagonRelationships.predecessors.length + selectedWagonRelationships.successors.length}
                      </span>
                    </div>

                    {/* Current wagon */}
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

                    {/* Predecessors */}
                    {selectedWagonRelationships.predecessors.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
                          Predecessors
                        </span>
                        {selectedWagonRelationships.predecessors.map((r, i) => (
                          <div
                            key={`pred-${i}`}
                            className="flex items-center gap-1.5 p-2 rounded-lg"
                            style={{ background: 'var(--color-bg-input)' }}
                          >
                            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: r.tradeColor }} />
                            <span className="text-[9px] font-medium flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                              {r.tradeName}
                            </span>
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-purple)', fontFamily: 'var(--font-mono)' }}>
                              {r.type}
                            </span>
                            {r.lagDays !== 0 && (
                              <span className="text-[8px] font-medium px-1 py-0.5 rounded flex-shrink-0" style={{ background: r.lagDays > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: r.lagDays > 0 ? 'var(--color-warning)' : 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                                {r.lagDays > 0 ? `+${r.lagDays}d` : `${r.lagDays}d`}
                              </span>
                            )}
                            {!r.mandatory && (
                              <span className="text-[7px] font-medium px-1 py-0.5 rounded" style={{ background: 'rgba(156,163,175,0.1)', color: 'var(--color-text-muted)' }}>
                                soft
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Successors */}
                    {selectedWagonRelationships.successors.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-success)' }}>
                          Successors
                        </span>
                        {selectedWagonRelationships.successors.map((r, i) => (
                          <div
                            key={`succ-${i}`}
                            className="flex items-center gap-1.5 p-2 rounded-lg"
                            style={{ background: 'var(--color-bg-input)' }}
                          >
                            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: r.tradeColor }} />
                            <span className="text-[9px] font-medium flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                              {r.tradeName}
                            </span>
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-purple)', fontFamily: 'var(--font-mono)' }}>
                              {r.type}
                            </span>
                            {r.lagDays !== 0 && (
                              <span className="text-[8px] font-medium px-1 py-0.5 rounded flex-shrink-0" style={{ background: r.lagDays > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: r.lagDays > 0 ? 'var(--color-warning)' : 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                                {r.lagDays > 0 ? `+${r.lagDays}d` : `${r.lagDays}d`}
                              </span>
                            )}
                            {!r.mandatory && (
                              <span className="text-[7px] font-medium px-1 py-0.5 rounded" style={{ background: 'rgba(156,163,175,0.1)', color: 'var(--color-text-muted)' }}>
                                soft
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedWagonRelationships.predecessors.length === 0 && selectedWagonRelationships.successors.length === 0 && (
                      <div className="text-[9px] py-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
                        No relationships defined
                      </div>
                    )}
                  </div>

                  {/* Sub-Activities */}
                  {selectedSubActivities.length > 0 && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowSubActivities(!showSubActivities)}
                        className="flex items-center gap-1.5 w-full text-left"
                      >
                        {showSubActivities ? <ChevronUp size={10} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={10} style={{ color: 'var(--color-text-muted)' }} />}
                        <label className="text-[9px] font-semibold uppercase tracking-wider cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                          Sub-Activities
                        </label>
                        <span className="text-[8px] font-medium px-1 py-0.5 rounded-full ml-auto" style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {selectedSubActivities.length}
                        </span>
                      </button>

                      <AnimatePresence>
                        {showSubActivities && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-1"
                          >
                            {selectedSubActivities.map((r, i) => (
                              <div
                                key={`sub-${i}`}
                                className="flex items-center gap-1.5 p-1.5 rounded-lg text-[8px]"
                                style={{ background: 'var(--color-bg-input)' }}
                              >
                                <span className="font-mono font-medium flex-shrink-0" style={{ color: 'var(--color-accent)' }}>{r.predecessorCode}</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>{'\u2192'}</span>
                                <span className="font-mono font-medium flex-shrink-0" style={{ color: 'var(--color-success)' }}>{r.successorCode}</span>
                                <span className="font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-purple)' }}>{r.type}</span>
                                {r.lagDays !== 0 && (
                                  <span className="font-medium" style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>+{r.lagDays}d</span>
                                )}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Zone-to-Zone Flow for this Trade */}
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      Zone Flow Continuity
                    </label>
                    <div className="space-y-1">
                      {sortedZones.map((z) => {
                        const cellKey = `${selectedCellData.trade.id}::${z.id}`;
                        const c = cells.get(cellKey);
                        const isCurrent = z.id === selectedCellData.zone.id;
                        return (
                          <div
                            key={z.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px]"
                            style={{
                              background: isCurrent ? `${selectedCellData.trade.color}15` : 'transparent',
                              border: isCurrent ? `1px solid ${selectedCellData.trade.color}40` : '1px solid transparent',
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c ? STATUS_CONFIG[c.status].text : 'var(--color-border)' }} />
                            <span className="flex-1 truncate" style={{ color: isCurrent ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: isCurrent ? 600 : 400 }}>
                              {z.name}
                            </span>
                            {c && (
                              <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                T{c.periodNumber}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
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

    </>
  );
}
