'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import type { FlowlineWagon, FlowlineSegment, BufferZone } from '@/lib/mockData';
import type { SelectedSegment } from '@/stores/flowlineStore';

// ── Types ────────────────────────────────────────────────────────

interface FlowlineChartProps {
  wagons: FlowlineWagon[];
  zones: { id?: string; name: string; y_index?: number }[];
  todayX: number;
  totalPeriods: number;
  height?: number;
  mini?: boolean;
  showCriticalPath?: boolean;
  showBuffers?: boolean;
  showProgress?: boolean;
  buffers?: BufferZone[];
  comparisonWagons?: FlowlineWagon[] | null;
  selectedSegment?: SelectedSegment | null;
  onSegmentSelect?: (seg: SelectedSegment | null) => void;
}

export interface FlowlineChartHandle {
  exportSVG: () => string | null;
  exportPNG: (scale?: number) => Promise<Blob | null>;
}

// ── Status color helpers ─────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--color-success)',
  in_progress: 'var(--color-accent)',
  planned: 'var(--color-text-muted)',
  delayed: 'var(--color-danger)',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  planned: 'Planned',
  delayed: 'Delayed',
};

const BUFFER_HEALTH_COLORS: Record<string, string> = {
  healthy: 'var(--color-success)',
  warning: 'var(--color-warning)',
  critical: 'var(--color-danger)',
};

// ── Component ────────────────────────────────────────────────────

