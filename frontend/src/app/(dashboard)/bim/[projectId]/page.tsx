'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Box, Layers, MapPin, DollarSign,
  BarChart3, GitBranch, Clock, FileText, ChevronRight, ChevronDown,
  Building2, Grid3x3, Search, Download,
} from 'lucide-react';
import { ModulePageHeader } from '@/components/modules';
import { useBIMStore } from '@/stores/bimStore';
import type {
  BIMProcessResult, BIMElement, BIMWbsNode, BIMLbsNode, BIMZone, BIMCostItem,
} from '@/stores/bimStore';

// ── Shared helpers ──────────────────────────────────────

type BIMTab = 'overview' | 'elements' | 'wbs' | 'lbs' | 'zones' | 'costs';

const tabs: { id: BIMTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'elements', label: 'Elements', icon: Box },
  { id: 'wbs', label: 'WBS', icon: GitBranch },
  { id: 'lbs', label: 'LBS', icon: MapPin },
  { id: 'zones', label: 'Takt Zones', icon: Grid3x3 },
  { id: 'costs', label: 'Cost Items', icon: DollarSign },
];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = '#0EA5E9' }: { label: string; value: string | number; icon: typeof Box; color?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </span>
          <div className="text-[28px] font-bold leading-none tracking-[-0.03em]" style={{ color }}>
            {value}
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
          <Icon size={16} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    completed: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    processing: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    error: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    uploaded: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
  };
  const c = map[status] || { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize" style={{ background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
    />
  );
}

// ── Overview Tab ────────────────────────────────────────

