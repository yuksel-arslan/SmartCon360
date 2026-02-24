'use client';

import TopBar from '@/components/layout/TopBar';
import { DEMO_CONSTRAINTS } from '@/lib/mockData';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import {
  AlertTriangle, Clock, CheckCircle2, Filter, RefreshCw, Loader2, Plus, X, Check,
  Link2, ArrowRight, Pencil, Trash2, Save,
} from 'lucide-react';
import { useState, useEffect, useCallback, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllRelationshipTemplates,
  getAllSubActivityRelationships,
  type ActivityRelationshipTemplate,
} from '@/lib/templates/activity-relationship-templates';

// ── Types ──

type PageTab = 'constraints' | 'relationships';

interface ConstraintItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  tradeCode?: string;
  zoneName?: string;
  dueDate?: string;
  description?: string;
  assignedTo?: string;
  source?: string;
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  crr: number;
}

interface RelationshipRow {
  id: string;
  predecessorTradeId: string;
  successorTradeId: string;
  predecessorTradeCode: string;
  successorTradeCode: string;
  predecessorTradeName: string;
  successorTradeName: string;
  predecessorTradeColor: string;
  successorTradeColor: string;
  type: string;
  lagDays: number;
  mandatory: boolean;
  description: string;
  source: string;
}

// ── Constants ──

const CATEGORIES = ['material', 'labor', 'design', 'predecessor', 'equipment', 'space', 'permit', 'information'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const REL_TYPES = ['FS', 'SS', 'FF', 'SF'];

const priorityColors: Record<string, string> = {
  critical: 'var(--color-danger)', high: 'var(--color-warning)', medium: 'var(--color-accent)', low: 'var(--color-text-muted)',
};

const statusIcons: Record<string, typeof AlertTriangle> = {
  open: AlertTriangle, in_progress: Clock, resolved: CheckCircle2,
};

const categoryLabels: Record<string, string> = {
  material: 'Material', labor: 'Labor', design: 'Design', predecessor: 'Predecessor',
  equipment: 'Equipment', space: 'Space', permit: 'Permit', information: 'Information',
};

const relTypeLabels: Record<string, string> = {
  FS: 'Finish-to-Start',
  SS: 'Start-to-Start',
  FF: 'Finish-to-Finish',
  SF: 'Start-to-Finish',
};

const relTypeColors: Record<string, string> = {
  FS: 'var(--color-purple)',
  SS: 'var(--color-cyan)',
  FF: 'var(--color-warning)',
  SF: 'var(--color-danger)',
};

// ── Helpers ──

function mapDemoToConstraints(): ConstraintItem[] {
  return DEMO_CONSTRAINTS.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    priority: c.priority,
    status: c.status,
    tradeCode: c.trade,
    zoneName: c.zone,
    dueDate: c.dueDate,
    source: 'manual',
  }));
}

function computeDemoStats(): Stats {
  const total = DEMO_CONSTRAINTS.length;
  const open = DEMO_CONSTRAINTS.filter((c) => c.status === 'open').length;
  const inProgress = DEMO_CONSTRAINTS.filter((c) => c.status === 'in_progress').length;
  const resolved = total - open - inProgress;
  return { total, open, inProgress, resolved, crr: total > 0 ? Math.round((resolved / total) * 100) : 100 };
}

function getDisciplineFromCode(code: string): string {
  if (code.startsWith('STR-') || code.startsWith('FND-') || code.startsWith('FRC-')) return 'Structural';
  if (code.startsWith('MEC-')) return 'Mechanical';
  if (code.startsWith('ELC-')) return 'Electrical';
  if (code.startsWith('ARC-')) return 'Architectural';
  if (code.startsWith('LND-') || code.startsWith('CLR-')) return 'Landscape';
  return 'Cross-Discipline';
}

// ── Main Component ──

