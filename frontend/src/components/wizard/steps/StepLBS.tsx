'use client';

import { ChevronRight, ChevronDown, MapPin, Building2, Layers, Grid3x3 } from 'lucide-react';
import { useState } from 'react';
import type { LocationTemplate } from '@/lib/core/project-templates';
import type { StepProps } from '../types';

const typeIcons: Record<string, typeof MapPin> = {
  site: MapPin,
  building: Building2,
  floor: Layers,
  zone: Grid3x3,
  room: Grid3x3,
  area: MapPin,
};

const typeColors: Record<string, string> = {
  site: 'var(--color-purple)',
  building: 'var(--color-accent)',
  floor: 'var(--color-cyan)',
  zone: 'var(--color-success)',
  room: 'var(--color-warning)',
  area: 'var(--color-warning)',
};

function LocationNode({
  location,
  depth,
  defaultExpanded,
}: {
  location: LocationTemplate;
  depth: number;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = location.children && location.children.length > 0;
  const Icon = typeIcons[location.type] || MapPin;
  const color = typeColors[location.type] || 'var(--color-text-muted)';

  const label = location.repeat && location.repeat > 1
    ? `${location.name} (x${location.repeat})`
    : location.name;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        style={{ paddingLeft: depth * 20 + 8 }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
          ) : (
            <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
          )
        ) : (
          <div className="w-3.5" />
        )}
        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={12} style={{ color }} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>
          {label}
        </span>
        <span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>
          {location.type}
        </span>
        {location.areaSqm && (
          <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {location.areaSqm.toLocaleString()} m²
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {location.children!.map((child, i) => (
            <LocationNode
              key={`${child.name}-${i}`}
              location={child}
              depth={depth + 1}
              defaultExpanded={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countLocations(locs: LocationTemplate[]): { zones: number; floors: number; total: number } {
  let zones = 0;
  let floors = 0;
  let total = 0;

  function walk(items: LocationTemplate[]) {
    for (const loc of items) {
      const count = loc.repeat && loc.repeat > 1 ? loc.repeat : 1;
      total += count;
      if (loc.type === 'zone') zones += count;
      if (loc.type === 'floor') floors += count;
      if (loc.children) {
        for (let i = 0; i < count; i++) {
          walk(loc.children);
        }
      }
    }
  }

  walk(locs);
  return { zones, floors, total };
}

export default function StepLBS({ data }: StepProps) {
  const counts = countLocations(data.locations);

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Location Breakdown Structure
      </h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Generated from your project template. Review the LBS hierarchy below.
      </p>

      {/* Summary badges */}
      <div className="flex gap-3 mb-4">
        {[
          { label: 'Floors', value: counts.floors, color: 'var(--color-cyan)' },
          { label: 'Zones', value: counts.zones, color: 'var(--color-success)' },
          { label: 'Total Locations', value: counts.total, color: 'var(--color-accent)' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg px-3 py-2 border"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)', color: s.color }}>
              {s.value}
            </div>
            <div className="text-[10px] uppercase font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tree */}
      <div
        className="rounded-xl border p-3 max-h-[360px] overflow-auto"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        {data.locations.length > 0 ? (
          data.locations.map((loc, i) => (
            <LocationNode key={`${loc.name}-${i}`} location={loc} depth={0} defaultExpanded />
          ))
        ) : (
          <p className="text-[12px] py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            Select a project type first to generate locations.
          </p>
        )}
      </div>
    </div>
  );
}