function OverviewTab({ data }: { data: BIMProcessResult }) {
  const s = data.summary;
  const info = data.project_info;

  const typeEntries = Object.entries(s.elements_by_type).sort((a, b) => b[1] - a[1]);
  const storeyEntries = Object.entries(s.elements_by_storey).sort((a, b) => b[1] - a[1]);
  const maxTypeCount = Math.max(...typeEntries.map(([, v]) => v), 1);
  const maxStoreyCount = Math.max(...storeyEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Elements" value={s.total_elements} icon={Box} color="#0EA5E9" />
        <StatCard label="Classified" value={`${s.classification_coverage_pct.toFixed(0)}%`} icon={Layers} color="#8B5CF6" />
        <StatCard label="With Quantities" value={`${s.quantity_coverage_pct.toFixed(0)}%`} icon={BarChart3} color="#10B981" />
        <StatCard label="Takt Zones" value={s.total_zones} icon={Grid3x3} color="#F59E0B" />
        <StatCard label="Cost Items" value={s.total_cost_items} icon={DollarSign} color="#EC4899" />
        <StatCard label="Relationships" value={s.total_relationships} icon={GitBranch} color="#F97316" />
        <StatCard label="Storeys" value={s.storeys.length} icon={Building2} color="#6366F1" />
        <StatCard label="Processing Time" value={`${data.processing_time_seconds.toFixed(1)}s`} icon={Clock} color="var(--color-text-muted)" />
      </div>

      {/* Project Info */}
      {(info.name || info.author || info.organization) && (
        <Card>
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Project Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Name', value: info.name },
              { label: 'Author', value: info.author },
              { label: 'Organization', value: info.organization },
              { label: 'Phase', value: info.phase },
              { label: 'Schema', value: info.schema_version },
              { label: 'Application', value: info.application },
            ].filter((f) => f.value).map((f) => (
              <div key={f.label}>
                <span className="text-[10px] uppercase tracking-[0.06em] font-medium" style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
                <p className="text-[12px] font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>{f.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Elements by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Elements by Type</h3>
          <div className="space-y-2">
            {typeEntries.slice(0, 12).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-[10px] w-32 truncate font-medium" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {type.replace('Ifc', '')}
                </span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-input)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(count / maxTypeCount) * 100}%`, background: '#0EA5E9' }}
                  />
                </div>
                <span className="text-[10px] tabular-nums w-8 text-right font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Elements by Storey</h3>
          <div className="space-y-2">
            {storeyEntries.map(([storey, count]) => (
              <div key={storey} className="flex items-center gap-2">
                <span className="text-[10px] w-32 truncate font-medium" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {storey}
                </span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-input)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(count / maxStoreyCount) * 100}%`, background: '#8B5CF6' }}
                  />
                </div>
                <span className="text-[10px] tabular-nums w-8 text-right font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Elements Tab ────────────────────────────────────────

function ElementsTab({ data }: { data: BIMProcessResult }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const types = Array.from(new Set(data.elements.map((e) => e.ifc_class))).sort();
  const filtered = data.elements.filter((e) => {
    if (typeFilter !== 'all' && e.ifc_class !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (e.name || '').toLowerCase().includes(q) ||
        e.global_id.toLowerCase().includes(q) ||
        e.ifc_class.toLowerCase().includes(q) ||
        (e.storey || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
          Building Elements ({filtered.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <Input
              placeholder="Search elements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 w-44"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2 py-2 rounded-lg border outline-none"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
          >
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t.replace('Ifc', '')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--color-bg-secondary)' }}>
              {['Type', 'Name', 'Storey', 'Material', 'System', 'Global ID'].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((el) => (
              <tr
                key={el.element_id}
                className="border-t transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td className="px-3 py-2">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9', fontFamily: 'var(--font-mono)' }}
                  >
                    {el.ifc_class.replace('Ifc', '')}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text)' }}>
                  {el.name || '--'}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {el.storey || '--'}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {el.material || '--'}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
                    style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
                  >
                    {el.system}
                  </span>
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                  {el.global_id.slice(0, 12)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <p className="text-[10px] text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
            Showing first 100 of {filtered.length} elements
          </p>
        )}
      </div>
    </Card>
  );
}

// ── WBS Tab ─────────────────────────────────────────────

function WBSTreeNode({ node, depth = 0 }: { node: BIMWbsNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setOpen(!open)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {hasChildren ? (
          open ? <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <div className="w-3" />
        )}
        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}>
          {node.code}
        </span>
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>{node.name}</span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {node.element_count} el.
        </span>
      </div>
      {open && hasChildren && node.children!.map((child) => (
        <WBSTreeNode key={child.code} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function WBSTab({ data }: { data: BIMProcessResult }) {
  return (
    <Card>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
        Work Breakdown Structure
      </h3>
      {data.wbs_hierarchy.length > 0 ? (
        <div className="space-y-0.5">
          {data.wbs_hierarchy.map((node) => (
            <WBSTreeNode key={node.code} node={node} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No WBS data available
        </p>
      )}
    </Card>
  );
}

// ── LBS Tab ─────────────────────────────────────────────

function LBSTreeNode({ node, depth = 0 }: { node: BIMLbsNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const typeColor: Record<string, string> = {
    site: '#10B981',
    building: '#6366F1',
    storey: '#F59E0B',
    space: '#EC4899',
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setOpen(!open)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {hasChildren ? (
          open ? <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />
        ) : (
          <div className="w-3" />
        )}
        <span
          className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded"
          style={{ background: `${typeColor[node.type] || '#0EA5E9'}15`, color: typeColor[node.type] || '#0EA5E9' }}
        >
          {node.code}
        </span>
        <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>{node.name}</span>
        <span
          className="text-[9px] uppercase font-medium px-1.5 py-0.5 rounded ml-1"
          style={{ background: `${typeColor[node.type] || '#999'}10`, color: typeColor[node.type] || 'var(--color-text-muted)' }}
        >
          {node.type}
        </span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {node.element_count} el.
        </span>
      </div>
      {open && hasChildren && node.children!.map((child) => (
        <LBSTreeNode key={child.code} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function LBSTab({ data }: { data: BIMProcessResult }) {
  return (
    <Card>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
        Location Breakdown Structure
      </h3>
      {data.lbs_hierarchy ? (
        <LBSTreeNode node={data.lbs_hierarchy} />
      ) : (
        <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No LBS data available
        </p>
      )}
    </Card>
  );
}

// ── Zones Tab ───────────────────────────────────────────

function ZonesTab({ data }: { data: BIMProcessResult }) {
  return (
    <Card>
      <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
        Takt Zones ({data.zones.length})
      </h3>
      {data.zones.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)' }}>
                {['Zone', 'Type', 'Storey', 'Elements', 'Area (m\u00B2)', 'Volume (m\u00B3)', 'Work Density', 'Est. Takt Days', 'Seq.'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.zones.map((z) => (
                <tr
                  key={z.zone_id}
                  className="border-t transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text)' }}>{z.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
                      style={{
                        background: z.zone_type === 'storey' ? 'rgba(245,158,11,0.1)' : z.zone_type === 'space' ? 'rgba(236,72,153,0.1)' : 'rgba(14,165,233,0.1)',
                        color: z.zone_type === 'storey' ? '#F59E0B' : z.zone_type === 'space' ? '#EC4899' : '#0EA5E9',
                      }}
                    >
                      {z.zone_type}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{z.storey || '--'}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{z.element_count}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{z.total_area.toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{z.total_volume.toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{z.work_density.toFixed(3)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#F59E0B', fontFamily: 'var(--font-mono)' }}>{z.estimated_takt_days.toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{z.sequence_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No zones generated
        </p>
      )}
    </Card>
  );
}

// ── Costs Tab ───────────────────────────────────────────

function CostsTab({ data }: { data: BIMProcessResult }) {
  const [search, setSearch] = useState('');

  const filtered = data.cost_items.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  const totalCost = data.cost_items.reduce((sum, c) => sum + (c.total_cost || 0), 0);

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
            Cost Items ({filtered.length})
          </h3>
          {totalCost > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Total estimated: {totalCost.toLocaleString('en-US', { style: 'currency', currency: data.cost_items[0]?.currency || 'USD' })}
            </p>
          )}
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <Input
            placeholder="Search costs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 w-44"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)' }}>
                {['Description', 'Category', 'Unit', 'Qty', 'Unit Rate', 'Total', 'Currency'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((c) => (
                <tr
                  key={c.cost_item_id}
                  className="border-t transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td className="px-3 py-2 font-medium max-w-[200px] truncate" style={{ color: 'var(--color-text)' }}>
                    {c.description}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
                      style={{ background: 'rgba(236,72,153,0.1)', color: '#EC4899' }}
                    >
                      {c.category}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{c.unit}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{c.quantity.toFixed(2)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{c.unit_rate.toFixed(2)}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold" style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                    {c.total_cost.toFixed(2)}
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{c.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p className="text-[10px] text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
              Showing first 100 of {filtered.length} cost items
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No cost items found
        </p>
      )}
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────

export default function BIMDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { currentResult, loadResult } = useBIMStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BIMTab>('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      await loadResult(projectId);
      setLoading(false);
    }
    load();
  }, [projectId, loadResult]);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#0EA5E9' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading BIM results...</p>
        </div>
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
        <ModulePageHeader moduleId="bim" />
        <Card>
          <div className="text-center py-8">
            <Box size={32} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1} className="mx-auto" />
            <p className="text-sm font-medium mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              No results found for project: {projectId}
            </p>
            <button
              onClick={() => router.push('/bim')}
              className="text-xs font-medium mt-3 px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'rgba(14,165,233,0.1)', color: '#0EA5E9' }}
            >
              Back to BIM Engine
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const data = currentResult;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/bim')}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: 'var(--color-bg-input)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; }}
          >
            <ArrowLeft size={14} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                {data.project_info.name || data.project_id}
              </h1>
              <StatusBadge status={data.status} />
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {data.source_file} — processed {new Date(data.processed_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-xl border p-1 overflow-x-auto"
        style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap"
              style={{
                background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                color: isActive ? '#0EA5E9' : 'var(--color-text-muted)',
              }}
            >
              <tab.icon size={13} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'elements' && <ElementsTab data={data} />}
      {activeTab === 'wbs' && <WBSTab data={data} />}
      {activeTab === 'lbs' && <LBSTab data={data} />}
      {activeTab === 'zones' && <ZonesTab data={data} />}
      {activeTab === 'costs' && <CostsTab data={data} />}
    </div>
  );
}
