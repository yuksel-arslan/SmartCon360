import { create } from 'zustand';
import type { FlowlineSegment } from '@/lib/mockData';

export type ViewMode = 'flowline' | 'grid' | 'timeline';
export type StatusFilter = 'all' | 'completed' | 'in_progress' | 'planned' | 'delayed';

export interface SelectedSegment {
  tradeName: string;
  tradeColor: string;
  segment: FlowlineSegment;
  zoneName: string;
}

interface FlowlineState {
  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Filters
  visibleTrades: Set<string>;
  toggleTrade: (name: string) => void;
  setAllTrades: (names: string[]) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  dateRange: { start: number | null; end: number | null };
  setDateRange: (range: { start: number | null; end: number | null }) => void;
  zoneFilter: string | null;
  setZoneFilter: (zone: string | null) => void;

  // Selection
  selectedSegment: SelectedSegment | null;
  setSelectedSegment: (seg: SelectedSegment | null) => void;

  // Comparison
  comparisonMode: boolean;
  toggleComparisonMode: () => void;

  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Chart dimensions
  chartHeight: number;
  setChartHeight: (h: number) => void;

  // Critical path
  showCriticalPath: boolean;
  toggleCriticalPath: () => void;

  // Buffers
  showBuffers: boolean;
  toggleBuffers: () => void;

  // Progress overlay
  showProgress: boolean;
  toggleProgress: () => void;
}

export const useFlowlineStore = create<FlowlineState>((set) => ({
  viewMode: 'flowline',
  setViewMode: (mode) => set({ viewMode: mode }),

  visibleTrades: new Set<string>(),
  toggleTrade: (name) =>
    set((state) => {
      const next = new Set(state.visibleTrades);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { visibleTrades: next };
    }),
  setAllTrades: (names) => set({ visibleTrades: new Set(names) }),

  statusFilter: 'all',
  setStatusFilter: (filter) => set({ statusFilter: filter }),

  dateRange: { start: null, end: null },
  setDateRange: (range) => set({ dateRange: range }),

  zoneFilter: null,
  setZoneFilter: (zone) => set({ zoneFilter: zone }),

  selectedSegment: null,
  setSelectedSegment: (seg) => set({ selectedSegment: seg }),

  comparisonMode: false,
  toggleComparisonMode: () => set((s) => ({ comparisonMode: !s.comparisonMode })),

  isFullscreen: false,
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  chartHeight: 520,
  setChartHeight: (h) => set({ chartHeight: h }),

  showCriticalPath: true,
  toggleCriticalPath: () => set((s) => ({ showCriticalPath: !s.showCriticalPath })),

  showBuffers: true,
  toggleBuffers: () => set((s) => ({ showBuffers: !s.showBuffers })),

  showProgress: true,
  toggleProgress: () => set((s) => ({ showProgress: !s.showProgress })),
}));
