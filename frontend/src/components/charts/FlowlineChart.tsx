'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { FlowlineWagon } from '@/lib/mockData';

interface FlowlineChartProps {
  wagons: FlowlineWagon[];
  zones: { name: string }[];
  todayX: number;
  totalPeriods: number;
  height?: number;
  mini?: boolean;
}

export default function FlowlineChart({
  wagons,
  zones,
  todayX,
  totalPeriods,
  height = 400,
  mini = false,
}: FlowlineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 800;

    const margin = mini
      ? { top: 20, right: 20, bottom: 30, left: 20 }
      : { top: 30, right: 40, bottom: 50, left: 140 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain([0, totalPeriods]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, zones.length - 1]).range([0, innerHeight]);

    // Get CSS variable values
    const rootStyle = getComputedStyle(document.documentElement);
    const textColor = rootStyle.getPropertyValue('--color-text-muted').trim() || '#64748B';
    const borderColor = rootStyle.getPropertyValue('--color-border').trim() || '#1E293B';

    // Grid lines
    if (!mini) {
      // Horizontal grid
      zones.forEach((_, i) => {
        g.append('line')
          .attr('x1', 0).attr('x2', innerWidth)
          .attr('y1', yScale(i)).attr('y2', yScale(i))
          .attr('stroke', borderColor).attr('stroke-opacity', 0.5)
          .attr('stroke-dasharray', '3,3');
      });

      // Vertical grid (period lines)
      for (let p = 0; p <= totalPeriods; p++) {
        g.append('line')
          .attr('x1', xScale(p)).attr('x2', xScale(p))
          .attr('y1', 0).attr('y2', innerHeight)
          .attr('stroke', borderColor).attr('stroke-opacity', 0.3)
          .attr('stroke-dasharray', '2,4');
      }
    }

    // Y axis — zone labels
    if (!mini) {
      zones.forEach((zone, i) => {
        g.append('text')
          .attr('x', -10)
          .attr('y', yScale(i))
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('fill', textColor)
          .attr('font-size', '11px')
          .attr('font-family', 'Inter, sans-serif')
          .text(zone.name);
      });
    }

    // X axis — period labels
    if (!mini) {
      for (let p = 0; p <= totalPeriods; p += 2) {
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
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .attr('fill', textColor)
        .attr('font-size', '11px')
        .text('Takt Periods');
    }

    // Draw flowlines (trade wagons)
    wagons.forEach((wagon) => {
      const lineGen = d3
        .line<{ x: number; y: number }>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveMonotoneY);

      // Create path points — start of each segment and end of last
      const points = wagon.segments.map((seg) => ({
        x: (seg.x_start + seg.x_end) / 2,
        y: seg.y,
      }));

      // Draw line
      g.append('path')
        .datum(points)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', wagon.color)
        .attr('stroke-width', mini ? 2.5 : 3)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', 0.9);

      // Draw segment dots
      if (!mini) {
        wagon.segments.forEach((seg) => {
          const cx = xScale((seg.x_start + seg.x_end) / 2);
          const cy = yScale(seg.y);
          const radius = seg.status === 'in_progress' ? 5 : 4;

          g.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', radius)
            .attr('fill', seg.status === 'completed' ? wagon.color : 'var(--color-bg-card)')
            .attr('stroke', wagon.color)
            .attr('stroke-width', 2);

          // In-progress pulse
          if (seg.status === 'in_progress') {
            g.append('circle')
              .attr('cx', cx)
              .attr('cy', cy)
              .attr('r', 5)
              .attr('fill', 'none')
              .attr('stroke', wagon.color)
              .attr('stroke-width', 1.5)
              .attr('opacity', 0.4)
              .append('animate')
              .attr('attributeName', 'r')
              .attr('from', '5')
              .attr('to', '12')
              .attr('dur', '1.5s')
              .attr('repeatCount', 'indefinite');
          }
        });
      }

      // Trade label at end
      if (!mini) {
        const lastSeg = wagon.segments[wagon.segments.length - 1];
        g.append('text')
          .attr('x', xScale((lastSeg.x_start + lastSeg.x_end) / 2) + 12)
          .attr('y', yScale(lastSeg.y))
          .attr('dominant-baseline', 'middle')
          .attr('fill', wagon.color)
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('font-family', 'Inter, sans-serif')
          .text(wagon.trade_name);
      }
    });

    // Today line
    g.append('line')
      .attr('x1', xScale(todayX))
      .attr('x2', xScale(todayX))
      .attr('y1', mini ? -5 : -15)
      .attr('y2', innerHeight + (mini ? 5 : 10))
      .attr('stroke', '#EF4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3');

    if (!mini) {
      g.append('text')
        .attr('x', xScale(todayX))
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#EF4444')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text('TODAY');
    }
  }, [wagons, zones, todayX, totalPeriods, height, mini]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
