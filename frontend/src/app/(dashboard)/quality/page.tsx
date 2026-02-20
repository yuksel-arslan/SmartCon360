'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, AlertTriangle, ClipboardList, Shield, Loader2,
  Plus, X, Trash2, Edit3, Eye, Search,
  BarChart3, Target, CircleDot, AlertCircle,
  Calendar, DollarSign,
} from 'lucide-react';
import { ModulePageHeader } from '@/components/modules';
import { useQualityStore } from '@/stores/qualityStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Inspection, Ncr, PunchItem } from '@/stores/qualityStore';

// ── Types ────────────────────────────────────────────────

type QualityTab = 'overview' | 'inspections' | 'ncrs' | 'punch-items';

const tabs: { id: QualityTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'inspections', label: 'Inspections', icon: ClipboardList },
  { id: 'ncrs', label: 'NCRs', icon: AlertTriangle },
  { id: 'punch-items', label: 'Punch Items', icon: Target },
];

// ── Shared helpers ───────────────────────────────────────

function fmtDate(d?: string | null): string {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n?: number | string | null): string {
  if (n == null) return '--';
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return '--';
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    scheduled: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    in_progress: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    completed: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    pass: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    fail: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    open: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    closed: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    resolved: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    pending: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    rework: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    cancelled: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' },
    draft: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' },
  };
  const c = map[status] || { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    major: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    minor: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    observation: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' },
  };
  const c = map[severity] || { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {severity}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    high: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    medium: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    low: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' },
  };
  const c = map[priority] || { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {priority}
    </span>
  );
}

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

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none w-full ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
    />
  );
}

function Select({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select
      {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none w-full ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
    >
      {children}
    </select>
  );
}

function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <textarea
      {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none w-full resize-none ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
    />
  );
}

