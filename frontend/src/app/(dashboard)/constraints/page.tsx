'use client';

import TopBar from '@/components/layout/TopBar';
import { DEMO_CONSTRAINTS } from '@/lib/mockData';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { AlertTriangle, Clock, CheckCircle2, Filter, RefreshCw, Loader2, Plus, X, Check } from 'lucide-react';
import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const CATEGORIES = ['material', 'labor', 'design', 'predecessor', 'equipment', 'space', 'permit', 'information'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

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

export default function ConstraintsPage() {
  const formId = useId();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const token = useAuthStore((s) => s.token);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [constraints, setConstraints] = useState<ConstraintItem[]>(mapDemoToConstraints());
  const [stats, setStats] = useState<Stats>(computeDemoStats());
  const [loading, setLoading] = useState(true);
  const [usingApi, setUsingApi] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

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

  const filtered = usingApi
    ? constraints
    : filterStatus === 'all'
      ? constraints
      : constraints.filter((c) => c.status === filterStatus);

  return (
    <>
      <TopBar title="Constraints" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
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
                    <label htmlFor={`${formId}-title`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Title</label>
                    <input id={`${formId}-title`} value={newConstraint.title}
                      onChange={(e) => setNewConstraint((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., MEP material delivery delayed"
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} autoFocus />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-cat`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Category</label>
                    <select id={`${formId}-cat`} value={newConstraint.category}
                      onChange={(e) => setNewConstraint((p) => ({ ...p, category: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${formId}-pri`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Priority</label>
                    <select id={`${formId}-pri`} value={newConstraint.priority}
                      onChange={(e) => setNewConstraint((p) => ({ ...p, priority: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${formId}-due`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Due Date</label>
                    <input id={`${formId}-due`} type="date" value={newConstraint.dueDate}
                      onChange={(e) => setNewConstraint((p) => ({ ...p, dueDate: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-zone`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Zone</label>
                    <input id={`${formId}-zone`} value={newConstraint.zoneId}
                      onChange={(e) => setNewConstraint((p) => ({ ...p, zoneId: e.target.value }))}
                      placeholder="e.g., Zone A"
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-trade`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Trade</label>
                    <input id={`${formId}-trade`} value={newConstraint.tradeId}
                      onChange={(e) => setNewConstraint((p) => ({ ...p, tradeId: e.target.value }))}
                      placeholder="e.g., MEP"
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-assigned`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Assigned To</label>
                    <input id={`${formId}-assigned`} value={newConstraint.assignedTo}
                      onChange={(e) => setNewConstraint((p) => ({ ...p, assignedTo: e.target.value }))}
                      placeholder="e.g., M. Yilmaz"
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label htmlFor={`${formId}-desc`} className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Description</label>
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
                              <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>Resolution Notes</label>
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
      </div>
    </>
  );
}
