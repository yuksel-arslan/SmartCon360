'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Shield, Loader2, Plus, X, Trash2, Edit3, Search,
  BarChart3, Target, Activity, AlertCircle, DollarSign, Clock,
} from 'lucide-react';
import { ModulePageHeader, ContractPolicyBanner } from '@/components/modules';
import { useRiskStore } from '@/stores/riskStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Risk } from '@/stores/riskStore';

type RiskTab = 'overview' | 'register' | 'heatmap';

const tabs: { id: RiskTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'register', label: 'Risk Register', icon: AlertTriangle },
  { id: 'heatmap', label: 'Heat Map', icon: Target },
];

const RISK_POLICY_LABELS: Record<string, string> = {
  'allocation.model': 'Risk Allocation',
  'contingency.default_pct': 'Contingency %',
};

const CATEGORIES = ['schedule', 'cost', 'quality', 'safety', 'scope', 'resource', 'external', 'technical'];
const STATUSES = ['open', 'mitigating', 'monitoring', 'closed', 'occurred'];
const RESPONSES = ['avoid', 'mitigate', 'transfer', 'accept'];

function capitalize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtCurrency(n?: number | string | null): string {
  if (n == null) return '--';
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return '--';
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function riskScoreColor(score: number): string {
  if (score >= 20) return 'rgb(239,68,68)';
  if (score >= 12) return 'rgb(234,179,8)';
  if (score >= 6) return 'rgb(59,130,246)';
  return 'rgb(34,197,94)';
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    open: { bg: 'rgba(234,179,8,0.1)', text: 'rgb(202,138,4)' },
    mitigating: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    monitoring: { bg: 'rgba(168,85,247,0.1)', text: 'rgb(168,85,247)' },
    closed: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    occurred: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)' },
  };
  const s = map[status] || { bg: 'rgba(156,163,175,0.1)', text: 'rgb(156,163,175)' };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.text }}>
      {capitalize(status)}
    </span>
  );
}

export default function RiskPage() {
  const [activeTab, setActiveTab] = useState<RiskTab>('overview');
  const { activeProjectId } = useProjectStore();
  const { loading, error, initialized, fetchAll } = useRiskStore();

  const pid = activeProjectId || '';

  const loadData = useCallback(async () => {
    if (pid) await fetchAll(pid);
  }, [pid, fetchAll]);

  useEffect(() => {
    if (pid && !initialized) loadData();
  }, [pid, initialized, loadData]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
      <ModulePageHeader moduleId="risk" />
      <ContractPolicyBanner module="risk_radar" policyLabels={RISK_POLICY_LABELS} />

      {error && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-3 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

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
          {activeTab === 'register' && <RegisterTab projectId={pid} />}
          {activeTab === 'heatmap' && <HeatMapTab />}
        </>
      )}
    </div>
  );
}

function OverviewTab() {
  const { summary } = useRiskStore();

  const kpis = [
    { label: 'Total Risks', value: summary?.totalRisks ?? 0, icon: AlertTriangle, color: 'var(--color-accent)', desc: `${summary?.openRisks ?? 0} open` },
    { label: 'High Risks', value: summary?.highRisks ?? 0, icon: AlertTriangle, color: 'var(--color-warning)', desc: `Score >= 12` },
    { label: 'Critical Risks', value: summary?.criticalRisks ?? 0, icon: Shield, color: 'var(--color-danger)', desc: 'Score >= 20' },
    { label: 'Cost Exposure', value: `$${fmtCurrency(summary?.totalCostExposure)}`, icon: DollarSign, color: 'rgb(239,68,68)', desc: 'Open risks' },
    { label: 'Pending Actions', value: summary?.pendingActions ?? 0, icon: Activity, color: 'var(--color-warning)', desc: `${summary?.overdueActions ?? 0} overdue` },
    { label: 'Risk Model', value: capitalize(summary?.allocationModel || 'transferred'), icon: Shield, color: 'var(--color-accent)', desc: `${summary?.contingencyDefaultPct ?? 5}% contingency` },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
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

function RegisterTab({ projectId }: { projectId: string }) {
  const { risks, createRisk, updateRisk, deleteRisk } = useRiskStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', category: CATEGORIES[0], probability: 3, impact: 3,
    owner: '', response: 'mitigate', mitigationPlan: '', costImpact: 0, timeImpactDays: 0,
  });

  const filtered = risks.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.riskNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editingId) {
      await updateRisk(editingId, form);
    } else {
      await createRisk({ ...form, projectId, createdBy: 'current-user' });
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', description: '', category: CATEGORIES[0], probability: 3, impact: 3, owner: '', response: 'mitigate', mitigationPlan: '', costImpact: 0, timeImpactDays: 0 });
  };

  const handleEdit = (r: Risk) => {
    setForm({
      title: r.title, description: r.description || '', category: r.category,
      probability: r.probability, impact: r.impact, owner: r.owner || '',
      response: r.response, mitigationPlan: r.mitigationPlan || '',
      costImpact: r.costImpact, timeImpactDays: r.timeImpactDays,
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs rounded-lg border px-3 py-1.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-full" style={{ color: 'var(--color-text)' }} />
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ background: 'var(--color-accent)' }}>
          <Plus size={14} /> Add Risk
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{editingId ? 'Edit Risk' : 'New Risk'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={16} style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs w-full" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
            </select>
            <select value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
              {RESPONSES.map((r) => <option key={r} value={r}>{capitalize(r)}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Prob</label>
              <input type="range" min={1} max={5} value={form.probability} onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) })} className="flex-1" />
              <span className="text-xs font-bold w-4" style={{ color: riskScoreColor(form.probability * form.impact) }}>{form.probability}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Impact</label>
              <input type="range" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: parseInt(e.target.value) })} className="flex-1" />
              <span className="text-xs font-bold w-4" style={{ color: riskScoreColor(form.probability * form.impact) }}>{form.impact}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${riskScoreColor(form.probability * form.impact)}15` }}>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Score:</span>
              <span className="text-sm font-bold" style={{ color: riskScoreColor(form.probability * form.impact) }}>{form.probability * form.impact}</span>
            </div>
            <input placeholder="Risk Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <input type="number" placeholder="Cost Impact" value={form.costImpact || ''} onChange={(e) => setForm({ ...form, costImpact: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
            <input type="number" placeholder="Time Impact (days)" value={form.timeImpactDays || ''} onChange={(e) => setForm({ ...form, timeImpactDays: parseInt(e.target.value) || 0 })}
              className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
          </div>
          <textarea placeholder="Mitigation Plan" value={form.mitigationPlan} onChange={(e) => setForm({ ...form, mitigationPlan: e.target.value })} rows={2}
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
              {['Risk #', 'Title', 'Category', 'P', 'I', 'Score', 'Status', 'Response', 'Owner', 'Actions'].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No risks found</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--color-accent)' }}>{r.riskNumber}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text)' }}>{r.title}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(r.category)}</td>
                <td className="px-3 py-2 font-mono">{r.probability}</td>
                <td className="px-3 py-2 font-mono">{r.impact}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${riskScoreColor(r.riskScore)}15`, color: riskScoreColor(r.riskScore) }}>
                    {r.riskScore}
                  </span>
                </td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{capitalize(r.response)}</td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>{r.owner || '--'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(r)} className="p-1 rounded hover:bg-black/5"><Edit3 size={12} style={{ color: 'var(--color-text-muted)' }} /></button>
                    <button onClick={() => deleteRisk(r.id)} className="p-1 rounded hover:bg-black/5"><Trash2 size={12} style={{ color: 'var(--color-danger)' }} /></button>
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

