'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import FlowlineChart from '@/components/charts/FlowlineChart';
import type { FlowlineChartHandle } from '@/components/charts/FlowlineChart';
import {
  DEMO_FLOWLINE,
  DEMO_ZONES,
  DEMO_TODAY_X,
  DEMO_TOTAL_PERIODS,
  DEMO_BUFFERS,
  DEMO_SIMULATION_FLOWLINE,
  DEMO_FLOWLINE_STATS,
  DEMO_TRADES,
} from '@/lib/mockData';
import type { FlowlineWagon } from '@/lib/mockData';
import { useFlowlineStore } from '@/stores/flowlineStore';
import { getFlowlineData, listPlans } from '@/lib/stores/takt-plans';
import type { ViewMode, StatusFilter, SelectedSegment } from '@/stores/flowlineStore';
import {
  Eye,
  EyeOff,
  Download,
  Maximize2,
  Minimize2,
  Filter,
  Wifi,
  WifiOff,
  BarChart3,
  GitCompareArrows,
  Layers,
  Grid3X3,
  GanttChart,
  ChevronDown,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Image,
  FileCode2,
  Activity,
  TrendingUp,
  Zap,
  LayoutDashboard,
} from 'lucide-react';

// ── View mode config ────────────────────────────────────────────

const VIEW_MODES: { id: ViewMode; label: string; icon: typeof Layers }[] = [
  { id: 'flowline', label: 'Flowline', icon: Layers },
  { id: 'grid', label: 'Grid', icon: Grid3X3 },
  { id: 'timeline', label: 'Timeline', icon: GanttChart },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'planned', label: 'Planned' },
  { value: 'delayed', label: 'Delayed' },
];

// ── Page Component ──────────────────────────────────────────────

