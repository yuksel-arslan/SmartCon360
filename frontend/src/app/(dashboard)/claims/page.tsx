'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, AlertTriangle, Clock, DollarSign, Shield, Loader2,
  Plus, X, Trash2, Edit3, Eye, Search,
  BarChart3, Scale, CalendarClock, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { ModulePageHeader, ContractPolicyBanner } from '@/components/modules';
import { useClaimsStore } from '@/stores/claimsStore';
import { useProjectStore } from '@/stores/projectStore';
import type { ChangeOrder, Claim, DelayEvent } from '@/stores/claimsStore';

// ── Types ────────────────────────────────────────────────

type ClaimsTab = 'overview' | 'change-orders' | 'claims' | 'delay-events';

const tabs: { id: ClaimsTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'change-orders', label: 'Change Orders', icon: FileText },
  { id: 'claims', label: 'Claims Register', icon: Scale },
  { id: 'delay-events', label: 'Delay Events', icon: CalendarClock },
];

const CLAIM_POLICY_LABELS: Record<string, string> = {
  'change_order.type': 'Change Order Type',
  'claim.basis': 'Claim Basis',
  'defects_liability.months': 'Defects Liability',
  'dispute.procedure': 'Dispute Procedure',
};

const CO_TYPES = ['scope_variation', 'new_rate_item', 'cost_directive', 'unit_allocation_change', 'daywork'];
const CO_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn'];
const CLAIM_TYPES = ['extension_of_time', 'additional_cost', 'disruption', 'acceleration', 'other'];
const CLAIM_BASES = ['quantity_variance', 'scope_change', 'cost_substantiation', 'gmp_exceedance', 'delay'];
const CLAIM_STATUSES = ['draft', 'notified', 'submitted', 'under_review', 'negotiation', 'resolved', 'rejected', 'arbitration'];
const DELAY_CATEGORIES = ['employer_risk', 'contractor_risk', 'neutral', 'concurrent'];
const DELAY_STATUSES = ['identified', 'analysed', 'mitigated', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const INITIATED_BY = ['owner', 'contractor', 'engineer', 'subcontractor'];

// ── Helpers ──────────────────────────────────────────────

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

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'rgba(156,163,175,0.1)', text: 'rgb(156,163,175)' },
    submitted: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    notified: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    under_review: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    negotiation: { bg: 'rgba(168,85,247,0.1)', text: 'rgb(168,85,247)' },
    approved: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    resolved: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    rejected: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    withdrawn: { bg: 'rgba(156,163,175,0.1)', text: 'rgb(156,163,175)' },
    arbitration: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
    identified: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    analysed: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    mitigated: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    closed: { bg: 'rgba(156,163,175,0.1)', text: 'rgb(156,163,175)' },
  };
  const s = map[status] || { bg: 'rgba(156,163,175,0.1)', text: 'rgb(156,163,175)' };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.text }}>
      {capitalize(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: 'rgb(34,197,94)', medium: 'rgb(59,130,246)', high: 'rgb(234,179,8)', critical: 'rgb(239,68,68)',
  };
  return (
    <span className="text-[10px] font-semibold" style={{ color: map[priority] || 'var(--color-text-muted)' }}>
      {capitalize(priority)}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────

export default function ClaimsPage() {
  const [activeTab, setActiveTab] = useState<ClaimsTab>('overview');
  const { activeProjectId } = useProjectStore();
  const { loading, error, initialized, fetchAll } = useClaimsStore();

  const pid = activeProjectId || '';

  const loadData = useCallback(async () => {
    if (pid) await fetchAll(pid);
  }, [pid, fetchAll]);

  useEffect(() => {
    if (pid && !initialized) loadData();
  }, [pid, initialized, loadData]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
      <ModulePageHeader moduleId="claims" />
      <ContractPolicyBanner module="claim_shield" policyLabels={CLAIM_POLICY_LABELS} />

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
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading && !initialized ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-accent)' }} />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'change-orders' && <ChangeOrdersTab projectId={pid} />}
          {activeTab === 'claims' && <ClaimsRegisterTab projectId={pid} />}
          {activeTab === 'delay-events' && <DelayEventsTab projectId={pid} />}
        </>
      )}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────

function OverviewTab() {
  const { summary } = useClaimsStore();

  const kpis = [
    {
      label: 'Change Orders',
      value: summary?.totalChangeOrders ?? 0,
      icon: FileText,
      color: 'var(--color-accent)',
      desc: `${summary?.pendingChangeOrders ?? 0} pending`,
    },
    {
      label: 'Open Claims',
      value: summary?.openClaims ?? 0,
      icon: Scale,
      color: (summary?.openClaims ?? 0) > 5 ? 'var(--color-danger)' : 'var(--color-warning)',
      desc: `${summary?.resolvedClaims ?? 0} resolved`,
    },
    {
      label: 'Approved CO Value',
      value: `$${fmtCurrency(summary?.approvedCostImpact)}`,
      icon: DollarSign,
      color: 'var(--color-success)',
      desc: 'Approved change orders',
    },
    {
      label: 'Amount Claimed',
      value: `$${fmtCurrency(summary?.totalAmountClaimed)}`,
      icon: DollarSign,
      color: 'var(--color-danger)',
      desc: `$${fmtCurrency(summary?.totalAmountAwarded)} awarded`,
    },
    {
      label: 'Delay Events',
      value: summary?.totalDelayEvents ?? 0,
      icon: CalendarClock,
      color: 'var(--color-warning)',
      desc: `${summary?.criticalPathDelays ?? 0} on critical path`,
    },
    {
      label: 'Total Delay Days',
      value: summary?.totalDelayDays ?? 0,
      icon: Clock,
      color: (summary?.totalDelayDays ?? 0) > 30 ? 'var(--color-danger)' : 'var(--color-warning)',
      desc: 'Cumulative delay impact',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <kpi.icon size={16} style={{ color: kpi.color }} />
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</span>
          </div>
          <div className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{kpi.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── Change Orders Tab ────────────────────────────────────

function ChangeOrdersTab({ projectId }: { projectId: string }) {
  const { changeOrders, createChangeOrder, updateChangeOrder, deleteChangeOrder } = useClaimsStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', type: CO_TYPES[0], priority: 'medium',
    initiatedBy: 'contractor', costImpact: 0, timeImpactDays: 0, contractClause: '', notes: '',
  });

  const filtered = changeOrders.filter((co) =>
    co.title.toLowerCase().includes(search.toLowerCase()) ||
    co.coNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editingId) {
      await updateChangeOrder(editingId, form);
    } else {
      await createChangeOrder({ ...form, projectId, createdBy: 'current-user' });
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', description: '', type: CO_TYPES[0], priority: 'medium', initiatedBy: 'contractor', costImpact: 0, timeImpactDays: 0, contractClause: '', notes: '' });
  };

  const handleEdit = (co: ChangeOrder) => {
    setForm({
      title: co.title, description: co.description || '', type: co.type, priority: co.priority,
      initiatedBy: co.initiatedBy, costImpact: co.costImpact, timeImpactDays: co.timeImpactDays,
      contractClause: co.contractClause || '', notes: co.notes || '',
    });
    setEditingId(co.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs rounded-lg border px-3 py-1.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search change orders..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-full" style={{ color: 'var(--color-text)' }} />
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: 'var(--color-accent)' }}>
          <Plus size={14} /> Add CO
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editingId ? 'Edit Change Order' : 'New Change Order'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={16} style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs w-full" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {CO_TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
            </select>
            <select value={form.initiatedBy} onChange={(e) => setForm({ ...form, initiatedBy: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {INITIATED_BY.map((i) => <option key={i} value={i}>{capitalize(i)}</option>)}
            </select>
            <input type="number" placeholder="Cost Impact" value={form.costImpact || ''} onChange={(e) => setForm({ ...form, costImpact: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <input type="number" placeholder="Time Impact (days)" value={form.timeImpactDays || ''} onChange={(e) => setForm({ ...form, timeImpactDays: parseInt(e.target.value) || 0 })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
            className="rounded-lg border px-3 py-2 text-xs w-full" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--color-accent)' }}>
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--color-bg-card)' }}>
              {['CO #', 'Title', 'Type', 'Priority', 'Status', 'Cost Impact', 'Time (days)', 'Initiated By', 'Actions'].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No change orders found</td></tr>
            ) : filtered.map((co) => (
              <tr key={co.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--color-accent)' }}>{co.coNumber}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text)' }}>{co.title}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(co.type)}</td>
                <td className="px-3 py-2"><PriorityBadge priority={co.priority} /></td>
                <td className="px-3 py-2"><StatusBadge status={co.status} /></td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text)' }}>${fmtCurrency(co.costImpact)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text)' }}>{co.timeImpactDays}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(co.initiatedBy)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(co)} className="p-1 rounded hover:bg-black/5"><Edit3 size={12} style={{ color: 'var(--color-text-muted)' }} /></button>
                    <button onClick={() => deleteChangeOrder(co.id)} className="p-1 rounded hover:bg-black/5"><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Claims Register Tab ──────────────────────────────────

function ClaimsRegisterTab({ projectId }: { projectId: string }) {
  const { claims, createClaim, updateClaim, deleteClaim } = useClaimsStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', type: CLAIM_TYPES[0], basis: CLAIM_BASES[0], priority: 'medium',
    claimedBy: 'contractor', amountClaimed: 0, daysClaimed: 0, contractClause: '', notes: '',
  });

  const filtered = claims.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.claimNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editingId) {
      await updateClaim(editingId, form);
    } else {
      await createClaim({ ...form, projectId, createdBy: 'current-user' });
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', description: '', type: CLAIM_TYPES[0], basis: CLAIM_BASES[0], priority: 'medium', claimedBy: 'contractor', amountClaimed: 0, daysClaimed: 0, contractClause: '', notes: '' });
  };

  const handleEdit = (c: Claim) => {
    setForm({
      title: c.title, description: c.description || '', type: c.type, basis: c.basis, priority: c.priority,
      claimedBy: c.claimedBy, amountClaimed: c.amountClaimed, daysClaimed: c.daysClaimed,
      contractClause: c.contractClause || '', notes: c.notes || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs rounded-lg border px-3 py-1.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search claims..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-full" style={{ color: 'var(--color-text)' }} />
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: 'var(--color-accent)' }}>
          <Plus size={14} /> Add Claim
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editingId ? 'Edit Claim' : 'New Claim'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={16} style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs w-full" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {CLAIM_TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
            </select>
            <select value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {CLAIM_BASES.map((b) => <option key={b} value={b}>{capitalize(b)}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
            </select>
            <input type="number" placeholder="Amount Claimed" value={form.amountClaimed || ''} onChange={(e) => setForm({ ...form, amountClaimed: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <input type="number" placeholder="Days Claimed" value={form.daysClaimed || ''} onChange={(e) => setForm({ ...form, daysClaimed: parseInt(e.target.value) || 0 })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
            className="rounded-lg border px-3 py-2 text-xs w-full" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--color-accent)' }}>
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--color-bg-card)' }}>
              {['Claim #', 'Title', 'Type', 'Basis', 'Status', 'Amount Claimed', 'Days', 'Priority', 'Actions'].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No claims found</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--color-accent)' }}>{c.claimNumber}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text)' }}>{c.title}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(c.type)}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(c.basis)}</td>
                <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-danger)' }}>${fmtCurrency(c.amountClaimed)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text)' }}>{c.daysClaimed}</td>
                <td className="px-3 py-2"><PriorityBadge priority={c.priority} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(c)} className="p-1 rounded hover:bg-black/5"><Edit3 size={12} style={{ color: 'var(--color-text-muted)' }} /></button>
                    <button onClick={() => deleteClaim(c.id)} className="p-1 rounded hover:bg-black/5"><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Delay Events Tab ─────────────────────────────────────