function HeatMapTab() {
  const { summary, risks } = useRiskStore();
  const heatMap = summary?.heatMap || {};

  const labels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

  function getCellColor(prob: number, impact: number): string {
    const score = prob * impact;
    if (score >= 20) return 'rgba(239,68,68,0.7)';
    if (score >= 15) return 'rgba(239,68,68,0.4)';
    if (score >= 10) return 'rgba(234,179,8,0.5)';
    if (score >= 5) return 'rgba(234,179,8,0.25)';
    return 'rgba(34,197,94,0.2)';
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-6" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Risk Heat Map (5x5 Matrix)</h3>

        <div className="flex gap-4">
          {/* Y-axis label */}
          <div className="flex flex-col justify-center items-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>PROBABILITY</span>
          </div>

          <div className="flex-1">
            {/* Grid rows (probability 5 to 1, top to bottom) */}
            {[5, 4, 3, 2, 1].map((prob) => (
              <div key={prob} className="flex items-center gap-1 mb-1">
                <span className="text-[10px] w-16 text-right pr-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  {labels[prob - 1]}
                </span>
                {[1, 2, 3, 4, 5].map((impact) => {
                  const count = heatMap[`${prob}-${impact}`] || 0;
                  return (
                    <div key={impact}
                      className="flex-1 aspect-square rounded-lg flex items-center justify-center min-h-[48px] relative"
                      style={{ background: getCellColor(prob, impact), border: '1px solid var(--color-border)' }}>
                      {count > 0 && (
                        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{count}</span>
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[8px] opacity-50" style={{ color: 'var(--color-text-muted)' }}>
                        {prob * impact}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            {/* X-axis labels */}
            <div className="flex gap-1 ml-[68px] mt-1">
              {labels.map((l) => (
                <div key={l} className="flex-1 text-center text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{l}</div>
              ))}
            </div>
            <div className="text-center mt-1">
              <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>IMPACT</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Legend:</span>
          {[
            { label: 'Low (1-4)', color: 'rgba(34,197,94,0.3)' },
            { label: 'Medium (5-9)', color: 'rgba(234,179,8,0.35)' },
            { label: 'High (10-19)', color: 'rgba(234,179,8,0.6)' },
            { label: 'Critical (20-25)', color: 'rgba(239,68,68,0.6)' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: l.color }} />
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top risks by score */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Top Risks by Score</h3>
        <div className="space-y-2">
          {risks.filter((r) => r.status !== 'closed').sort((a, b) => b.riskScore - a.riskScore).slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg)' }}>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${riskScoreColor(r.riskScore)}15`, color: riskScoreColor(r.riskScore) }}>
                {r.riskScore}
              </span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--color-accent)' }}>{r.riskNumber}</span>
              <span className="text-xs flex-1" style={{ color: 'var(--color-text)' }}>{r.title}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{capitalize(r.category)}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
          {risks.filter((r) => r.status !== 'closed').length === 0 && (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>No open risks</div>
          )}
        </div>
      </div>
    </div>
  );
}