export default function FlowlinePage() {
  const chartRef = useRef<FlowlineChartHandle>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const {
    viewMode, setViewMode,
    visibleTrades, toggleTrade, setAllTrades,
    statusFilter, setStatusFilter,
    zoneFilter, setZoneFilter,
    selectedSegment, setSelectedSegment,
    comparisonMode, toggleComparisonMode,
    isFullscreen, toggleFullscreen,
    isConnected, setConnected,
    chartHeight, setChartHeight,
    showCriticalPath, toggleCriticalPath,
    showBuffers, toggleBuffers,
    showProgress, toggleProgress,
  } = useFlowlineStore();

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [flowlineData, setFlowlineData] = useState<FlowlineWagon[]>(DEMO_FLOWLINE);
  const [zonesData, setZonesData] = useState(DEMO_ZONES);
  const [todayX, setTodayX] = useState(DEMO_TODAY_X);
  const [totalPeriods, setTotalPeriods] = useState(DEMO_TOTAL_PERIODS);

  // ── Load flowline data from API ──────────────────────────

  useEffect(() => {
    const projectId = 'demo-project-001';
    (async () => {
      try {
        const plans = await listPlans(projectId);
        if (plans.length > 0) {
          const data = await getFlowlineData(projectId, plans[0].id);
          if (data && Array.isArray((data as Record<string, unknown>).wagons)) {
            const apiData = data as { wagons: FlowlineWagon[]; zones: typeof DEMO_ZONES; todayX: number; totalPeriods: number };
            setFlowlineData(apiData.wagons);
            if (apiData.zones) setZonesData(apiData.zones);
            if (apiData.todayX) setTodayX(apiData.todayX);
            if (apiData.totalPeriods) setTotalPeriods(apiData.totalPeriods);
          }
        }
        setConnected(true);
      } catch {
        // Fallback to demo data — API not available
        setConnected(false);
      }
    })();
  }, [setConnected]);

  // ── Initialize visible trades on mount ──────────────────────

  useEffect(() => {
    if (visibleTrades.size === 0) {
      setAllTrades(flowlineData.map((w) => w.trade_name));
    }
  }, [visibleTrades.size, setAllTrades, flowlineData]);

  // ── Filter wagons ─────────────────────────────────────────

  const filteredWagons: FlowlineWagon[] = flowlineData
    .filter((w) => visibleTrades.has(w.trade_name))
    .map((wagon) => {
      if (statusFilter === 'all' && !zoneFilter) return wagon;
      const filteredSegs = wagon.segments.filter((seg) => {
        if (statusFilter !== 'all' && seg.status !== statusFilter) return false;
        if (zoneFilter && zonesData[seg.zone_index]?.id !== zoneFilter) return false;
        return true;
      });
      return { ...wagon, segments: filteredSegs };
    })
    .filter((w) => w.segments.length > 0);

  // ── Fullscreen handling ───────────────────────────────────

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen, toggleFullscreen]);

  // ── Export handlers ───────────────────────────────────────

  const handleExportSVG = useCallback(() => {
    const svgString = chartRef.current?.exportSVG();
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowline-chart.svg';
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }, []);

  const handleExportPNG = useCallback(async () => {
    const blob = await chartRef.current?.exportPNG(2);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowline-chart.png';
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }, []);

  // ── Stats computation ─────────────────────────────────────

  const stats = {
    ...DEMO_FLOWLINE_STATS,
    totalDuration: totalPeriods,
  };

  // ── Render ────────────────────────────────────────────────

  const fullscreenClasses = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col'
    : 'flex-1 overflow-auto';

  return (
    <>
      {!isFullscreen && <TopBar title="Flowline" />}
      <div
        className={fullscreenClasses}
        style={{ background: isFullscreen ? 'var(--color-bg)' : undefined }}
      >
        <div className={`${isFullscreen ? 'flex-1 overflow-auto' : ''} p-3 sm:p-4 md:p-6 lg:p-8 space-y-3 sm:space-y-4`}>

          {/* ── Connection indicator + View modes + Actions bar ── */}
          <div
            className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            {/* Left: Connection + View modes */}
            <div className="flex items-center gap-3">
              {/* WebSocket indicator */}
              <motion.div
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-normal"
                style={{
                  background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: isConnected ? 'var(--color-success)' : 'var(--color-danger)',
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {isConnected ? 'Live' : 'Disconnected'}
                {isConnected && (
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--color-success)' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>

              {/* Divider */}
              <div className="w-px h-5" style={{ background: 'var(--color-border)' }} />

              {/* View mode tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--color-bg)' }}>
                {VIEW_MODES.map((mode) => {
                  const active = viewMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-normal transition-all"
                      style={{
                        background: active ? 'var(--color-bg-card)' : 'transparent',
                        color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.2)' : undefined,
                      }}
                    >
                      <mode.icon size={12} />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              {/* Comparison toggle */}
              <button
                onClick={toggleComparisonMode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-normal border transition-all"
                style={{
                  borderColor: comparisonMode ? 'var(--color-purple)' : 'var(--color-border)',
                  background: comparisonMode ? 'rgba(245,158,63,0.1)' : 'transparent',
                  color: comparisonMode ? 'var(--color-purple)' : 'var(--color-text-muted)',
                }}
              >
                <GitCompareArrows size={12} />
                Simulation
              </button>

              {/* Filter panel toggle */}
              <button
                onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-normal border transition-all"
                style={{
                  borderColor: filterPanelOpen ? 'var(--color-accent)' : 'var(--color-border)',
                  background: filterPanelOpen ? 'rgba(232,115,26,0.1)' : 'transparent',
                  color: filterPanelOpen ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                <Filter size={12} />
                Filters
                <ChevronDown
                  size={10}
                  style={{
                    transform: filterPanelOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  title="Export"
                >
                  <Download size={13} />
                </button>
                <AnimatePresence>
                  {exportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 rounded-lg border shadow-xl z-30 py-1 min-w-[140px]"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      <button
                        onClick={handleExportSVG}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <FileCode2 size={12} />
                        Export SVG
                      </button>
                      <button
                        onClick={handleExportPNG}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <Image size={12} />
                        Export PNG
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="w-7 h-7 rounded-lg border flex items-center justify-center"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
          </div>

          {/* ── Filter Panel (collapsible) ────────────────────── */}
          <AnimatePresence>
            {filterPanelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div
                  className="rounded-xl border p-4 space-y-4"
                  style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                >
                  {/* Trade filters */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BarChart3 size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Trades
                      </span>
                      <button
                        onClick={() => {
                          const allNames = flowlineData.map((w) => w.trade_name);
                          if (visibleTrades.size === allNames.length) {
                            setAllTrades([]);
                          } else {
                            setAllTrades(allNames);
                          }
                        }}
                        className="ml-auto text-[9px] font-normal px-1.5 py-0.5 rounded"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {visibleTrades.size === flowlineData.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {flowlineData.map((w) => {
                        const active = visibleTrades.has(w.trade_name);
                        return (
                          <button
                            key={w.trade_name}
                            onClick={() => toggleTrade(w.trade_name)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-normal border transition-all"
                            style={{
                              borderColor: active ? w.color : 'var(--color-border)',
                              background: active ? `${w.color}15` : 'transparent',
                              color: active ? w.color : 'var(--color-text-muted)',
                              opacity: active ? 1 : 0.5,
                            }}
                          >
                            {active ? <Eye size={10} /> : <EyeOff size={10} />}
                            {w.trade_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status + Zone + Overlays */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Status filter */}
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="w-full rounded-lg border px-3 py-1.5 text-xs outline-none"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Zone filter */}
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                        Zone
                      </label>
                      <select
                        value={zoneFilter ?? ''}
                        onChange={(e) => setZoneFilter(e.target.value || null)}
                        className="w-full rounded-lg border px-3 py-1.5 text-xs outline-none"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        <option value="">All Zones</option>
                        {zonesData.map((z) => (
                          <option key={z.id} value={z.id}>{z.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Overlay toggles */}
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
                        Overlays
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Critical Path', active: showCriticalPath, toggle: toggleCriticalPath, icon: Zap },
                          { label: 'Buffers', active: showBuffers, toggle: toggleBuffers, icon: Shield },
                          { label: 'Progress', active: showProgress, toggle: toggleProgress, icon: Activity },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={item.toggle}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-normal border transition-all"
                            style={{
                              borderColor: item.active ? 'var(--color-accent)' : 'var(--color-border)',
                              background: item.active ? 'rgba(232,115,26,0.1)' : 'transparent',
                              color: item.active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            }}
                          >
                            <item.icon size={10} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Stats Bar ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
            {[
              { label: 'Duration', value: `${stats.totalDuration}T`, icon: Clock, color: 'var(--color-accent)' },
              { label: 'Trades', value: `${filteredWagons.length}/${flowlineData.length}`, icon: Layers, color: 'var(--color-purple)' },
              { label: 'Zones', value: zonesData.length, icon: LayoutDashboard, color: 'var(--color-cyan)' },
              { label: 'Progress', value: `${stats.overallProgress}%`, icon: TrendingUp, color: 'var(--color-success)' },
              { label: 'PPC', value: `${stats.ppc}%`, icon: CheckCircle2, color: 'var(--color-success)' },
              { label: 'Stacking', value: stats.stackingConflicts, icon: AlertTriangle, color: stats.stackingConflicts > 0 ? 'var(--color-warning)' : 'var(--color-success)' },
              { label: 'Buffers', value: `${stats.bufferHealthy}/${stats.bufferHealthy + stats.bufferWarning + stats.bufferCritical}`, icon: Shield, color: stats.bufferCritical > 0 ? 'var(--color-danger)' : 'var(--color-success)' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="rounded-xl border p-3 flex items-center gap-3"
                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${stat.color} 12%, transparent)` }}
                >
                  <stat.icon size={14} style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="text-sm font-medium leading-none" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="text-[9px] font-normal uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Main Chart Area ───────────────────────────────── */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Chart */}
            <div
              ref={chartContainerRef}
              className="flex-1 min-w-0 rounded-xl border p-3 sm:p-5"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                    Hotel Sapphire — Location-Time Chart
                  </h2>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {viewMode === 'flowline' && 'Scroll to zoom, drag to pan, double-click to reset. Click a segment for details.'}
                    {viewMode === 'grid' && 'Grid view: trade-zone matrix overview'}
                    {viewMode === 'timeline' && 'Timeline view: sequential Gantt layout'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {comparisonMode && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-normal flex items-center gap-1"
                      style={{ background: 'rgba(245,158,63,0.12)', color: 'var(--color-purple)' }}
                    >
                      <GitCompareArrows size={10} />
                      Comparing with Simulation
                    </span>
                  )}
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md font-normal"
                    style={{ background: 'rgba(232,115,26,0.12)', color: 'var(--color-accent)' }}
                  >
                    {filteredWagons.length} of {flowlineData.length} trades visible
                  </span>
                </div>
              </div>

              {/* Flowline view */}
              {viewMode === 'flowline' && (
                <FlowlineChart
                  ref={chartRef}
                  wagons={filteredWagons}
                  zones={zonesData}
                  todayX={todayX}
                  totalPeriods={totalPeriods}
                  height={isFullscreen ? Math.max(600, window.innerHeight - 400) : chartHeight}
                  showCriticalPath={showCriticalPath}
                  showBuffers={showBuffers}
                  showProgress={showProgress}
                  buffers={DEMO_BUFFERS}
                  comparisonWagons={comparisonMode ? DEMO_SIMULATION_FLOWLINE.filter((w) => visibleTrades.has(w.trade_name)) : null}
                  selectedSegment={selectedSegment}
                  onSegmentSelect={setSelectedSegment}
                />
              )}

              {/* Grid view placeholder */}
              {viewMode === 'grid' && (
                <div className="overflow-auto" style={{ maxHeight: chartHeight }}>
                  <table className="w-full text-[11px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th
                          className="sticky left-0 z-10 px-3 py-2 text-left font-medium"
                          style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}
                        >
                          Trade
                        </th>
                        {zonesData.map((z) => (
                          <th
                            key={z.id}
                            className="px-2 py-2 text-center font-normal"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {z.name.split(' — ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWagons.map((wagon) => (
                        <tr key={wagon.trade_name}>
                          <td
                            className="sticky left-0 z-10 px-3 py-2 font-normal whitespace-nowrap"
                            style={{ background: 'var(--color-bg-card)', color: wagon.color }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: wagon.color }} />
                              {wagon.trade_name}
                            </div>
                          </td>
                          {wagon.segments.map((seg, idx) => {
                            const statusBg =
                              seg.status === 'completed' ? 'rgba(16,185,129,0.15)'
                                : seg.status === 'in_progress' ? 'rgba(232,115,26,0.15)'
                                  : seg.status === 'delayed' ? 'rgba(239,68,68,0.15)'
                                    : 'transparent';
                            const statusColor =
                              seg.status === 'completed' ? 'var(--color-success)'
                                : seg.status === 'in_progress' ? 'var(--color-accent)'
                                  : seg.status === 'delayed' ? 'var(--color-danger)'
                                    : 'var(--color-text-muted)';
                            return (
                              <td
                                key={idx}
                                className="px-2 py-2 text-center border"
                                style={{ background: statusBg, borderColor: 'var(--color-border)', color: statusColor }}
                              >
                                <div className="font-medium">{seg.percentComplete}%</div>
                                <div className="text-[9px] opacity-60">T{seg.x_start}-T{seg.x_end}</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Timeline view placeholder */}
              {viewMode === 'timeline' && (
                <div className="space-y-2" style={{ maxHeight: chartHeight, overflowY: 'auto' }}>
                  {filteredWagons.map((wagon) => (
                    <div key={wagon.trade_name} className="flex items-center gap-3">
                      <div className="w-24 flex-shrink-0 text-[11px] font-normal truncate" style={{ color: wagon.color }}>
                        {wagon.trade_name}
                      </div>
                      <div className="flex-1 flex gap-0.5 h-6 rounded overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                        {Array.from({ length: totalPeriods }).map((_, p) => {
                          const seg = wagon.segments.find((s) => s.x_start <= p && s.x_end > p);
                          const bg = seg
                            ? seg.status === 'completed' ? wagon.color
                              : seg.status === 'in_progress' ? `${wagon.color}80`
                                : seg.status === 'delayed' ? 'var(--color-danger)'
                                  : `${wagon.color}20`
                            : 'transparent';
                          return (
                            <div
                              key={p}
                              className="flex-1 transition-colors"
                              style={{ background: bg, opacity: seg ? 1 : 0.3 }}
                              title={seg ? `${wagon.trade_name} — T${p} (${seg.status})` : `T${p}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Today indicator */}
                  <div className="flex items-center gap-3">
                    <div className="w-24" />
                    <div className="flex-1 relative h-0.5">
                      <div
                        className="absolute top-0 h-full"
                        style={{
                          left: `${(todayX / totalPeriods) * 100}%`,
                          width: '2px',
                          background: 'var(--color-danger)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Segment Details Panel ──────────────────────── */}
            <AnimatePresence>
              {selectedSegment && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="w-full lg:w-[320px] flex-shrink-0"
                >
                  <div
                    className="rounded-xl border overflow-y-auto"
                    style={{
                      background: 'var(--color-bg-card)',
                      borderColor: 'var(--color-border)',
                      maxHeight: isFullscreen ? 'calc(100vh - 300px)' : chartHeight + 40,
                    }}
                  >
                    {/* ── Header ── */}
                    <div
                      className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
                      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${selectedSegment.tradeColor}18` }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ background: selectedSegment.tradeColor }} />
                        </div>
                        <div>
                          <h3 className="text-[13px] font-medium" style={{ color: 'var(--color-text)' }}>
                            {selectedSegment.tradeName}
                          </h3>
                          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {selectedSegment.zoneName}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedSegment(null)}
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                        style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg)' }}
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* ── Content ── */}
                    <div className="p-4 space-y-4">

                      {/* Status + Progress row */}
                      <div className="flex items-center gap-3">
                        <StatusBadge status={selectedSegment.segment.status} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                              Progress
                            </span>
                            <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-mono)', color: selectedSegment.tradeColor }}>
                              {selectedSegment.segment.percentComplete}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: selectedSegment.tradeColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedSegment.segment.percentComplete}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Critical path indicator */}
                      {selectedSegment.segment.isCriticalPath && (
                        <div
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-normal"
                          style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}
                        >
                          <Zap size={12} />
                          On Critical Path
                        </div>
                      )}

                      {/* ── Schedule Section ── */}
                      <div>
                        <div className="text-[9px] font-medium uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                          <Clock size={10} />
                          Schedule
                        </div>
                        <div
                          className="rounded-lg border p-3 space-y-2"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
                        >
                          <DetailRow label="Period" value={`T${selectedSegment.segment.x_start} — T${selectedSegment.segment.x_end}`} mono />
                          <DetailRow label="Planned Start" value={selectedSegment.segment.plannedStart} mono />
                          <DetailRow label="Planned End" value={selectedSegment.segment.plannedEnd} mono />
                          {selectedSegment.segment.actualStart && (
                            <DetailRow label="Actual Start" value={selectedSegment.segment.actualStart} mono />
                          )}
                          {selectedSegment.segment.actualEnd && (
                            <DetailRow label="Actual End" value={selectedSegment.segment.actualEnd} mono />
                          )}
                          {selectedSegment.segment.crew && (
                            <DetailRow label="Crew" value={selectedSegment.segment.crew} />
                          )}
                        </div>
                      </div>

                      {/* ── Activities Section ── */}
                      {selectedSegment.segment.tasks && selectedSegment.segment.tasks.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                              <Activity size={10} />
                              Activities
                            </span>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                background: selectedSegment.segment.tasks.every(t => t.status === 'done')
                                  ? 'rgba(16,185,129,0.12)' : 'var(--color-bg)',
                                color: selectedSegment.segment.tasks.every(t => t.status === 'done')
                                  ? 'var(--color-success)' : 'var(--color-text-muted)',
                              }}
                            >
                              {selectedSegment.segment.tasks.filter(t => t.status === 'done').length}/{selectedSegment.segment.tasks.length}
                            </span>
                          </div>
                          <div
                            className="rounded-lg border divide-y"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
                          >
                            {selectedSegment.segment.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2.5 px-3 py-2.5"
                                style={{ borderColor: 'var(--color-border)' }}
                              >
                                <div className="flex-shrink-0">
                                  {task.status === 'done' ? (
                                    <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                                  ) : task.status === 'active' ? (
                                    <motion.div
                                      animate={{ scale: [1, 1.15, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    >
                                      <Clock size={14} style={{ color: selectedSegment.tradeColor }} />
                                    </motion.div>
                                  ) : (
                                    <div
                                      className="w-[14px] h-[14px] rounded-full border-2"
                                      style={{ borderColor: 'var(--color-border)' }}
                                    />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-[11px] font-normal"
                                    style={{
                                      color: task.status === 'todo' ? 'var(--color-text-muted)' : 'var(--color-text)',
                                      textDecoration: task.status === 'done' ? 'line-through' : undefined,
                                      textDecorationColor: 'var(--color-text-muted)',
                                    }}
                                  >
                                    {task.name}
                                  </div>
                                  {task.status === 'active' && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-card)' }}>
                                        <motion.div
                                          className="h-full rounded-full"
                                          style={{ background: selectedSegment.tradeColor }}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${task.progress}%` }}
                                          transition={{ duration: 0.5, ease: 'easeOut' }}
                                        />
                                      </div>
                                      <span
                                        className="text-[9px] font-medium"
                                        style={{ fontFamily: 'var(--font-mono)', color: selectedSegment.tradeColor }}
                                      >
                                        {task.progress}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {task.status === 'done' && (
                                  <span
                                    className="text-[9px] font-medium flex-shrink-0"
                                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}
                                  >
                                    100%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Helper sub-components ───────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        className="text-[11px] font-normal"
        style={{ color: 'var(--color-text)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)' }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    completed: { bg: 'rgba(16,185,129,0.12)', color: 'var(--color-success)', label: 'Completed' },
    in_progress: { bg: 'rgba(232,115,26,0.12)', color: 'var(--color-accent)', label: 'In Progress' },
    planned: { bg: 'rgba(100,116,139,0.12)', color: 'var(--color-text-muted)', label: 'Planned' },
    delayed: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)', label: 'Delayed' },
  };
  const c = config[status] || config.planned;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}