const FlowlineChart = forwardRef<FlowlineChartHandle, FlowlineChartProps>(
  function FlowlineChart(
    {
      wagons,
      zones,
      todayX,
      totalPeriods,
      height = 520,
      mini = false,
      showCriticalPath = true,
      showBuffers = true,
      showProgress = true,
      buffers = [],
      comparisonWagons = null,
      selectedSegment = null,
      onSegmentSelect,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // ── Export methods ──────────────────────────────────────────

    const exportSVG = useCallback((): string | null => {
      if (!svgRef.current) return null;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgRef.current);
      return svgString;
    }, []);

    const exportPNG = useCallback(async (scale = 2): Promise<Blob | null> => {
      if (!svgRef.current) return null;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgRef.current);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            resolve(blob);
          }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    }, []);

    useImperativeHandle(ref, () => ({ exportSVG, exportPNG }), [exportSVG, exportPNG]);

    // ── Main D3 render ──────────────────────────────────────────

    useEffect(() => {
      if (!svgRef.current || !containerRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const containerWidth = containerRef.current.clientWidth || 900;

      // Responsive margins — tighter on narrow screens
      const isNarrow = containerWidth < 640;
      const margin = mini
        ? { top: 20, right: 20, bottom: 30, left: 20 }
        : { top: 40, right: 60, bottom: 70, left: isNarrow ? 80 : 160 };

      // Enforce minimum chart width to prevent line stacking on mobile.
      // When the container is too narrow the SVG overflows and
      // the wrapper's overflow-x: auto provides horizontal scroll.
      const minInnerWidth = mini ? 200 : Math.max(totalPeriods * 42, 600);
      const rawInner = containerWidth - margin.left - margin.right;
      const innerWidth = Math.max(rawInner, minInnerWidth);
      const width = innerWidth + margin.left + margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('font-family', 'Inter, sans-serif');

      // ── Defs (patterns, gradients, filters) ───────────────────

      const defs = svg.append('defs');

      // Hatching pattern for progress overlay
      const hatch = defs.append('pattern')
        .attr('id', 'progress-hatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 6)
        .attr('height', 6);
      hatch.append('path')
        .attr('d', 'M0,6 L6,0')
        .attr('stroke', 'var(--color-text-muted)')
        .attr('stroke-width', 0.8)
        .attr('stroke-opacity', 0.3);

      // Glow filter for critical path
      const glow = defs.append('filter')
        .attr('id', 'critical-glow')
        .attr('x', '-20%').attr('y', '-20%')
        .attr('width', '140%').attr('height', '140%');
      glow.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur');
      const glowMerge = glow.append('feMerge');
      glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
      glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Today line gradient
      const todayGrad = defs.append('linearGradient')
        .attr('id', 'today-gradient')
        .attr('x1', '0').attr('y1', '0')
        .attr('x2', '0').attr('y2', '1');
      todayGrad.append('stop').attr('offset', '0%').attr('stop-color', 'var(--color-danger)').attr('stop-opacity', 0.9);
      todayGrad.append('stop').attr('offset', '100%').attr('stop-color', 'var(--color-danger)').attr('stop-opacity', 0.3);

      // Buffer gradient per health
      (['healthy', 'warning', 'critical'] as const).forEach((h) => {
        const grad = defs.append('linearGradient')
          .attr('id', `buffer-grad-${h}`)
          .attr('x1', '0').attr('y1', '0')
          .attr('x2', '1').attr('y2', '0');
        const c = h === 'healthy' ? 'var(--color-success)' : h === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)';
        grad.append('stop').attr('offset', '0%').attr('stop-color', c).attr('stop-opacity', 0.08);
        grad.append('stop').attr('offset', '50%').attr('stop-color', c).attr('stop-opacity', 0.2);
        grad.append('stop').attr('offset', '100%').attr('stop-color', c).attr('stop-opacity', 0.08);
      });

      // ── Root group with zoom ──────────────────────────────────

      const rootG = svg.append('g').attr('class', 'root-group');
      const g = rootG.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Clip path
      defs.append('clipPath')
        .attr('id', 'chart-clip')
        .append('rect')
        .attr('x', 0).attr('y', -margin.top + 10)
        .attr('width', innerWidth)
        .attr('height', innerHeight + margin.top + margin.bottom - 20);

      const chartArea = g.append('g').attr('clip-path', 'url(#chart-clip)');

      // ── Scales ────────────────────────────────────────────────

      const xScale = d3.scaleLinear().domain([0, totalPeriods]).range([0, innerWidth]);
      const yScale = d3.scaleLinear().domain([0, zones.length - 1]).range([0, innerHeight]);

      // ── Read CSS variables ────────────────────────────────────

      const rootStyle = getComputedStyle(document.documentElement);
      const textColor = rootStyle.getPropertyValue('--color-text-muted').trim() || '#64748B';
      const borderColor = rootStyle.getPropertyValue('--color-border').trim() || '#1E293B';
      const bgCard = rootStyle.getPropertyValue('--color-bg-card').trim() || '#1A2035';
      const textMain = rootStyle.getPropertyValue('--color-text').trim() || '#F1F5F9';

      // ── Grid lines ────────────────────────────────────────────

      if (!mini) {
        // Zone band backgrounds (alternating)
        zones.forEach((_, i) => {
          if (i % 2 === 0) {
            chartArea.append('rect')
              .attr('x', 0)
              .attr('y', yScale(i) - (i === 0 ? 10 : (yScale(1) - yScale(0)) / 2))
              .attr('width', innerWidth)
              .attr('height', i === 0 ? yScale(1) / 2 + 10 : yScale(1) - yScale(0))
              .attr('fill', borderColor)
              .attr('fill-opacity', 0.15);
          }
        });

        // Horizontal grid lines
        zones.forEach((_, i) => {
          chartArea.append('line')
            .attr('x1', 0).attr('x2', innerWidth)
            .attr('y1', yScale(i)).attr('y2', yScale(i))
            .attr('stroke', borderColor).attr('stroke-opacity', 0.4)
            .attr('stroke-dasharray', '3,3');
        });

        // Vertical grid lines (period boundaries)
        for (let p = 0; p <= totalPeriods; p++) {
          chartArea.append('line')
            .attr('x1', xScale(p)).attr('x2', xScale(p))
            .attr('y1', -10).attr('y2', innerHeight + 10)
            .attr('stroke', borderColor).attr('stroke-opacity', 0.2)
            .attr('stroke-dasharray', '2,4');
        }
      }

      // ── Y axis — zone labels ──────────────────────────────────

      if (!mini) {
        zones.forEach((zone, i) => {
          // Truncate zone labels on narrow screens to prevent overflow
          const maxLabelChars = isNarrow ? 10 : 30;
          const label = zone.name.length > maxLabelChars
            ? zone.name.slice(0, maxLabelChars - 1) + '\u2026'
            : zone.name;

          g.append('text')
            .attr('x', -12)
            .attr('y', yScale(i))
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('fill', textColor)
            .attr('font-size', isNarrow ? '9px' : '11px')
            .attr('font-family', 'Inter, sans-serif')
            .text(label);
        });
      }

      // ── X axis — period labels ────────────────────────────────

      if (!mini) {
        for (let p = 0; p <= totalPeriods; p += (totalPeriods > 30 ? 5 : totalPeriods > 15 ? 2 : 1)) {
          g.append('text')
            .attr('x', xScale(p))
            .attr('y', innerHeight + 25)
            .attr('text-anchor', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '10px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .text(`T${p}`);
        }

        g.append('text')
          .attr('x', innerWidth / 2)
          .attr('y', innerHeight + 50)
          .attr('text-anchor', 'middle')
          .attr('fill', textColor)
          .attr('font-size', '11px')
          .attr('font-weight', '500')
          .text('Takt Periods');
      }

      // ── Buffer visualization ──────────────────────────────────

      if (showBuffers && !mini && buffers.length > 0) {
        const bufferGroup = chartArea.append('g').attr('class', 'buffers');

        buffers.forEach((buffer) => {
          buffer.segments.forEach((seg) => {
            const x1 = xScale(seg.x_start);
            const x2 = xScale(seg.x_end);
            const cy = yScale(seg.y);
            const bandHeight = zones.length > 1 ? (yScale(1) - yScale(0)) * 0.6 : 30;

            bufferGroup.append('rect')
              .attr('x', x1)
              .attr('y', cy - bandHeight / 2)
              .attr('width', Math.max(0, x2 - x1))
              .attr('height', bandHeight)
              .attr('rx', 3)
              .attr('fill', `url(#buffer-grad-${seg.health})`)
              .attr('stroke', BUFFER_HEALTH_COLORS[seg.health])
              .attr('stroke-opacity', 0.3)
              .attr('stroke-width', 0.5);
          });
        });
      }

      // ── Comparison overlay (simulation) ───────────────────────

      if (comparisonWagons) {
        const compGroup = chartArea.append('g').attr('class', 'comparison');

        comparisonWagons.forEach((wagon) => {
          const lineGen = d3
            .line<{ x: number; y: number }>()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y))
            .curve(d3.curveMonotoneY);

          const points = wagon.segments.map((seg) => ({
            x: (seg.x_start + seg.x_end) / 2,
            y: seg.y,
          }));

          compGroup.append('path')
            .datum(points)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', wagon.color)
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round')
            .attr('stroke-dasharray', '8,4')
            .attr('opacity', 0.35);
        });
      }

      // ── Draw flowlines (trade wagons) ─────────────────────────

      const tooltip = d3.select(tooltipRef.current);

      wagons.forEach((wagon) => {
        const lineGen = d3
          .line<{ x: number; y: number }>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .curve(d3.curveMonotoneY);

        const points = wagon.segments.map((seg) => ({
          x: (seg.x_start + seg.x_end) / 2,
          y: seg.y,
        }));

        const isSelected = selectedSegment?.tradeName === wagon.trade_name;
        const hasSelection = selectedSegment !== null;
        const lineOpacity = hasSelection ? (isSelected ? 1 : 0.2) : 0.9;

        // Critical path glow line (drawn behind main line)
        if (showCriticalPath && wagon.segments.some((s) => s.isCriticalPath)) {
          chartArea.append('path')
            .datum(points)
            .attr('d', lineGen)
            .attr('fill', 'none')
            .attr('stroke', wagon.color)
            .attr('stroke-width', mini ? 4 : 7)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('opacity', lineOpacity * 0.3)
            .attr('filter', 'url(#critical-glow)');
        }

        // Main flowline path
        chartArea.append('path')
          .datum(points)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', wagon.color)
          .attr('stroke-width', mini ? 2.5 : (showCriticalPath && wagon.segments.some((s) => s.isCriticalPath) ? 3.5 : 3))
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('opacity', lineOpacity);

        // ── Segment dots + progress + interactivity ─────────────

        if (!mini) {
          wagon.segments.forEach((seg) => {
            const cx = xScale((seg.x_start + seg.x_end) / 2);
            const cy = yScale(seg.y);
            const segSelected =
              isSelected &&
              selectedSegment?.segment.zone_index === seg.zone_index;
            const dotOpacity = hasSelection ? (isSelected ? 1 : 0.2) : 1;

            // Progress arc (ring showing percent complete)
            if (showProgress && seg.percentComplete > 0 && seg.percentComplete < 100) {
              const outerR = 9;
              const arcGen = d3.arc()
                .innerRadius(6.5)
                .outerRadius(outerR)
                .startAngle(0)
                .endAngle((seg.percentComplete / 100) * Math.PI * 2);

              chartArea.append('path')
                .attr('d', arcGen({ innerRadius: 6.5, outerRadius: outerR, startAngle: 0, endAngle: (seg.percentComplete / 100) * Math.PI * 2 }) as string)
                .attr('transform', `translate(${cx},${cy})`)
                .attr('fill', wagon.color)
                .attr('opacity', dotOpacity * 0.5);
            }

            // Dot base
            const radius = seg.status === 'in_progress' ? 6 : segSelected ? 7 : 4.5;

            // Status ring for delayed
            if (seg.status === 'delayed') {
              chartArea.append('circle')
                .attr('cx', cx).attr('cy', cy)
                .attr('r', 8)
                .attr('fill', 'none')
                .attr('stroke', 'var(--color-danger)')
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', '3,2')
                .attr('opacity', dotOpacity * 0.7);
            }

            // Main dot
            chartArea.append('circle')
              .attr('cx', cx).attr('cy', cy)
              .attr('r', radius)
              .attr('fill', seg.status === 'completed' ? wagon.color : bgCard)
              .attr('stroke', wagon.color)
              .attr('stroke-width', segSelected ? 3 : 2)
              .attr('opacity', dotOpacity)
              .attr('class', 'segment-dot')
              .style('cursor', 'pointer')
              .on('mouseenter', function (event: MouseEvent) {
                d3.select(this).transition().duration(150)
                  .attr('r', radius + 3)
                  .attr('stroke-width', 3);

                const zoneName = zones[seg.zone_index]?.name ?? `Zone ${seg.zone_index}`;
                tooltip
                  .style('display', 'block')
                  .style('left', `${event.offsetX + 16}px`)
                  .style('top', `${event.offsetY - 10}px`)
                  .html(`
                    <div style="font-family: var(--font-body); font-size: 12px; min-width: 180px;">
                      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${wagon.color};"></div>
                        <strong style="color: ${textMain};">${wagon.trade_name}</strong>
                      </div>
                      <div style="color: ${textColor}; font-size: 11px; line-height: 1.7;">
                        <div><span style="opacity: 0.6;">Zone:</span> ${zoneName}</div>
                        <div><span style="opacity: 0.6;">Period:</span> T${seg.x_start} — T${seg.x_end}</div>
                        <div><span style="opacity: 0.6;">Planned:</span> ${seg.plannedStart} to ${seg.plannedEnd}</div>
                        ${seg.actualStart ? `<div><span style="opacity: 0.6;">Actual Start:</span> ${seg.actualStart}</div>` : ''}
                        ${seg.actualEnd ? `<div><span style="opacity: 0.6;">Actual End:</span> ${seg.actualEnd}</div>` : ''}
                        <div><span style="opacity: 0.6;">Status:</span> <span style="color: ${STATUS_COLORS[seg.status]};">${STATUS_LABELS[seg.status]}</span></div>
                        <div><span style="opacity: 0.6;">Progress:</span> ${seg.percentComplete}%</div>
                        ${seg.crew ? `<div><span style="opacity: 0.6;">Crew:</span> ${seg.crew}</div>` : ''}
                        ${seg.isCriticalPath ? '<div style="color: var(--color-warning); font-weight: 600; margin-top: 2px;">Critical Path</div>' : ''}
                      </div>
                    </div>
                  `);
              })
              .on('mousemove', function (event: MouseEvent) {
                tooltip
                  .style('left', `${event.offsetX + 16}px`)
                  .style('top', `${event.offsetY - 10}px`);
              })
              .on('mouseleave', function () {
                d3.select(this).transition().duration(150)
                  .attr('r', radius)
                  .attr('stroke-width', segSelected ? 3 : 2);
                tooltip.style('display', 'none');
              })
              .on('click', function () {
                const zoneName = zones[seg.zone_index]?.name ?? `Zone ${seg.zone_index}`;
                if (
                  selectedSegment?.tradeName === wagon.trade_name &&
                  selectedSegment?.segment.zone_index === seg.zone_index
                ) {
                  onSegmentSelect?.(null);
                } else {
                  onSegmentSelect?.({
                    tradeName: wagon.trade_name,
                    tradeColor: wagon.color,
                    segment: seg,
                    zoneName,
                  });
                }
              });

            // Animated pulse for in-progress
            if (seg.status === 'in_progress') {
              chartArea.append('circle')
                .attr('cx', cx).attr('cy', cy)
                .attr('r', 6)
                .attr('fill', 'none')
                .attr('stroke', wagon.color)
                .attr('stroke-width', 1.5)
                .attr('opacity', dotOpacity * 0.4)
                .append('animate')
                .attr('attributeName', 'r')
                .attr('from', '6')
                .attr('to', '14')
                .attr('dur', '1.5s')
                .attr('repeatCount', 'indefinite');

              chartArea.append('circle')
                .attr('cx', cx).attr('cy', cy)
                .attr('r', 6)
                .attr('fill', 'none')
                .attr('stroke', wagon.color)
                .attr('stroke-width', 1)
                .attr('opacity', dotOpacity * 0.2)
                .append('animate')
                .attr('attributeName', 'opacity')
                .attr('from', '0.4')
                .attr('to', '0')
                .attr('dur', '1.5s')
                .attr('repeatCount', 'indefinite');
            }
          });
        }

        // ── Trade label at end of line ──────────────────────────

        if (!mini) {
          const lastSeg = wagon.segments[wagon.segments.length - 1];
          const labelX = xScale((lastSeg.x_start + lastSeg.x_end) / 2) + 14;
          const labelY = yScale(lastSeg.y);

          g.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('dominant-baseline', 'middle')
            .attr('fill', wagon.color)
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('font-family', 'Inter, sans-serif')
            .attr('opacity', hasSelection ? (isSelected ? 1 : 0.25) : 1)
            .text(wagon.trade_name);
        }
      });

      // ── Today line with animation ─────────────────────────────

      const todayGroup = chartArea.append('g').attr('class', 'today-line');

      todayGroup.append('line')
        .attr('x1', xScale(todayX)).attr('x2', xScale(todayX))
        .attr('y1', mini ? -5 : -20)
        .attr('y2', innerHeight + (mini ? 5 : 15))
        .attr('stroke', 'url(#today-gradient)')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3');

      // Animated dash offset for "marching ants"
      todayGroup.select('line')
        .append('animate')
        .attr('attributeName', 'stroke-dashoffset')
        .attr('from', '0')
        .attr('to', '18')
        .attr('dur', '1.2s')
        .attr('repeatCount', 'indefinite');

      if (!mini) {
        // Today label badge
        const todayLabelX = xScale(todayX);
        const badgeW = 52;
        const badgeH = 18;

        todayGroup.append('rect')
          .attr('x', todayLabelX - badgeW / 2)
          .attr('y', -32)
          .attr('width', badgeW)
          .attr('height', badgeH)
          .attr('rx', 4)
          .attr('fill', 'var(--color-danger)')
          .attr('opacity', 0.9);

        todayGroup.append('text')
          .attr('x', todayLabelX)
          .attr('y', -32 + badgeH / 2 + 1)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#FFFFFF')
          .attr('font-size', '9px')
          .attr('font-weight', '700')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text('TODAY');

        // Small triangle pointer
        todayGroup.append('path')
          .attr('d', `M ${todayLabelX - 4} ${-32 + badgeH} L ${todayLabelX} ${-32 + badgeH + 5} L ${todayLabelX + 4} ${-32 + badgeH}`)
          .attr('fill', 'var(--color-danger)')
          .attr('opacity', 0.9);
      }

      // ── Legend ────────────────────────────────────────────────

      if (!mini) {
        const legendGroup = g.append('g')
          .attr('class', 'legend')
          .attr('transform', `translate(0, ${innerHeight + 58})`);

        const statuses = ['completed', 'in_progress', 'planned', 'delayed'];
        let legendX = 0;

        statuses.forEach((status) => {
          const itemG = legendGroup.append('g')
            .attr('transform', `translate(${legendX}, 0)`);

          itemG.append('circle')
            .attr('cx', 5).attr('cy', 0)
            .attr('r', 4)
            .attr('fill', status === 'completed' ? STATUS_COLORS[status] : bgCard)
            .attr('stroke', STATUS_COLORS[status])
            .attr('stroke-width', 1.5);

          itemG.append('text')
            .attr('x', 14).attr('y', 0)
            .attr('dominant-baseline', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '9px')
            .attr('font-family', 'Inter, sans-serif')
            .text(STATUS_LABELS[status]);

          legendX += STATUS_LABELS[status].length * 6 + 28;
        });

        // Critical path legend item
        if (showCriticalPath) {
          const cpG = legendGroup.append('g')
            .attr('transform', `translate(${legendX}, 0)`);

          cpG.append('line')
            .attr('x1', 0).attr('x2', 16).attr('y1', 0).attr('y2', 0)
            .attr('stroke', 'var(--color-warning)')
            .attr('stroke-width', 3)
            .attr('filter', 'url(#critical-glow)');

          cpG.append('text')
            .attr('x', 22).attr('y', 0)
            .attr('dominant-baseline', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '9px')
            .attr('font-family', 'Inter, sans-serif')
            .text('Critical Path');

          legendX += 100;
        }

        // Buffer legend item
        if (showBuffers && buffers.length > 0) {
          const bG = legendGroup.append('g')
            .attr('transform', `translate(${legendX}, 0)`);

          bG.append('rect')
            .attr('x', 0).attr('y', -5)
            .attr('width', 14).attr('height', 10)
            .attr('rx', 2)
            .attr('fill', 'var(--color-success)')
            .attr('fill-opacity', 0.25)
            .attr('stroke', 'var(--color-success)')
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', 0.5);

          bG.append('text')
            .attr('x', 20).attr('y', 0)
            .attr('dominant-baseline', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '9px')
            .attr('font-family', 'Inter, sans-serif')
            .text('Buffer');
        }
      }

      // ── Zoom + Pan ────────────────────────────────────────────

      if (!mini) {
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.5, 5])
          .translateExtent([
            [-margin.left, -margin.top],
            [width + margin.right, height + margin.bottom],
          ])
          .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
            rootG.attr('transform', event.transform.toString());
          });

        svg.call(zoom);
        zoomRef.current = zoom;

        // Double-click to reset zoom
        svg.on('dblclick.zoom', () => {
          svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
        });
      }

    }, [
      wagons, zones, todayX, totalPeriods, height, mini,
      showCriticalPath, showBuffers, showProgress,
      buffers, comparisonWagons, selectedSegment, onSegmentSelect,
    ]);

    // ── Resize observer ─────────────────────────────────────────

    useEffect(() => {
      if (!containerRef.current || mini) return;

      const observer = new ResizeObserver(() => {
        // Trigger re-render by dispatching a resize to force useEffect
        window.dispatchEvent(new Event('flowline-resize'));
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, [mini]);

    // ── Render ──────────────────────────────────────────────────

    return (
      <div ref={containerRef} className="w-full relative overflow-x-auto" style={{ minHeight: mini ? height : undefined, WebkitOverflowScrolling: 'touch' }}>
        <svg ref={svgRef} style={{ display: 'block', minWidth: mini ? undefined : 600 }} />
        {/* Tooltip portal */}
        <div
          ref={tooltipRef}
          className="absolute z-50 pointer-events-none rounded-lg border px-3 py-2.5 shadow-xl"
          style={{
            display: 'none',
            background: 'var(--color-bg-card)',
            borderColor: 'var(--color-border)',
            backdropFilter: 'blur(8px)',
            maxWidth: 260,
          }}
        />
      </div>
    );
  }
);

export default FlowlineChart;
