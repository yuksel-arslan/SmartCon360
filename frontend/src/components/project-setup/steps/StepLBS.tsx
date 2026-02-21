'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, MapPin, Building2, Layers, Grid3x3, Loader2, Check, Plus, Trash2 } from 'lucide-react';
import { getTemplate, generateLbsFromConfig, type LocationTemplate } from '@/lib/core/project-templates';
import type { SetupStepProps } from '../types';
import { BUILDING_TYPES } from '../types';

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

interface LocationNode {
  id: string;
  name: string;
  locationType: string;
  code: string;
  parentId: string | null;
  areaSqm: number | null;
  depth: number;
  children: LocationNode[];
}

function LocationTreeNode({
  location,
  depth,
  defaultExpanded,
}: {
  location: LocationNode;
  depth: number;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = location.children && location.children.length > 0;
  const Icon = typeIcons[location.locationType] || MapPin;
  const color = typeColors[location.locationType] || 'var(--color-text-muted)';

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
          {location.name}
        </span>
        <span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>
          {location.locationType}
        </span>
        <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {location.code}
        </span>
        {location.areaSqm && (
          <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {location.areaSqm.toLocaleString()} m&sup2;
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {location.children.map((child) => (
            <LocationTreeNode
              key={child.id}
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

function TemplateLocationNode({
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
          expanded ? <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
            : <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
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
        {location.type === 'zone' && location.phase && (
          <span
            className="text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded-full"
            style={{
              background: location.phase === 'substructure' ? 'rgba(146,64,14,0.12)'
                : location.phase === 'structural' ? 'rgba(99,102,241,0.12)'
                : 'rgba(16,185,129,0.12)',
              color: location.phase === 'substructure' ? '#92400E'
                : location.phase === 'structural' ? '#6366F1'
                : '#10B981',
            }}
          >
            {location.phase === 'substructure' ? 'Substructure' : location.phase === 'structural' ? 'Shell' : 'Fit-Out'}
          </span>
        )}
        {location.areaSqm && (
          <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {location.areaSqm.toLocaleString()} m&sup2;
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {location.children!.map((child, i) => (
            <TemplateLocationNode
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

function countTemplateLocations(locs: LocationTemplate[]): { zones: number; substructureZones: number; structuralZones: number; finishingZones: number; floors: number; total: number } {
  let zones = 0, substructureZones = 0, structuralZones = 0, finishingZones = 0, floors = 0, total = 0;

  function walk(items: LocationTemplate[]) {
    for (const loc of items) {
      const count = loc.repeat && loc.repeat > 1 ? loc.repeat : 1;
      total += count;
      if (loc.type === 'zone') {
        zones += count;
        if (loc.phase === 'substructure') substructureZones += count;
        else if (loc.phase === 'structural') structuralZones += count;
        else finishingZones += count;
      }
      if (loc.type === 'floor') floors += count;
      if (loc.children) {
        for (let i = 0; i < count; i++) walk(loc.children);
      }
    }
  }

  walk(locs);
  return { zones, substructureZones, structuralZones, finishingZones, floors, total };
}

function flattenLocations(
  templates: LocationTemplate[],
  parentName?: string,
): { name: string; locationType: string; parentName?: string; areaSqm?: number; phase?: string; sortOrder: number }[] {
  const result: ReturnType<typeof flattenLocations> = [];
  let sortOrder = 0;

  for (const loc of templates) {
    const repeat = loc.repeat && loc.repeat > 1 ? loc.repeat : 1;

    for (let i = 0; i < repeat; i++) {
      const name = repeat > 1 && loc.repeatLabel
        ? loc.repeatLabel.replace('{n}', String(i + 1))
        : repeat > 1
          ? `${loc.name} ${i + 1}`
          : loc.name;

      result.push({
        name,
        locationType: loc.type,
        parentName,
        areaSqm: loc.areaSqm,
        phase: loc.phase,
        sortOrder: sortOrder++,
      });

      if (loc.children) {
        result.push(...flattenLocations(loc.children, name));
      }
    }
  }

  return result;
}

export default function StepLBS({ projectId, state, onStateChange, authFetch }: SetupStepProps) {
  const [existingLocations, setExistingLocations] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');

  // Use dynamic LBS generation from floor configuration if available,
  // otherwise fall back to static project type template
  const hasDynamicConfig = !!(state.buildingType && (state.floorCount > 0 || state.buildingType === 'infrastructure'));
  const dynamicLocations = hasDynamicConfig
    ? generateLbsFromConfig(state.buildingType, state.floorCount, state.basementCount, state.zonesPerFloor, state.structuralZonesPerFloor || 1, state.substructureZonesCount || 3)
    : [];
  const template = getTemplate(state.buildingType || state.projectType);
  const templateLocations = hasDynamicConfig ? dynamicLocations : (template?.locations || []);
  const templateCounts = countTemplateLocations(templateLocations);

  const buildingTypeLabel = BUILDING_TYPES.find((b) => b.value === state.buildingType)?.label || state.buildingType;

  const fetchLocations = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/locations`);
      if (res.ok) {
        const json = await res.json();
        const locs = json.data || [];
        setExistingLocations(locs);
        if (locs.length > 0) {
          setApplied(true);
          const zoneCount = countExistingZones(locs);
          onStateChange({ locationCount: countAllNodes(locs), zoneCount, lbsConfigured: true });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId, authFetch]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleApplyTemplate = async () => {
    setApplying(true);
    setError('');

    try {
      const flatLocs = flattenLocations(templateLocations);
      const res = await authFetch(`/api/v1/projects/${projectId}/locations/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: flatLocs }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to create locations (${res.status})`);
      }

      setApplied(true);
      onStateChange({ locationCount: templateCounts.total, zoneCount: templateCounts.zones, lbsConfigured: true });
      await fetchLocations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Location Breakdown Structure (LBS)
      </h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Define the project&apos;s spatial hierarchy. Locations are the zones through which trades will flow in TaktFlow.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      ) : applied && existingLocations.length > 0 ? (
        <>
          {/* Existing locations */}
          <div className="flex gap-3 mb-4">
            {[
              { label: 'Total Locations', value: countAllNodes(existingLocations), color: 'var(--color-accent)' },
              { label: 'Zones', value: countExistingZones(existingLocations), color: 'var(--color-success)' },
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

          <div
            className="rounded-xl border p-3 max-h-[360px] overflow-auto"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            {existingLocations.map((loc) => (
              <LocationTreeNode key={loc.id} location={loc} depth={0} defaultExpanded />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
            <Check size={14} /> LBS configured
          </div>
        </>
      ) : (
        <>
          {/* Template preview */}
          {templateLocations.length > 0 ? (
            <>
              <div className="flex gap-3 mb-4">
                {[
                  { label: 'Floors', value: templateCounts.floors, color: 'var(--color-cyan)' },
                  { label: 'Substructure', value: templateCounts.substructureZones, color: '#92400E' },
                  { label: 'Shell Zones', value: templateCounts.structuralZones, color: '#6366F1' },
                  { label: 'Fit-Out Zones', value: templateCounts.finishingZones, color: '#10B981' },
                  { label: 'Total', value: templateCounts.total, color: 'var(--color-accent)' },
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

              <div className="mb-2 text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                Template Preview ({buildingTypeLabel || template?.label || 'Custom'})
              </div>
              <div
                className="rounded-xl border p-3 max-h-[280px] overflow-auto mb-4"
                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              >
                {templateLocations.map((loc, i) => (
                  <TemplateLocationNode key={`${loc.name}-${i}`} location={loc} depth={0} defaultExpanded />
                ))}
              </div>

              <button
                onClick={handleApplyTemplate}
                disabled={applying}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
              >
                {applying ? (
                  <><Loader2 size={14} className="animate-spin" /> Creating Locations...</>
                ) : (
                  <><Plus size={14} /> Apply Template to Project</>
                )}
              </button>
            </>
          ) : (
            <div
              className="rounded-xl border p-6 text-center"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <MapPin size={24} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                No LBS template available for this project type. You can add locations manually from the project settings.
              </p>
            </div>
          )}
        </>
      )}

      {error && (
        <div
          className="mt-3 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function countAllNodes(nodes: LocationNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1;
    if (n.children) count += countAllNodes(n.children);
  }
  return count;
}

function countExistingZones(nodes: LocationNode[]): number {
  let count = 0;
  for (const n of nodes) {
    if (n.locationType === 'zone') count += 1;
    if (n.children) count += countExistingZones(n.children);
  }
  return count;
}