export default function ConstraintsPage() {
  const formId = useId();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const token = useAuthStore((s) => s.token);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<PageTab>('relationships');

  // ── Constraint state ──
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [constraints, setConstraints] = useState<ConstraintItem[]>(mapDemoToConstraints());
  const [stats, setStats] = useState<Stats>(computeDemoStats());
  const [loading, setLoading] = useState(true);
  const [usingApi, setUsingApi] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // ── Relationship state ──
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);
  const [relLoading, setRelLoading] = useState(false);
  const [editingRelId, setEditingRelId] = useState<string | null>(null);
  const [editRelData, setEditRelData] = useState({ type: 'FS', lagDays: 0, mandatory: true });
  const [relFilterDiscipline, setRelFilterDiscipline] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  const [newConstraint, setNewConstraint] = useState({
    projectId: '',
    title: '',
    description: '',
    category: 'material',
    priority: 'medium',
    zoneId: '',
    tradeId: '',
    assignedTo: '',
    dueDate: '',
  });

  // ── Constraint API ──

  const fetchConstraints = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const projectParam = activeProjectId ? `projectId=${activeProjectId}` : '';
      const statusParam = filterStatus !== 'all' ? `status=${filterStatus}` : '';
      const queryParams = [projectParam, statusParam].filter(Boolean).join('&');
      const qs = queryParams ? `?${queryParams}` : '';

      const [constraintsRes, statsRes] = await Promise.all([
        fetch(`/api/v1/constraints${qs}`, { headers }),
        fetch(`/api/v1/constraints/stats${activeProjectId ? `?projectId=${activeProjectId}` : ''}`, { headers }),
      ]);

      if (constraintsRes.ok && statsRes.ok) {
        const { data: constraintData } = await constraintsRes.json();
        const { data: statsData } = await statsRes.json();

        setConstraints(constraintData.map((c: Record<string, string>) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          priority: c.priority,
          status: c.status,
          tradeCode: c.tradeId || c.tradeCode,
          zoneName: c.zoneId || c.zoneName,
          dueDate: c.dueDate?.split('T')[0],
          description: c.description,
          assignedTo: c.assignedTo,
          source: c.source,
        })));

        setStats({
          total: statsData.total,
          open: statsData.open,
          inProgress: statsData.inProgress,
          resolved: statsData.resolved,
          crr: statsData.crr,
        });
        setUsingApi(true);
      } else {
        throw new Error('API not available');
      }
    } catch {
      const demo = mapDemoToConstraints();
      const filtered = filterStatus === 'all' ? demo : demo.filter((c) => c.status === filterStatus);
      setConstraints(filtered);
      setStats(computeDemoStats());
      setUsingApi(false);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, activeProjectId, getAuthHeaders]);

  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

  const handleCreate = async () => {
    if (!newConstraint.title.trim()) return;
    try {
      const payload = { ...newConstraint, projectId: activeProjectId || newConstraint.projectId };
      const res = await fetch('/api/v1/constraints', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewConstraint({ projectId: '', title: '', description: '', category: 'material', priority: 'medium', zoneId: '', tradeId: '', assignedTo: '', dueDate: '' });
        fetchConstraints();
      }
    } catch {
      setConstraints((prev) => [...prev, {
        id: `local-${Date.now()}`,
        title: newConstraint.title,
        category: newConstraint.category,
        priority: newConstraint.priority,
        status: 'open',
        tradeCode: newConstraint.tradeId,
        zoneName: newConstraint.zoneId,
        dueDate: newConstraint.dueDate,
        description: newConstraint.description,
        assignedTo: newConstraint.assignedTo,
      }]);
      setShowAddForm(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/constraints/${id}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ resolutionNotes }),
      });
      if (res.ok) {
        setResolvingId(null);
        setResolutionNotes('');
        fetchConstraints();
      }
    } catch {
      setConstraints((prev) => prev.map((c) => c.id === id ? { ...c, status: 'resolved' } : c));
      setResolvingId(null);
      setResolutionNotes('');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/v1/constraints/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      fetchConstraints();
    } catch {
      setConstraints((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
    }
  };

  // ── Relationship API ──

  const fetchRelationships = useCallback(async () => {
    if (!activeProjectId) return;
    setRelLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProjectId}/relationships`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const { data } = await res.json();
        setRelationships(data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          predecessorTradeId: r.predecessorTradeId as string,
          successorTradeId: r.successorTradeId as string,
          predecessorTradeCode: (r.predecessorTradeCode as string) || '',
          successorTradeCode: (r.successorTradeCode as string) || '',
          predecessorTradeName: (r.predecessorTradeName as string) || '',
          successorTradeName: (r.successorTradeName as string) || '',
          predecessorTradeColor: (r.predecessorTradeColor as string) || '#999',
          successorTradeColor: (r.successorTradeColor as string) || '#999',
          type: (r.type as string) || 'FS',
          lagDays: (r.lagDays as number) || 0,
          mandatory: (r.mandatory as boolean) ?? true,
          description: (r.description as string) || '',
          source: (r.source as string) || 'template',
        })));
      }
    } catch { /* API not available, use template data as fallback */ }
    finally {
      setRelLoading(false);
    }
  }, [activeProjectId, getAuthHeaders]);

  useEffect(() => {
    if (activeTab === 'relationships') {
      fetchRelationships();
    }
  }, [activeTab, fetchRelationships]);

  // Template fallback for relationships
  const templateRelationships = useMemo(() => {
    const all = getAllRelationshipTemplates();
    const subActivityMaps = getAllSubActivityRelationships();
    return { wagon: all, subActivities: subActivityMaps };
  }, []);

  // Displayed relationships: from DB if available, otherwise from templates
  const displayRelationships = useMemo(() => {
    if (relationships.length > 0) return relationships;
    // Fallback: convert templates to display format
    return templateRelationships.wagon.map((r, i) => ({
      id: `tmpl-${i}`,
      predecessorTradeId: '',
      successorTradeId: '',
      predecessorTradeCode: r.predecessorCode,
      successorTradeCode: r.successorCode,
      predecessorTradeName: r.predecessorCode,
      successorTradeName: r.successorCode,
      predecessorTradeColor: '#6366F1',
      successorTradeColor: '#6366F1',
      type: r.type,
      lagDays: r.lagDays,
      mandatory: r.mandatory,
      description: r.description,
      source: 'template',
    }));
  }, [relationships, templateRelationships]);

  // Group relationships by discipline
  const groupedRelationships = useMemo(() => {
    const groups = new Map<string, RelationshipRow[]>();
    for (const r of displayRelationships) {
      const disc = getDisciplineFromCode(r.predecessorTradeCode);
      const list = groups.get(disc) || [];
      list.push(r);
      groups.set(disc, list);
    }
    return groups;
  }, [displayRelationships]);

  const disciplineList = useMemo(() => ['all', ...Array.from(groupedRelationships.keys())], [groupedRelationships]);

  const filteredRelationships = useMemo(() => {
    if (relFilterDiscipline === 'all') return displayRelationships;
    return groupedRelationships.get(relFilterDiscipline) || [];
  }, [relFilterDiscipline, displayRelationships, groupedRelationships]);

  // Edit relationship
  const startEditRel = useCallback((r: RelationshipRow) => {
    setEditingRelId(r.id);
    setEditRelData({ type: r.type, lagDays: r.lagDays, mandatory: r.mandatory });
  }, []);

  const saveRelEdit = useCallback(async (id: string) => {
    if (!activeProjectId || id.startsWith('tmpl-')) {
      setEditingRelId(null);
      return;
    }
    try {
      await fetch(`/api/v1/projects/${activeProjectId}/relationships/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: editRelData.type,
          lagDays: editRelData.lagDays,
          mandatory: editRelData.mandatory,
        }),
      });
      setEditingRelId(null);
      fetchRelationships();
    } catch {
      // Optimistic update locally
      setRelationships((prev) => prev.map((r) =>
        r.id === id ? { ...r, ...editRelData } : r
      ));
      setEditingRelId(null);
    }
  }, [activeProjectId, editRelData, getAuthHeaders, fetchRelationships]);

  const deleteRelationship = useCallback(async (id: string) => {
    if (!activeProjectId || id.startsWith('tmpl-')) return;
    try {
      await fetch(`/api/v1/projects/${activeProjectId}/relationships/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      fetchRelationships();
    } catch {
      setRelationships((prev) => prev.filter((r) => r.id !== id));
    }
  }, [activeProjectId, getAuthHeaders, fetchRelationships]);

  // Sync templates
  const handleSyncTemplates = useCallback(async () => {
    if (!activeProjectId) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/v1/projects/${activeProjectId}/setup/sync-templates`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ removeOrphans: false }),
      });
      if (res.ok) {
        fetchRelationships();
      }
    } catch { /* sync failed */ }
    finally {
      setIsSyncing(false);
    }
  }, [activeProjectId, getAuthHeaders, fetchRelationships]);

  // ── Filtered constraints ──
  const filtered = usingApi
    ? constraints
    : filterStatus === 'all'
      ? constraints
      : constraints.filter((c) => c.status === filterStatus);

  return (
    <>
      <TopBar title="Constraints & Relationships" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">

        {/* ── Tab Navigation ── */}
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--color-bg-input)' }}>
          <button
            onClick={() => setActiveTab('constraints')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold transition-all"
            style={{
              background: activeTab === 'constraints' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'constraints' ? 'white' : 'var(--color-text-muted)',
            }}
          >
            <AlertTriangle size={13} />
            Constraints
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{
              background: activeTab === 'constraints' ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              {stats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold transition-all"
            style={{
              background: activeTab === 'relationships' ? 'var(--color-purple)' : 'transparent',
              color: activeTab === 'relationships' ? 'white' : 'var(--color-text-muted)',
            }}
          >
            <Link2 size={13} />
            Activity Relationships
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{
              background: activeTab === 'relationships' ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>
              {displayRelationships.length}
            </span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONSTRAINTS TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'constraints' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total', value: stats.total, color: 'var(--color-text)' },
                { label: 'Open', value: stats.open, color: 'var(--color-danger)' },
                { label: 'In Progress', value: stats.inProgress, color: 'var(--color-warning)' },
                { label: 'Resolved', value: stats.resolved, color: 'var(--color-success)' },
                { label: 'CRR', value: `${stats.crr}%`, color: 'var(--color-success)' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                  <div className="text-2xl font-medium" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Filter bar + Add button */}
            <div className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
                {['all', 'open', 'in_progress', 'resolved'].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                    style={{ background: filterStatus === s ? 'var(--color-accent)' : 'transparent', color: filterStatus === s ? 'white' : 'var(--color-text-secondary)' }}>
                    {s === 'all' ? 'All' : s === 'open' ? 'Open' : s === 'in_progress' ? 'In Progress' : 'Resolved'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {!usingApi && !loading && (
                  <span className="text-[9px] font-semibold px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}>
                    Demo Data
                  </span>
                )}
                <button onClick={fetchConstraints} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" title="Refresh">
                  <RefreshCw size={14} style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-accent)' }}
                >
                  <Plus size={13} />
                  Add Constraint
                </button>
              </div>
            </div>

            {/* Add Constraint Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>New Constraint</h3>
                      <button onClick={() => setShowAddForm(false)} className="p-1 rounded-md hover:opacity-70">
                        <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label htmlFor={`${formId}-title`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Title</label>
                        <input id={`${formId}-title`} value={newConstraint.title}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, title: e.target.value }))}
                          placeholder="e.g., MEP material delivery delayed"
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} autoFocus />
                      </div>
                      <div>
                        <label htmlFor={`${formId}-cat`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Category</label>
                        <select id={`${formId}-cat`} value={newConstraint.category}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, category: e.target.value }))}
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`${formId}-pri`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Priority</label>
                        <select id={`${formId}-pri`} value={newConstraint.priority}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, priority: e.target.value }))}
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                          {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`${formId}-due`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Due Date</label>
                        <input id={`${formId}-due`} type="date" value={newConstraint.dueDate}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, dueDate: e.target.value }))}
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                      </div>
                      <div>
                        <label htmlFor={`${formId}-zone`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Zone</label>
                        <input id={`${formId}-zone`} value={newConstraint.zoneId}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, zoneId: e.target.value }))}
                          placeholder="e.g., Zone A"
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                      </div>
                      <div>
                        <label htmlFor={`${formId}-trade`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Trade</label>
                        <input id={`${formId}-trade`} value={newConstraint.tradeId}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, tradeId: e.target.value }))}
                          placeholder="e.g., MEP"
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                      </div>
                      <div>
                        <label htmlFor={`${formId}-assigned`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Assigned To</label>
                        <input id={`${formId}-assigned`} value={newConstraint.assignedTo}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, assignedTo: e.target.value }))}
                          placeholder="e.g., M. Yilmaz"
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label htmlFor={`${formId}-desc`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                        <textarea id={`${formId}-desc`} value={newConstraint.description}
                          onChange={(e) => setNewConstraint((p) => ({ ...p, description: e.target.value }))}
                          placeholder="Describe the constraint and its impact..." rows={2}
                          className="w-full text-xs px-3 py-2 rounded-lg border outline-none resize-none"
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={handleCreate} disabled={!newConstraint.title.trim()}
                        className="text-[11px] font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ background: 'var(--color-accent)' }}>
                        Create Constraint
                      </button>
                      <button onClick={() => setShowAddForm(false)}
                        className="text-[11px] font-semibold px-4 py-2 rounded-lg border transition-opacity hover:opacity-80"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Constraint list */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                    <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: 'var(--color-success)' }} />
                    <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>No constraints found</p>
                  </div>
                ) : (
                  filtered.map((c) => {
                    const Icon = statusIcons[c.status] || AlertTriangle;
                    return (
                      <div key={c.id} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                        <div className="flex items-start gap-4">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${priorityColors[c.priority]}15` }}>
                            <Icon size={16} style={{ color: priorityColors[c.priority] }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.title}</h4>
                              <span className="text-[9px] uppercase font-medium px-1.5 py-0.5 rounded" style={{ background: `${priorityColors[c.priority]}15`, color: priorityColors[c.priority] }}>{c.priority}</span>
                              {c.source === 'auto-detected' && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,63,0.1)', color: 'var(--color-purple)' }}>AI Detected</span>
                              )}
                            </div>
                            {c.description && (
                              <p className="text-[11px] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{c.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              <span className="px-2 py-0.5 rounded-md" style={{ background: 'var(--color-bg-input)' }}>{categoryLabels[c.category] || c.category}</span>
                              {c.tradeCode && <span>{c.tradeCode}</span>}
                              {c.zoneName && <span>{c.zoneName}</span>}
                              {c.assignedTo && <span>Assigned: {c.assignedTo}</span>}
                              {c.dueDate && <span style={{ fontFamily: 'var(--font-mono)' }}>Due: {c.dueDate}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {c.status !== 'resolved' && (
                              <>
                                {c.status === 'open' && (
                                  <button onClick={() => handleStatusChange(c.id, 'in_progress')}
                                    className="text-[9px] font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-80"
                                    style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}>
                                    Start
                                  </button>
                                )}
                                <button onClick={() => setResolvingId(c.id)}
                                  className="text-[9px] font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-80"
                                  style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
                                  <Check size={10} className="inline mr-0.5" />Resolve
                                </button>
                              </>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-md"
                              style={{
                                background: c.status === 'open' ? 'rgba(239,68,68,0.1)' : c.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                color: c.status === 'open' ? 'var(--color-danger)' : c.status === 'resolved' ? 'var(--color-success)' : 'var(--color-warning)',
                              }}>
                              {c.status === 'open' ? 'Open' : c.status === 'resolved' ? 'Resolved' : 'In Progress'}
                            </span>
                          </div>
                        </div>

                        {/* Resolve form */}
                        <AnimatePresence>
                          {resolvingId === c.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t overflow-hidden"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-secondary)' }}>Resolution Notes</label>
                                  <input value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="How was this resolved?"
                                    className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                                    style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} autoFocus />
                                </div>
                                <button onClick={() => handleResolve(c.id)}
                                  className="text-[11px] font-semibold px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                                  style={{ background: 'var(--color-success)' }}>
                                  Confirm
                                </button>
                                <button onClick={() => { setResolvingId(null); setResolutionNotes(''); }}
                                  className="text-[11px] font-semibold px-3 py-2 rounded-lg border transition-opacity hover:opacity-80"
                                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* CRR Progress Bar */}
            <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Constraint Removal Rate (CRR)</span>
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>{stats.crr}%</span>
              </div>
              <div className="h-2 rounded-full w-full" style={{ background: 'var(--color-bg-input)' }}>
                <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${stats.crr}%`, background: stats.crr >= 80 ? 'var(--color-success)' : stats.crr >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ACTIVITY RELATIONSHIPS TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'relationships' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Relationships', value: displayRelationships.length, color: 'var(--color-purple)' },
                { label: 'Mandatory (Hard)', value: displayRelationships.filter((r) => r.mandatory).length, color: 'var(--color-danger)' },
                { label: 'Preferred (Soft)', value: displayRelationships.filter((r) => !r.mandatory).length, color: 'var(--color-warning)' },
                { label: 'Disciplines', value: groupedRelationships.size, color: 'var(--color-cyan)' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                  <div className="text-2xl font-medium" style={{ fontFamily: 'var(--font-display)', color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Filter bar + Sync button */}
            <div className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
                {disciplineList.map((d) => (
                  <button key={d} onClick={() => setRelFilterDiscipline(d)}
                    className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all"
                    style={{ background: relFilterDiscipline === d ? 'var(--color-purple)' : 'transparent', color: relFilterDiscipline === d ? 'white' : 'var(--color-text-secondary)' }}>
                    {d === 'all' ? 'All' : d}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {relationships.length === 0 && (
                  <span className="text-[9px] font-semibold px-2 py-1 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-purple)' }}>
                    Template Data
                  </span>
                )}
                <button onClick={fetchRelationships} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" title="Refresh">
                  <RefreshCw size={14} style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <button
                  onClick={handleSyncTemplates}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-purple)' }}
                >
                  {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {isSyncing ? 'Syncing...' : 'Sync from Templates'}
                </button>
              </div>
            </div>

            {/* Relationship type legend */}
            <div className="flex items-center gap-4 px-2">
              {REL_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${relTypeColors[t]}15`, color: relTypeColors[t], fontFamily: 'var(--font-mono)' }}>{t}</span>
                  <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{relTypeLabels[t]}</span>
                </div>
              ))}
            </div>

            {/* Relationship list */}
            {relLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-purple)' }} />
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                        Predecessor
                      </th>
                      <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-2 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', width: 40 }}>
                      </th>
                      <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                        Successor
                      </th>
                      <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-3 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', width: 70 }}>
                        Type
                      </th>
                      <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-3 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', width: 70 }}>
                        Lag
                      </th>
                      <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-3 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', width: 80 }}>
                        Logic
                      </th>
                      <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                        Description
                      </th>
                      <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-3 py-3 border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', width: 80 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRelationships.map((r) => {
                      const isEditing = editingRelId === r.id;
                      const isFromDb = !r.id.startsWith('tmpl-');
                      return (
                        <tr key={r.id} className="group hover:opacity-95 transition-opacity" style={{ background: isEditing ? 'var(--color-bg-input)' : undefined }}>
                          {/* Predecessor */}
                          <td className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: r.predecessorTradeColor }} />
                              <div>
                                <div className="text-[11px] font-medium" style={{ color: 'var(--color-text)' }}>{r.predecessorTradeName}</div>
                                <div className="text-[9px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.predecessorTradeCode}</div>
                              </div>
                            </div>
                          </td>
                          {/* Arrow */}
                          <td className="text-center border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} className="mx-auto" />
                          </td>
                          {/* Successor */}
                          <td className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: r.successorTradeColor }} />
                              <div>
                                <div className="text-[11px] font-medium" style={{ color: 'var(--color-text)' }}>{r.successorTradeName}</div>
                                <div className="text-[9px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.successorTradeCode}</div>
                              </div>
                            </div>
                          </td>
                          {/* Type */}
                          <td className="text-center px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            {isEditing ? (
                              <select
                                value={editRelData.type}
                                onChange={(e) => setEditRelData((p) => ({ ...p, type: e.target.value }))}
                                className="text-[10px] font-bold px-2 py-1 rounded border outline-none"
                                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
                              >
                                {REL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: `${relTypeColors[r.type]}15`, color: relTypeColors[r.type], fontFamily: 'var(--font-mono)' }}>
                                {r.type}
                              </span>
                            )}
                          </td>
                          {/* Lag */}
                          <td className="text-center px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            {isEditing ? (
                              <input
                                type="number"
                                min={-10}
                                max={30}
                                value={editRelData.lagDays}
                                onChange={(e) => setEditRelData((p) => ({ ...p, lagDays: parseInt(e.target.value) || 0 }))}
                                className="w-14 text-center text-[10px] font-medium px-1 py-1 rounded border outline-none"
                                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
                              />
                            ) : (
                              <span className="text-[10px] font-medium" style={{
                                color: r.lagDays > 0 ? 'var(--color-warning)' : r.lagDays < 0 ? 'var(--color-success)' : 'var(--color-text-muted)',
                                fontFamily: 'var(--font-mono)',
                              }}>
                                {r.lagDays > 0 ? `+${r.lagDays}d` : r.lagDays < 0 ? `${r.lagDays}d` : '0d'}
                              </span>
                            )}
                          </td>
                          {/* Logic */}
                          <td className="text-center px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            {isEditing ? (
                              <button
                                onClick={() => setEditRelData((p) => ({ ...p, mandatory: !p.mandatory }))}
                                className="text-[9px] font-semibold px-2 py-1 rounded transition-all"
                                style={{
                                  background: editRelData.mandatory ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                  color: editRelData.mandatory ? 'var(--color-danger)' : 'var(--color-warning)',
                                }}
                              >
                                {editRelData.mandatory ? 'Hard' : 'Soft'}
                              </button>
                            ) : (
                              <span className="text-[9px] font-semibold px-2 py-1 rounded" style={{
                                background: r.mandatory ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                                color: r.mandatory ? 'var(--color-danger)' : 'var(--color-warning)',
                              }}>
                                {r.mandatory ? 'Hard' : 'Soft'}
                              </span>
                            )}
                          </td>
                          {/* Description */}
                          <td className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-[10px] line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{r.description}</span>
                          </td>
                          {/* Actions */}
                          <td className="text-center px-3 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => saveRelEdit(r.id)} className="p-1 rounded hover:opacity-70" title="Save">
                                  <Save size={13} style={{ color: 'var(--color-success)' }} />
                                </button>
                                <button onClick={() => setEditingRelId(null)} className="p-1 rounded hover:opacity-70" title="Cancel">
                                  <X size={13} style={{ color: 'var(--color-text-muted)' }} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditRel(r)} className="p-1 rounded hover:opacity-70" title="Edit">
                                  <Pencil size={12} style={{ color: 'var(--color-accent)' }} />
                                </button>
                                {isFromDb && (
                                  <button onClick={() => deleteRelationship(r.id)} className="p-1 rounded hover:opacity-70" title="Delete">
                                    <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRelationships.length === 0 && (
                  <div className="text-center py-12">
                    <Link2 size={32} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                    <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>No relationships found</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Click &quot;Sync from Templates&quot; to apply template relationships to this project.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Activity Relationships */}
            {templateRelationships.subActivities.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[12px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--color-text-muted)' }}>
                  Sub-Activity Relationships (Internal Wagon Chains)
                </h3>
                {templateRelationships.subActivities.map((sa) => (
                  <div key={sa.wagonCode} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 size={12} style={{ color: 'var(--color-purple)' }} />
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>{sa.wagonCode}</span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {sa.relationships.length} relationships
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sa.relationships.map((r: ActivityRelationshipTemplate, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px]" style={{ background: 'var(--color-bg-input)' }}>
                          <span className="font-medium" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{r.predecessorCode}</span>
                          <ArrowRight size={10} style={{ color: 'var(--color-text-muted)' }} />
                          <span className="font-medium" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>{r.successorCode}</span>
                          <span className="font-bold px-1 py-0.5 rounded" style={{ background: `${relTypeColors[r.type]}15`, color: relTypeColors[r.type], fontFamily: 'var(--font-mono)' }}>{r.type}</span>
                          {r.lagDays !== 0 && (
                            <span className="font-medium" style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>+{r.lagDays}d</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
