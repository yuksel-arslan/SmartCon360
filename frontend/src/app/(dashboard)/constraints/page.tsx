'use client';

import TopBar from '@/components/layout/TopBar';
import { DEMO_CONSTRAINTS } from '@/lib/mockData';
import { AlertTriangle, Clock, CheckCircle2, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface ConstraintItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  tradeCode?: string;
  zoneName?: string;
  dueDate?: string;
  source?: string;
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  crr: number;
}

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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [constraints, setConstraints] = useState<ConstraintItem[]>(mapDemoToConstraints());
  const [stats, setStats] = useState<Stats>(computeDemoStats());
  const [loading, setLoading] = useState(true);
  const [usingApi, setUsingApi] = useState(false);

  const fetchConstraints = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [constraintsRes, statsRes] = await Promise.all([
        fetch(`/api/v1/constraints?status=${filterStatus}`, { headers }),
        fetch('/api/v1/constraints/stats', { headers }),
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
          tradeCode: c.tradeCode,
          zoneName: c.zoneName,
          dueDate: c.dueDate?.split('T')[0],
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
      // Fallback to demo data
      const demo = mapDemoToConstraints();
      const filtered = filterStatus === 'all' ? demo : demo.filter((c) => c.status === filterStatus);
      setConstraints(filtered);
      setStats(computeDemoStats());
      setUsingApi(false);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

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

        {/* Filter bar */}
        <div className="rounded-xl border p-3 flex items-center justify-between" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
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
          </div>
        </div>

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
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  No constraints found
                </p>
              </div>
            ) : (
              filtered.map((c) => {
                const Icon = statusIcons[c.status] || AlertTriangle;
                return (
                  <div key={c.id} className="rounded-xl border p-4 flex items-start gap-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
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
                      <div className="flex flex-wrap items-center gap-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        <span className="px-2 py-0.5 rounded-md" style={{ background: 'var(--color-bg-input)' }}>{categoryLabels[c.category] || c.category}</span>
                        {c.tradeCode && <span>{c.tradeCode}</span>}
                        {c.zoneName && <span>{c.zoneName}</span>}
                        {c.dueDate && <span style={{ fontFamily: 'var(--font-mono)' }}>Due: {c.dueDate}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-md flex-shrink-0"
                      style={{
                        background: c.status === 'open' ? 'rgba(239,68,68,0.1)' : c.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: c.status === 'open' ? 'var(--color-danger)' : c.status === 'resolved' ? 'var(--color-success)' : 'var(--color-warning)',
                      }}>
                      {c.status === 'open' ? 'Open' : c.status === 'resolved' ? 'Resolved' : 'In Progress'}
                    </span>
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