function Btn({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }) {
  const bg = variant === 'primary' ? 'var(--color-accent)' : variant === 'danger' ? 'var(--color-danger)' : 'transparent';
  const clr = variant === 'ghost' ? 'var(--color-text-muted)' : '#fff';
  return (
    <button
      {...props}
      className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 font-medium transition-opacity ${props.className || ''}`}
      style={{
        background: bg,
        color: clr,
        borderColor: variant === 'ghost' ? 'var(--color-border)' : undefined,
        border: variant === 'ghost' ? '1px solid' : undefined,
      }}
    >
      {children}
    </button>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative rounded-xl border p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof ClipboardList; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--color-accent-muted)' }}
      >
        <Icon size={22} style={{ color: 'var(--color-accent)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{title}</p>
      <p className="text-xs text-center max-w-sm" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
    </div>
  );
}

// ── Constants ────────────────────────────────────────────

const INSPECTION_TYPES = ['routine', 'milestone', 'final', 'third_party', 'safety', 'environmental'];
const INSPECTION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const INSPECTION_RESULTS = ['pass', 'fail', 'conditional'];
const NCR_SEVERITIES = ['critical', 'major', 'minor', 'observation'];
const NCR_CATEGORIES = ['workmanship', 'material', 'design', 'process', 'safety', 'documentation'];
const NCR_STATUSES = ['open', 'in_progress', 'rework', 'resolved', 'closed'];
const PUNCH_CATEGORIES = ['defect', 'incomplete', 'damage', 'cosmetic', 'safety', 'documentation'];
const PUNCH_PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PUNCH_STATUSES = ['open', 'in_progress', 'completed', 'closed'];

// ── Main Page ────────────────────────────────────────────

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<QualityTab>('overview');
  const { activeProjectId } = useProjectStore();
  const { loading, error, initialized, fetchAll } = useQualityStore();

  const loadData = useCallback(async () => {
    if (activeProjectId) {
      await fetchAll(activeProjectId);
    }
  }, [activeProjectId, fetchAll]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
      <ModulePageHeader moduleId="quality" />

      {error && (
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-3 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl border p-1"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && !initialized && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      )}

      {/* Tabs */}
      {initialized && (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'inspections' && <InspectionsTab projectId={activeProjectId} />}
          {activeTab === 'ncrs' && <NcrsTab projectId={activeProjectId} />}
          {activeTab === 'punch-items' && <PunchItemsTab projectId={activeProjectId} />}
        </>
      )}
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const { summary, inspections, ncrs, punchItems } = useQualityStore();

  const ftrRate = summary?.ftrRate ?? 0;
  const openNcrs = summary?.openNcrs ?? 0;
  const closedNcrs = summary?.closedNcrs ?? 0;
  const totalInspections = summary?.totalInspections ?? 0;
  const passedInspections = summary?.passedInspections ?? 0;
  const copq = summary?.copq ?? 0;
  const openPunchItems = summary?.openPunchItems ?? 0;
  const inspectionsThisWeek = summary?.inspectionsThisWeek ?? 0;

  const passRate = totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 0;

  const kpis = [
    {
      label: 'FTR Rate',
      value: `${ftrRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: ftrRate >= 85 ? 'var(--color-success)' : ftrRate >= 70 ? 'var(--color-warning)' : 'var(--color-danger)',
      desc: 'First Time Right',
    },
    {
      label: 'Open NCRs',
      value: `${openNcrs}`,
      icon: AlertTriangle,
      color: openNcrs > 10 ? 'var(--color-danger)' : openNcrs > 5 ? 'var(--color-warning)' : 'var(--color-success)',
      desc: `${closedNcrs} closed`,
    },
    {
      label: 'COPQ',
      value: copq > 0 ? `$${fmtCurrency(copq)}` : '$0',
      icon: DollarSign,
      color: copq > 50000 ? 'var(--color-danger)' : copq > 10000 ? 'var(--color-warning)' : 'var(--color-success)',
      desc: 'Cost of Poor Quality',
    },
    {
      label: 'Inspections',
      value: `${totalInspections}`,
      icon: ClipboardList,
      color: 'var(--color-accent)',
      desc: `${passRate}% pass rate`,
    },
    {
      label: 'This Week',
      value: `${inspectionsThisWeek}`,
      icon: Calendar,
      color: 'var(--color-accent)',
      desc: 'Inspections scheduled',
    },
    {
      label: 'Passed',
      value: `${passedInspections}`,
      icon: Shield,
      color: 'var(--color-success)',
      desc: `of ${totalInspections} total`,
    },
    {
      label: 'Open Punch Items',
      value: `${openPunchItems}`,
      icon: Target,
      color: openPunchItems > 20 ? 'var(--color-danger)' : openPunchItems > 10 ? 'var(--color-warning)' : 'var(--color-success)',
      desc: 'Awaiting resolution',
    },
    {
      label: 'NCR Closure',
      value: (openNcrs + closedNcrs) > 0
        ? `${Math.round((closedNcrs / (openNcrs + closedNcrs)) * 100)}%`
        : '--',
      icon: CircleDot,
      color: 'var(--color-accent)',
      desc: 'NCR closure rate',
    },
  ];

  // Recent NCRs for overview
  const recentNcrs = [...ncrs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  // Upcoming inspections for overview
  const upcomingInspections = [...inspections]
    .filter((i) => i.status === 'scheduled' && i.scheduledDate)
    .sort((a, b) =>
      new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                {kpi.label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.color}18` }}
              >
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
            </div>
            <div
              className="text-2xl font-medium mt-1"
              style={{ fontFamily: 'var(--font-display)', color: kpi.color }}
            >
              {kpi.value}
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {kpi.desc}
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent NCRs */}
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Recent NCRs</h3>
          {recentNcrs.length === 0 && (
            <p className="text-xs py-4" style={{ color: 'var(--color-text-muted)' }}>No NCRs recorded yet</p>
          )}
          {recentNcrs.map((ncr) => (
            <div
              key={ncr.id}
              className="flex items-center justify-between py-2.5 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="text-[11px] font-medium shrink-0"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
                >
                  {ncr.ncrNumber}
                </span>
                <div className="min-w-0">
                  <div className="text-xs truncate" style={{ color: 'var(--color-text)' }}>{ncr.title}</div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{ncr.category} &middot; {fmtDate(ncr.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <SeverityBadge severity={ncr.severity} />
                <StatusBadge status={ncr.status} />
              </div>
            </div>
          ))}
        </Card>

        {/* Upcoming Inspections */}
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Upcoming Inspections</h3>
          {upcomingInspections.length === 0 && (
            <p className="text-xs py-4" style={{ color: 'var(--color-text-muted)' }}>No upcoming inspections</p>
          )}
          {upcomingInspections.map((insp) => (
            <div
              key={insp.id}
              className="flex items-center justify-between py-2.5 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{insp.title}</div>
                <div className="text-[10px] flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  <Calendar size={10} />
                  {fmtDate(insp.scheduledDate)}
                  <span>&middot;</span>
                  <span className="capitalize">{insp.type.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <StatusBadge status={insp.status} />
            </div>
          ))}
        </Card>
      </div>

      {/* Open Punch Items summary */}
      {punchItems.filter((p) => p.status === 'open' || p.status === 'in_progress').length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Active Punch Items ({punchItems.filter((p) => p.status === 'open' || p.status === 'in_progress').length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {punchItems
              .filter((p) => p.status === 'open' || p.status === 'in_progress')
              .slice(0, 6)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ background: 'var(--color-bg-secondary)' }}
                >
                  <div className="min-w-0">
                    <div className="text-xs truncate" style={{ color: 'var(--color-text)' }}>{item.title}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {item.category} &middot; Due {fmtDate(item.dueDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <PriorityBadge priority={item.priority} />
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// INSPECTIONS TAB
// ============================================================================

function InspectionsTab({ projectId }: { projectId: string | null }) {
  const { inspections, createInspection, updateInspection, deleteInspection, fetchInspections } = useQualityStore();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Inspection | null>(null);
  const [viewItem, setViewItem] = useState<Inspection | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fType, setFType] = useState('routine');
  const [fStatus, setFStatus] = useState('scheduled');
  const [fScheduledDate, setFScheduledDate] = useState('');
  const [fResult, setFResult] = useState('');
  const [fScore, setFScore] = useState('');
  const [fNotes, setFNotes] = useState('');

  const resetForm = useCallback(() => {
    setFTitle('');
    setFType('routine');
    setFStatus('scheduled');
    setFScheduledDate('');
    setFResult('');
    setFScore('');
    setFNotes('');
    setEditItem(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: Inspection) => {
    setEditItem(item);
    setFTitle(item.title);
    setFType(item.type);
    setFStatus(item.status);
    setFScheduledDate(item.scheduledDate?.split('T')[0] || '');
    setFResult(item.result || '');
    setFScore(item.score?.toString() || '');
    setFNotes(item.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fTitle.trim() || !projectId) return;
    setSaving(true);
    const payload: Partial<Inspection> = {
      projectId,
      title: fTitle.trim(),
      type: fType,
      status: fStatus,
      scheduledDate: fScheduledDate || null,
      result: fResult || null,
      score: fScore || null,
      notes: fNotes || null,
    };

    if (editItem) {
      await updateInspection(editItem.id, payload);
    } else {
      await createInspection(payload);
    }
    await fetchInspections(projectId);
    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!projectId) return;
    await deleteInspection(id);
    await fetchInspections(projectId);
  };

  const filtered = inspections.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (searchTerm && !i.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <Input
              placeholder="Search inspections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
            <option value="all">All Status</option>
            {INSPECTION_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-auto">
            <option value="all">All Types</option>
            {INSPECTION_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </Select>
        </div>
        <Btn onClick={openCreate}><Plus size={14} /> New Inspection</Btn>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No inspections found"
            description="Create a new inspection to start tracking quality checks across your project zones."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Title', 'Type', 'Status', 'Scheduled', 'Result', 'Score', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wide font-medium px-4 py-3"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{item.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(item.scheduledDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.result ? <StatusBadge status={item.result} /> : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>--</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
                        {item.score ?? '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewItem(item)}
                          className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--color-accent)' }}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--color-danger)' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={() => { setShowForm(false); resetForm(); }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editItem ? 'Edit Inspection' : 'New Inspection'}
            </h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Title *</label>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Inspection title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Type</label>
                <Select value={fType} onChange={(e) => setFType(e.target.value)}>
                  {INSPECTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Status</label>
                <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  {INSPECTION_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Scheduled Date</label>
              <Input type="date" value={fScheduledDate} onChange={(e) => setFScheduledDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Result</label>
                <Select value={fResult} onChange={(e) => setFResult(e.target.value)}>
                  <option value="">-- None --</option>
                  {INSPECTION_RESULTS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Score</label>
                <Input type="number" value={fScore} onChange={(e) => setFScore(e.target.value)} placeholder="0-100" min="0" max="100" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
              <Textarea rows={3} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving || !fTitle.trim()}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editItem ? 'Update' : 'Create'}
            </Btn>
          </div>
        </ModalOverlay>
      )}

      {/* View Modal */}
      {viewItem && (
        <ModalOverlay onClose={() => setViewItem(null)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Inspection Details</h3>
            <button onClick={() => setViewItem(null)} style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Title</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text)' }}>{viewItem.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Type</span>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--color-text)' }}>{viewItem.type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Status</span>
                <div className="mt-0.5"><StatusBadge status={viewItem.status} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Scheduled</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text)' }}>{fmtDate(viewItem.scheduledDate)}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Completed</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text)' }}>{fmtDate(viewItem.completedDate)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Result</span>
                <div className="mt-0.5">{viewItem.result ? <StatusBadge status={viewItem.result} /> : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>--</span>}</div>
              </div>
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Score</span>
                <p className="text-xs mt-0.5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{viewItem.score ?? '--'}</p>
              </div>
            </div>
            {viewItem.notes && (
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Notes</span>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text)' }}>{viewItem.notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Created</span>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(viewItem.createdAt)}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Updated</span>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(viewItem.updatedAt)}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="ghost" onClick={() => setViewItem(null)}>Close</Btn>
            <Btn onClick={() => { setViewItem(null); openEdit(viewItem); }}>
              <Edit3 size={14} /> Edit
            </Btn>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ============================================================================
// NCRs TAB
// ============================================================================

function NcrsTab({ projectId }: { projectId: string | null }) {
  const { ncrs, createNcr, updateNcr, deleteNcr, fetchNcrs } = useQualityStore();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Ncr | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fSeverity, setFSeverity] = useState('minor');
  const [fCategory, setFCategory] = useState('workmanship');
  const [fStatus, setFStatus] = useState('open');
  const [fReworkCost, setFReworkCost] = useState('');
  const [fDueDate, setFDueDate] = useState('');
  const [fRootCause, setFRootCause] = useState('');
  const [fCorrectiveAction, setFCorrectiveAction] = useState('');

  const resetForm = useCallback(() => {
    setFTitle('');
    setFDescription('');
    setFSeverity('minor');
    setFCategory('workmanship');
    setFStatus('open');
    setFReworkCost('');
    setFDueDate('');
    setFRootCause('');
    setFCorrectiveAction('');
    setEditItem(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: Ncr) => {
    setEditItem(item);
    setFTitle(item.title);
    setFDescription(item.description || '');
    setFSeverity(item.severity);
    setFCategory(item.category);
    setFStatus(item.status);
    setFReworkCost(item.reworkCost?.toString() || '');
    setFDueDate(item.dueDate?.split('T')[0] || '');
    setFRootCause(item.rootCause || '');
    setFCorrectiveAction(item.correctiveAction || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fTitle.trim() || !projectId) return;
    setSaving(true);
    const payload: Partial<Ncr> = {
      projectId,
      title: fTitle.trim(),
      description: fDescription || null,
      severity: fSeverity,
      category: fCategory,
      status: fStatus,
      reworkCost: fReworkCost || null,
      dueDate: fDueDate || null,
      rootCause: fRootCause || null,
      correctiveAction: fCorrectiveAction || null,
    };

    if (editItem) {
      await updateNcr(editItem.id, payload);
    } else {
      await createNcr(payload);
    }
    await fetchNcrs(projectId);
    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!projectId) return;
    await deleteNcr(id);
    await fetchNcrs(projectId);
  };

  const filtered = ncrs.filter((n) => {
    if (filterStatus !== 'all' && n.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && n.severity !== filterSeverity) return false;
    if (searchTerm && !n.title.toLowerCase().includes(searchTerm.toLowerCase()) && !n.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <Input
              placeholder="Search NCRs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
            <option value="all">All Status</option>
            {NCR_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <Select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="w-auto">
            <option value="all">All Severity</option>
            {NCR_SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <Btn onClick={openCreate}><Plus size={14} /> New NCR</Btn>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No NCRs found"
            description="Create a non-conformance report when quality issues are identified during inspections."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['NCR #', 'Title', 'Severity', 'Category', 'Status', 'COPQ', 'Due Date', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wide font-medium px-4 py-3"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-medium"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
                      >
                        {item.ncrNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium max-w-[200px] truncate" style={{ color: 'var(--color-text)' }}>
                        {item.title}
                      </div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={item.severity} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{item.category}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: item.reworkCost ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                        {item.reworkCost ? `$${fmtCurrency(item.reworkCost)}` : '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(item.dueDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--color-accent)' }}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--color-danger)' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={() => { setShowForm(false); resetForm(); }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editItem ? `Edit NCR — ${editItem.ncrNumber}` : 'New NCR'}
            </h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Title *</label>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="NCR title" />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Description</label>
              <Textarea rows={2} value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Describe the non-conformance..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Severity</label>
                <Select value={fSeverity} onChange={(e) => setFSeverity(e.target.value)}>
                  {NCR_SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category</label>
                <Select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                  {NCR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Status</label>
                <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  {NCR_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Rework Cost ($)</label>
                <Input type="number" value={fReworkCost} onChange={(e) => setFReworkCost(e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Due Date</label>
              <Input type="date" value={fDueDate} onChange={(e) => setFDueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Root Cause</label>
              <Textarea rows={2} value={fRootCause} onChange={(e) => setFRootCause(e.target.value)} placeholder="Identify the root cause..." />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Corrective Action</label>
              <Textarea rows={2} value={fCorrectiveAction} onChange={(e) => setFCorrectiveAction(e.target.value)} placeholder="Describe corrective actions..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving || !fTitle.trim()}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editItem ? 'Update' : 'Create'}
            </Btn>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ============================================================================
// PUNCH ITEMS TAB
// ============================================================================

function PunchItemsTab({ projectId }: { projectId: string | null }) {
  const { punchItems, createPunchItem, updatePunchItem, deletePunchItem, fetchPunchItems } = useQualityStore();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PunchItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Form state
  const [fTitle, setFTitle] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fCategory, setFCategory] = useState('defect');
  const [fPriority, setFPriority] = useState('medium');
  const [fStatus, setFStatus] = useState('open');
  const [fDueDate, setFDueDate] = useState('');

  const resetForm = useCallback(() => {
    setFTitle('');
    setFDescription('');
    setFCategory('defect');
    setFPriority('medium');
    setFStatus('open');
    setFDueDate('');
    setEditItem(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: PunchItem) => {
    setEditItem(item);
    setFTitle(item.title);
    setFDescription(item.description || '');
    setFCategory(item.category);
    setFPriority(item.priority);
    setFStatus(item.status);
    setFDueDate(item.dueDate?.split('T')[0] || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!fTitle.trim() || !projectId) return;
    setSaving(true);
    const payload: Partial<PunchItem> = {
      projectId,
      title: fTitle.trim(),
      description: fDescription || null,
      category: fCategory,
      priority: fPriority,
      status: fStatus,
      dueDate: fDueDate || null,
    };

    if (editItem) {
      await updatePunchItem(editItem.id, payload);
    } else {
      await createPunchItem(payload);
    }
    await fetchPunchItems(projectId);
    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!projectId) return;
    await deletePunchItem(id);
    await fetchPunchItems(projectId);
  };

  const filtered = punchItems.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
    if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <Input
              placeholder="Search punch items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
            <option value="all">All Status</option>
            {PUNCH_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-auto">
            <option value="all">All Priority</option>
            {PUNCH_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <Btn onClick={openCreate}><Plus size={14} /> New Punch Item</Btn>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No punch items found"
            description="Add punch items to track defects, incomplete work, and items requiring attention before handover."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Title', 'Category', 'Priority', 'Status', 'Due Date', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] uppercase tracking-wide font-medium px-4 py-3"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium max-w-[240px] truncate" style={{ color: 'var(--color-text)' }}>
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-[10px] mt-0.5 max-w-[240px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{item.category}</span>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(item.dueDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--color-accent)' }}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-md hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--color-danger)' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={() => { setShowForm(false); resetForm(); }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editItem ? 'Edit Punch Item' : 'New Punch Item'}
            </h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Title *</label>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Punch item title" />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Description</label>
              <Textarea rows={2} value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Describe the issue..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category</label>
                <Select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                  {PUNCH_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Priority</label>
                <Select value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
                  {PUNCH_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Status</label>
                <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  {PUNCH_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Due Date</label>
                <Input type="date" value={fDueDate} onChange={(e) => setFDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving || !fTitle.trim()}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editItem ? 'Update' : 'Create'}
            </Btn>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
