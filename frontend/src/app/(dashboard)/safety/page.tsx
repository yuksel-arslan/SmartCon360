'use client';

import {
  Shield, AlertTriangle, HardHat, FileCheck, Eye, Users, Clock,
  Loader2, Plus, X, Trash2, Edit3, CheckCircle2, AlertCircle,
  Calendar, Timer, Activity, ShieldAlert, ClipboardCheck, Flame,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ModulePageHeader } from '@/components/modules';
import { useSafetyStore } from '@/stores/safetyStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Incident, PermitToWork, SafetyObservation, ToolboxTalk } from '@/stores/safetyStore';

// ── Types ──────────────────────────────────────────────

type SafetyTab = 'overview' | 'incidents' | 'permits' | 'observations' | 'toolbox';

const tabs: { id: SafetyTab; label: string; icon: typeof Shield }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'permits', label: 'Permits (PTW)', icon: FileCheck },
  { id: 'observations', label: 'Observations', icon: Eye },
  { id: 'toolbox', label: 'Toolbox Talks', icon: Users },
];

const INCIDENT_TYPES = ['injury', 'near_miss', 'property_damage', 'environmental', 'fire', 'other'];
const INCIDENT_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const INCIDENT_STATUSES = ['open', 'investigating', 'corrective_action', 'closed'];

const PTW_TYPES = ['hot_work', 'confined_space', 'working_at_height', 'excavation', 'electrical', 'lifting', 'general'];
const PTW_STATUSES = ['draft', 'pending', 'approved', 'active', 'expired', 'closed'];

const OBS_TYPES = ['safe_act', 'unsafe_act', 'safe_condition', 'unsafe_condition'];
const OBS_CATEGORIES = ['housekeeping', 'ppe', 'fall_protection', 'scaffolding', 'electrical', 'excavation', 'fire', 'other'];
const OBS_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const OBS_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// ── Helpers ──────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityColor(severity: string): { bg: string; text: string } {
  switch (severity) {
    case 'critical': return { bg: 'rgba(239,68,68,0.12)', text: 'var(--color-danger)' };
    case 'high': return { bg: 'rgba(245,158,11,0.12)', text: 'var(--color-warning)' };
    case 'medium': return { bg: 'rgba(59,130,246,0.12)', text: 'rgb(59,130,246)' };
    case 'low': return { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
    default: return { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
  }
}

function statusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'open': case 'pending':
      return { bg: 'rgba(245,158,11,0.12)', text: 'var(--color-warning)' };
    case 'investigating': case 'in_progress': case 'active': case 'approved':
      return { bg: 'rgba(59,130,246,0.12)', text: 'rgb(59,130,246)' };
    case 'corrective_action':
      return { bg: 'rgba(168,85,247,0.12)', text: 'rgb(168,85,247)' };
    case 'closed': case 'resolved': case 'expired':
      return { bg: 'rgba(34,197,94,0.12)', text: 'var(--color-success)' };
    case 'draft':
      return { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
    default:
      return { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
  }
}

// ── Shared UI Components ──────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-5 ${className}`}
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      {children}
    </div>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }} />
  );
}

function Select({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}>
      {children}
    </select>
  );
}

function TextArea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <textarea {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none resize-none ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }} />
  );
}