function DelayEventsTab({ projectId }: { projectId: string }) {
  const { delayEvents, createDelayEvent, updateDelayEvent, deleteDelayEvent } = useClaimsStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', category: DELAY_CATEGORIES[0], responsibleParty: 'contractor',
    delayDays: 0, startDate: '', isCriticalPath: false, mitigationAction: '', notes: '',
  });

  const filtered = delayEvents.filter((de) =>
    de.title.toLowerCase().includes(search.toLowerCase()) ||
    de.eventNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.startDate) return;
    if (editingId) {
      await updateDelayEvent(editingId, form);
    } else {
      await createDelayEvent({ ...form, projectId, createdBy: 'current-user' });
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', description: '', category: DELAY_CATEGORIES[0], responsibleParty: 'contractor', delayDays: 0, startDate: '', isCriticalPath: false, mitigationAction: '', notes: '' });
  };

  const handleEdit = (de: DelayEvent) => {
    setForm({
      title: de.title, description: de.description || '', category: de.category,
      responsibleParty: de.responsibleParty, delayDays: de.delayDays,
      startDate: de.startDate?.split('T')[0] || '', isCriticalPath: de.isCriticalPath,
      mitigationAction: de.mitigationAction || '', notes: de.notes || '',
    });
    setEditingId(de.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs rounded-lg border px-3 py-1.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search delay events..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-full" style={{ color: 'var(--color-text)' }} />
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: 'var(--color-accent)' }}>
          <Plus size={14} /> Add Delay Event
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {editingId ? 'Edit Delay Event' : 'New Delay Event'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={16} style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs w-full" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {DELAY_CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
            </select>
            <select value={form.responsibleParty} onChange={(e) => setForm({ ...form, responsibleParty: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {['owner', 'contractor', 'subcontractor', 'force_majeure', 'shared'].map((r) => <option key={r} value={r}>{capitalize(r)}</option>)}
            </select>
            <input type="number" placeholder="Delay Days" value={form.delayDays || ''} onChange={(e) => setForm({ ...form, delayDays: parseInt(e.target.value) || 0 })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <input type="date" placeholder="Start Date *" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <label className="flex items-center gap-2 text-xs px-3 py-2" style={{ color: 'var(--color-text)' }}>
              <input type="checkbox" checked={form.isCriticalPath} onChange={(e) => setForm({ ...form, isCriticalPath: e.target.checked })} />
              Critical Path Impact
            </label>
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
            className="rounded-lg border px-3 py-2 text-xs w-full" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--color-accent)' }}>
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--color-bg-card)' }}>
              {['Event #', 'Title', 'Category', 'Responsible', 'Status', 'Delay Days', 'Critical Path', 'Start Date', 'Actions'].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No delay events found</td></tr>
            ) : filtered.map((de) => (
              <tr key={de.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--color-accent)' }}>{de.eventNumber}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text)' }}>{de.title}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(de.category)}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(de.responsibleParty)}</td>
                <td className="px-3 py-2"><StatusBadge status={de.status} /></td>
                <td className="px-3 py-2 font-mono font-semibold" style={{ color: de.delayDays > 7 ? 'var(--color-danger)' : 'var(--color-text)' }}>{de.delayDays}</td>
                <td className="px-3 py-2">
                  {de.isCriticalPath ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}>Yes</span>
                  ) : <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>No</span>}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(de.startDate)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(de)} className="p-1 rounded hover:bg-black/5"><Edit3 size={12} style={{ color: 'var(--color-text-muted)' }} /></button>
                    <button onClick={() => deleteDelayEvent(de.id)} className="p-1 rounded hover:bg-black/5"><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