function Btn({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }) {
  const bg = variant === 'primary' ? 'var(--color-accent)' : variant === 'danger' ? 'var(--color-danger)' : 'transparent';
  const clr = variant === 'ghost' ? 'var(--color-text-muted)' : '#fff';
  return (
    <button {...props}
      className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors ${props.className || ''}`}
      style={{
        background: bg, color: clr,
        borderColor: variant === 'ghost' ? 'var(--color-border)' : undefined,
        border: variant === 'ghost' ? '1px solid' : undefined,
      }}>
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}>
      {capitalize(status)}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string | null | undefined }) {
  if (!severity) return <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>—</span>;
  const c = severityColor(severity);
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}>
      {capitalize(severity)}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Shield; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Icon size={40} strokeWidth={1} style={{ color: 'var(--color-text-muted)' }} />
      <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl border p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        {children}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function SafetyPage() {
  const [activeTab, setActiveTab] = useState<SafetyTab>('overview');
  const { activeProjectId } = useProjectStore();
  const { loading, error, initialized, fetchAll } = useSafetyStore();

  const pid = activeProjectId || '';

  const loadData = useCallback(async () => {
    if (pid) await fetchAll(pid);
  }, [pid, fetchAll]);

  useEffect(() => {
    if (pid) loadData();
  }, [pid, loadData]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
      <ModulePageHeader moduleId="safety" />

      {error && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-3 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border p-1"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}>
              <tab.icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading && !initialized && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      )}

      {!pid && !loading && (
        <Card>
          <EmptyState icon={Shield} message="Select a project to view safety data." />
        </Card>
      )}

      {pid && initialized && (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'incidents' && <IncidentsTab projectId={pid} />}
          {activeTab === 'permits' && <PermitsTab projectId={pid} />}
          {activeTab === 'observations' && <ObservationsTab projectId={pid} />}
          {activeTab === 'toolbox' && <ToolboxTalksTab projectId={pid} />}
        </>
      )}
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const { summary, incidents, permits, observations, toolboxTalks } = useSafetyStore();

  const kpis = [
    {
      label: 'Total Incidents',
      value: summary?.totalIncidents ?? 0,
      icon: AlertTriangle,
      color: 'var(--color-danger)',
      desc: `${summary?.openIncidents ?? 0} open`,
    },
    {
      label: 'Near Misses',
      value: summary?.nearMisses ?? 0,
      icon: ShieldAlert,
      color: 'var(--color-warning)',
      desc: 'Reported near misses',
    },
    {
      label: 'Lost Time Days',
      value: summary?.lostTimeDays ?? 0,
      icon: Clock,
      color: 'rgb(239,68,68)',
      desc: 'Cumulative lost days',
    },
    {
      label: 'Days Since Last Incident',
      value: summary?.daysSinceLastIncident ?? 0,
      icon: Shield,
      color: 'var(--color-success)',
      desc: 'Incident-free streak',
    },
    {
      label: 'Active PTWs',
      value: summary?.activePtws ?? 0,
      icon: FileCheck,
      color: 'rgb(59,130,246)',
      desc: 'Permits currently active',
    },
    {
      label: 'Open Observations',
      value: summary?.openObservations ?? 0,
      icon: Eye,
      color: 'rgb(168,85,247)',
      desc: 'Awaiting resolution',
    },
    {
      label: 'Toolbox Talks (Month)',
      value: summary?.toolboxTalksThisMonth ?? 0,
      icon: Users,
      color: 'var(--color-accent)',
      desc: 'Sessions this month',
    },
    {
      label: 'LTIR',
      value: summary?.ltir != null ? summary.ltir.toFixed(2) : '0.00',
      icon: Activity,
      color: (summary?.ltir ?? 0) > 1 ? 'var(--color-danger)' : 'var(--color-success)',
      desc: 'Lost Time Injury Rate',
    },
  ];

  const recentIncidents = [...incidents].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 5);
  const recentObservations = [...observations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[11px] font-normal uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                <div className="text-3xl font-medium mt-1" style={{ fontFamily: 'var(--font-display)', color: kpi.color }}>
                  {kpi.value}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{kpi.desc}</div>
          </Card>
        ))}
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Incidents */}
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Recent Incidents</h3>
          {recentIncidents.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No incidents recorded</p>
          )}
          {recentIncidents.map((inc) => (
            <div key={inc.id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-medium shrink-0" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                  {inc.incidentNumber}
                </span>
                <div className="min-w-0">
                  <div className="text-xs truncate" style={{ color: 'var(--color-text)' }}>{inc.title}</div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{formatDate(inc.occurredAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <SeverityBadge severity={inc.severity} />
                <StatusBadge status={inc.status} />
              </div>
            </div>
          ))}
        </Card>

        {/* Active Permits */}
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Active Permits</h3>
          {permits.filter((p) => p.status === 'active' || p.status === 'approved').length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No active permits</p>
          )}
          {permits.filter((p) => p.status === 'active' || p.status === 'approved').slice(0, 5).map((ptw) => (
            <div key={ptw.id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-medium shrink-0" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                  {ptw.permitNumber}
                </span>
                <div className="min-w-0">
                  <div className="text-xs truncate" style={{ color: 'var(--color-text)' }}>{ptw.title}</div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {formatDate(ptw.validFrom)} — {formatDate(ptw.validTo)}
                  </div>
                </div>
              </div>
              <StatusBadge status={ptw.status} />
            </div>
          ))}
        </Card>

        {/* Recent Observations */}
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Recent Observations</h3>
          {recentObservations.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No observations recorded</p>
          )}
          {recentObservations.map((obs) => (
            <div key={obs.id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="min-w-0">
                <div className="text-xs truncate" style={{ color: 'var(--color-text)' }}>{obs.title}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {capitalize(obs.type)} / {capitalize(obs.category)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <SeverityBadge severity={obs.severity} />
                <StatusBadge status={obs.status} />
              </div>
            </div>
          ))}
        </Card>

        {/* Recent Toolbox Talks */}
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Recent Toolbox Talks</h3>
          {toolboxTalks.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No toolbox talks recorded</p>
          )}
          {[...toolboxTalks].sort((a, b) => new Date(b.conductedAt).getTime() - new Date(a.conductedAt).getTime()).slice(0, 5).map((talk) => (
            <div key={talk.id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="min-w-0">
                <div className="text-xs truncate" style={{ color: 'var(--color-text)' }}>{talk.title}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {talk.topic} / {formatDate(talk.conductedAt)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <Users size={10} /> {talk.attendeeCount}
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <Timer size={10} /> {talk.duration}m
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// INCIDENTS TAB
// ============================================================================

function IncidentsTab({ projectId }: { projectId: string }) {
  const { incidents, createIncident, updateIncident, deleteIncident, fetchIncidents } = useSafetyStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: '', description: '', type: 'injury', severity: 'medium', status: 'open',
    occurredAt: new Date().toISOString().slice(0, 10), reportedBy: '', injuredPerson: '',
    bodyPart: '', rootCause: '', correctiveAction: '', lostDays: 0,
  };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (inc: Incident) => {
    setEditingId(inc.id);
    setForm({
      title: inc.title,
      description: inc.description || '',
      type: inc.type,
      severity: inc.severity,
      status: inc.status,
      occurredAt: inc.occurredAt ? inc.occurredAt.slice(0, 10) : '',
      reportedBy: inc.reportedBy,
      injuredPerson: inc.injuredPerson || '',
      bodyPart: inc.bodyPart || '',
      rootCause: inc.rootCause || '',
      correctiveAction: inc.correctiveAction || '',
      lostDays: inc.lostDays,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.reportedBy.trim()) return;
    setSaving(true);
    const payload = {
      projectId,
      title: form.title.trim(),
      description: form.description || undefined,
      type: form.type,
      severity: form.severity,
      status: form.status,
      occurredAt: new Date(form.occurredAt).toISOString(),
      reportedBy: form.reportedBy.trim(),
      injuredPerson: form.injuredPerson || undefined,
      bodyPart: form.bodyPart || undefined,
      rootCause: form.rootCause || undefined,
      correctiveAction: form.correctiveAction || undefined,
      lostDays: Number(form.lostDays) || 0,
    };
    if (editingId) {
      await updateIncident(editingId, payload);
    } else {
      await createIncident(payload);
    }
    await fetchIncidents(projectId);
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident?')) return;
    await deleteIncident(id);
    await fetchIncidents(projectId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Incident Register</h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Btn onClick={openCreate}><Plus size={12} /> Report Incident</Btn>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={() => setShowForm(false)}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editingId ? 'Edit Incident' : 'Report New Incident'}
            </h4>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:opacity-70">
              <X size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" />
            <TextArea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
              </Select>
              <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {INCIDENT_SEVERITIES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </Select>
              <Input type="date" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Reported By *" value={form.reportedBy} onChange={(e) => setForm({ ...form, reportedBy: e.target.value })} />
              <Input placeholder="Injured Person" value={form.injuredPerson} onChange={(e) => setForm({ ...form, injuredPerson: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Body Part" value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })} />
              <Input type="number" placeholder="Lost Days" value={form.lostDays} onChange={(e) => setForm({ ...form, lostDays: Number(e.target.value) })} />
            </div>
            <TextArea placeholder="Root Cause" value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} rows={2} className="w-full" />
            <TextArea placeholder="Corrective Action" value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} rows={2} className="w-full" />
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn onClick={handleSave} disabled={saving || !form.title.trim() || !form.reportedBy.trim()}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : editingId ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                {editingId ? 'Update' : 'Create'}
              </Btn>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['INC #', 'Title', 'Type', 'Severity', 'Status', 'Occurred', 'Lost Days', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
                    style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <EmptyState icon={AlertTriangle} message="No incidents reported. Click 'Report Incident' to create one." />
                  </td>
                </tr>
              )}
              {incidents.map((inc) => (
                <tr key={inc.id} className="group">
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                      {inc.incidentNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b max-w-[200px]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs truncate block" style={{ color: 'var(--color-text)' }}>{inc.title}</span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{capitalize(inc.type)}</span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(inc.occurredAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs font-medium" style={{ color: inc.lostDays > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {inc.lostDays}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(inc)} className="p-1.5 rounded-lg hover:opacity-70" title="Edit"
                        style={{ color: 'var(--color-accent)' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(inc.id)} className="p-1.5 rounded-lg hover:opacity-70" title="Delete"
                        style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PERMITS TAB
// ============================================================================

function PermitsTab({ projectId }: { projectId: string }) {
  const { permits, createPermit, updatePermit, deletePermit, fetchPermits } = useSafetyStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: '', type: 'general', status: 'draft', requestedBy: '',
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: '',
  };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (ptw: PermitToWork) => {
    setEditingId(ptw.id);
    setForm({
      title: ptw.title,
      type: ptw.type,
      status: ptw.status,
      requestedBy: ptw.requestedBy,
      validFrom: ptw.validFrom ? ptw.validFrom.slice(0, 10) : '',
      validTo: ptw.validTo ? ptw.validTo.slice(0, 10) : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.requestedBy.trim()) return;
    setSaving(true);
    const payload = {
      projectId,
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      requestedBy: form.requestedBy.trim(),
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
    };
    if (editingId) {
      await updatePermit(editingId, payload);
    } else {
      await createPermit(payload);
    }
    await fetchPermits(projectId);
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this permit?')) return;
    await deletePermit(id);
    await fetchPermits(projectId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Permit to Work (PTW) Register</h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {permits.length} permit{permits.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Btn onClick={openCreate}><Plus size={12} /> New Permit</Btn>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={() => setShowForm(false)}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editingId ? 'Edit Permit' : 'Create New Permit'}
            </h4>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:opacity-70">
              <X size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
          <div className="space-y-3">
            <Input placeholder="Permit Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {PTW_TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
              </Select>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PTW_STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </Select>
            </div>
            <Input placeholder="Requested By *" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Valid From</label>
                <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Valid To</label>
                <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className="w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn onClick={handleSave} disabled={saving || !form.title.trim() || !form.requestedBy.trim()}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : editingId ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                {editingId ? 'Update' : 'Create'}
              </Btn>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['PTW #', 'Title', 'Type', 'Status', 'Valid From', 'Valid To', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
                    style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permits.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <EmptyState icon={FileCheck} message="No permits found. Click 'New Permit' to create one." />
                  </td>
                </tr>
              )}
              {permits.map((ptw) => (
                <tr key={ptw.id} className="group">
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                      {ptw.permitNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b max-w-[200px]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs truncate block" style={{ color: 'var(--color-text)' }}>{ptw.title}</span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{capitalize(ptw.type)}</span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <StatusBadge status={ptw.status} />
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(ptw.validFrom)}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(ptw.validTo)}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(ptw)} className="p-1.5 rounded-lg hover:opacity-70" title="Edit"
                        style={{ color: 'var(--color-accent)' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(ptw.id)} className="p-1.5 rounded-lg hover:opacity-70" title="Delete"
                        style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OBSERVATIONS TAB
// ============================================================================

function ObservationsTab({ projectId }: { projectId: string }) {
  const { observations, createObservation, updateObservation, deleteObservation, fetchObservations } = useSafetyStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: '', description: '', type: 'unsafe_act', category: 'ppe',
    severity: 'medium', status: 'open', observedBy: '', assignedTo: '',
  };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (obs: SafetyObservation) => {
    setEditingId(obs.id);
    setForm({
      title: obs.title,
      description: obs.description || '',
      type: obs.type,
      category: obs.category,
      severity: obs.severity || 'medium',
      status: obs.status,
      observedBy: obs.observedBy,
      assignedTo: obs.assignedTo || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.observedBy.trim()) return;
    setSaving(true);
    const payload = {
      projectId,
      title: form.title.trim(),
      description: form.description || undefined,
      type: form.type,
      category: form.category,
      severity: form.severity,
      status: form.status,
      observedBy: form.observedBy.trim(),
      assignedTo: form.assignedTo || undefined,
    };
    if (editingId) {
      await updateObservation(editingId, payload);
    } else {
      await createObservation(payload);
    }
    await fetchObservations(projectId);
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this observation?')) return;
    await deleteObservation(id);
    await fetchObservations(projectId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Safety Observations</h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {observations.length} observation{observations.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Btn onClick={openCreate}><Plus size={12} /> New Observation</Btn>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <ModalOverlay onClose={() => setShowForm(false)}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editingId ? 'Edit Observation' : 'Report New Observation'}
            </h4>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:opacity-70">
              <X size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" />
            <TextArea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {OBS_TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
              </Select>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {OBS_CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {OBS_SEVERITIES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </Select>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {OBS_STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Observed By *" value={form.observedBy} onChange={(e) => setForm({ ...form, observedBy: e.target.value })} />
              <Input placeholder="Assigned To" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn onClick={handleSave} disabled={saving || !form.title.trim() || !form.observedBy.trim()}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : editingId ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                {editingId ? 'Update' : 'Create'}
              </Btn>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Title', 'Type', 'Category', 'Severity', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
                    style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {observations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <EmptyState icon={Eye} message="No observations recorded. Click 'New Observation' to create one." />
                  </td>
                </tr>
              )}
              {observations.map((obs) => (
                <tr key={obs.id} className="group">
                  <td className="px-4 py-3 border-b max-w-[220px]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs truncate block" style={{ color: 'var(--color-text)' }}>{obs.title}</span>
                    <span className="text-[10px] block mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      by {obs.observedBy}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap`}
                      style={{
                        background: obs.type.startsWith('safe') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: obs.type.startsWith('safe') ? 'var(--color-success)' : 'var(--color-danger)',
                      }}>
                      {capitalize(obs.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{capitalize(obs.category)}</span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <SeverityBadge severity={obs.severity} />
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <StatusBadge status={obs.status} />
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(obs)} className="p-1.5 rounded-lg hover:opacity-70" title="Edit"
                        style={{ color: 'var(--color-accent)' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(obs.id)} className="p-1.5 rounded-lg hover:opacity-70" title="Delete"
                        style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TOOLBOX TALKS TAB
// ============================================================================

function ToolboxTalksTab({ projectId }: { projectId: string }) {
  const { toolboxTalks, createToolboxTalk, deleteToolboxTalk, fetchToolboxTalks } = useSafetyStore();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: '', topic: '', conductedBy: '',
    conductedAt: new Date().toISOString().slice(0, 10),
    attendeeCount: 0, duration: 15, notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.conductedBy.trim() || !form.topic.trim()) return;
    setSaving(true);
    const payload = {
      projectId,
      title: form.title.trim(),
      topic: form.topic.trim(),
      conductedBy: form.conductedBy.trim(),
      conductedAt: new Date(form.conductedAt).toISOString(),
      attendeeCount: Number(form.attendeeCount) || 0,
      duration: Number(form.duration) || 15,
      notes: form.notes || undefined,
    };
    await createToolboxTalk(payload);
    await fetchToolboxTalks(projectId);
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this toolbox talk?')) return;
    await deleteToolboxTalk(id);
    await fetchToolboxTalks(projectId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Toolbox Talks</h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {toolboxTalks.length} talk{toolboxTalks.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Btn onClick={openCreate}><Plus size={12} /> New Toolbox Talk</Btn>
      </div>

      {/* Create Modal */}
      {showForm && (
        <ModalOverlay onClose={() => setShowForm(false)}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Record Toolbox Talk</h4>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:opacity-70">
              <X size={16} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" />
            <Input placeholder="Topic *" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Conducted By *" value={form.conductedBy} onChange={(e) => setForm({ ...form, conductedBy: e.target.value })} />
              <Input type="date" value={form.conductedAt} onChange={(e) => setForm({ ...form, conductedAt: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Attendees</label>
                <Input type="number" min={0} value={form.attendeeCount} onChange={(e) => setForm({ ...form, attendeeCount: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Duration (min)</label>
                <Input type="number" min={1} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className="w-full" />
              </div>
            </div>
            <TextArea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full" />
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn onClick={handleSave} disabled={saving || !form.title.trim() || !form.conductedBy.trim() || !form.topic.trim()}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Create
              </Btn>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Title', 'Topic', 'Date', 'Attendees', 'Duration', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
                    style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {toolboxTalks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <EmptyState icon={Users} message="No toolbox talks recorded. Click 'New Toolbox Talk' to create one." />
                  </td>
                </tr>
              )}
              {toolboxTalks.map((talk) => (
                <tr key={talk.id} className="group">
                  <td className="px-4 py-3 border-b max-w-[200px]" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs truncate block" style={{ color: 'var(--color-text)' }}>{talk.title}</span>
                    <span className="text-[10px] block mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      by {talk.conductedBy}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{talk.topic}</span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(talk.conductedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                      <Users size={11} style={{ color: 'var(--color-text-muted)' }} /> {talk.attendeeCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      <Timer size={11} /> {talk.duration}m
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDelete(talk.id)} className="p-1.5 rounded-lg hover:opacity-70" title="Delete"
                        style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
