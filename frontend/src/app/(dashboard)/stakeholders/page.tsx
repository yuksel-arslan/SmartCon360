'use client';

import { useState, useEffect, useMemo } from 'react';
import { ModulePageHeader, ContractPolicyBanner } from '@/components/modules';
import { useProjectStore } from '@/stores/projectStore';
import { useStakeholderStore, Stakeholder, EngagementAction } from '@/stores/stakeholderStore';

/* ────────────────── helpers ────────────────── */
const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
    inactive: { bg: 'var(--color-bg-hover)', text: 'var(--color-text-muted)' },
    archived: { bg: 'var(--color-bg-hover)', text: 'var(--color-text-muted)' },
    planned: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
    in_progress: { bg: 'rgba(234,179,8,0.15)', text: 'var(--color-warning)' },
    completed: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
    cancelled: { bg: 'rgba(239,68,68,0.15)', text: 'var(--color-danger)' },
  };
  const c = colors[status] || { bg: 'var(--color-bg-hover)', text: 'var(--color-text-secondary)' };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {capitalize(status)}
    </span>
  );
}

function EngagementBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    monitor: { bg: 'var(--color-bg-hover)', text: 'var(--color-text-secondary)' },
    inform: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
    consult: { bg: 'rgba(6,182,212,0.15)', text: 'var(--color-cyan)' },
    collaborate: { bg: 'rgba(168,85,247,0.15)', text: '#A855F7' },
    empower: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
  };
  const c = colors[level] || { bg: 'var(--color-bg-hover)', text: 'var(--color-text-secondary)' };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {capitalize(level)}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-input)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
};

const TABS = ['Overview', 'Stakeholder Register', 'Engagement Actions', 'Influence Map'] as const;
type Tab = (typeof TABS)[number];

export default function StakeholdersPage() {
  const { activeProjectId } = useProjectStore();
  const pid = activeProjectId || '';
  const store = useStakeholderStore();
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (pid) store.fetchAll(pid);
  }, [pid]);

  function Overview() {
    const s = store.summary;
    if (!s) return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No data yet.</p>;
    const kpis: { label: string; value: string | number; accent?: string }[] = [
      { label: 'Total Stakeholders', value: s.totalStakeholders },
      { label: 'Active', value: s.activeStakeholders },
      { label: 'Key Stakeholders', value: s.highInfluenceHighInterest, accent: '#A855F7' },
      { label: 'Total Actions', value: s.totalActions },
      { label: 'Pending Actions', value: s.pendingActions, accent: s.pendingActions > 0 ? '#3B82F6' : undefined },
      { label: 'Overdue Actions', value: s.overdueActions, accent: s.overdueActions > 0 ? 'var(--color-danger)' : undefined },
    ];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{k.label}</p>
              <p className="text-2xl font-bold font-mono" style={{ color: k.accent || 'var(--color-text)' }}>{k.value}</p>
            </div>
          ))}
        </div>
        {Object.keys(s.engagementDistribution).length > 0 && (
          <div className="rounded-xl border p-4" style={cardStyle}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Engagement Distribution</h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(s.engagementDistribution).map(([level, count]) => (
                <div key={level} className="flex items-center gap-2">
                  <EngagementBadge level={level} />
                  <span className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function RegisterTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Stakeholder>>({});
    const filtered = useMemo(() => store.stakeholders.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())), [store.stakeholders, search]);
    const startNew = () => { setForm({ projectId: pid, role: 'contractor', category: 'internal', influence: 3, interest: 3, engagement: 'inform', status: 'active' }); setEditId(null); setShowForm(true); };
    const startEdit = (s: Stakeholder) => { setForm(s); setEditId(s.id); setShowForm(true); };
    const save = async () => { if (editId) await store.updateStakeholder(editId, form); else await store.createStakeholder(form); setShowForm(false); if (pid) store.fetchAll(pid); };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stakeholders..." className="flex-1 rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          <button onClick={startNew} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>+ New Stakeholder</button>
        </div>
        {showForm && (
          <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{editId ? 'Edit Stakeholder' : 'New Stakeholder'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Code *" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <input placeholder="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <input placeholder="Organization" value={form.organization || ''} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <select value={form.role || 'contractor'} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['owner', 'client_rep', 'engineer', 'contractor', 'subcontractor', 'consultant', 'regulator', 'community', 'investor', 'other'].map((r) => (<option key={r} value={r}>{capitalize(r)}</option>))}
              </select>
              <select value={form.category || 'internal'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['internal', 'external', 'regulatory', 'community'].map((c) => (<option key={c} value={c}>{capitalize(c)}</option>))}
              </select>
              <select value={form.engagement || 'inform'} onChange={(e) => setForm({ ...form, engagement: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['monitor', 'inform', 'consult', 'collaborate', 'empower'].map((e) => (<option key={e} value={e}>{capitalize(e)}</option>))}
              </select>
              <div><label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Influence (1-5)</label><input type="range" min={1} max={5} value={form.influence || 3} onChange={(e) => setForm({ ...form, influence: parseInt(e.target.value) })} className="w-full" /><span className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{form.influence || 3}</span></div>
              <div><label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Interest (1-5)</label><input type="range" min={1} max={5} value={form.interest || 3} onChange={(e) => setForm({ ...form, interest: parseInt(e.target.value) })} className="w-full" /><span className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>{form.interest || 3}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>Save</button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>Cancel</button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-bg-secondary)' }}>
              <tr style={{ color: 'var(--color-text-secondary)' }}>
                <th className="px-4 py-3 font-medium text-left">Code</th>
                <th className="px-4 py-3 font-medium text-left">Name</th>
                <th className="px-4 py-3 font-medium text-left">Role</th>
                <th className="px-4 py-3 font-medium text-left">Category</th>
                <th className="px-4 py-3 font-medium text-left">Inf/Int</th>
                <th className="px-4 py-3 font-medium text-left">Engagement</th>
                <th className="px-4 py-3 font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody style={{ background: 'var(--color-bg-card)' }}>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text)' }}>
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3">{s.name}{s.organization ? <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>({s.organization})</span> : ''}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{capitalize(s.role)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{capitalize(s.category)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.influence}/{s.interest}</td>
                  <td className="px-4 py-3"><EngagementBadge level={s.engagement} /></td>
                  <td className="px-4 py-3"><button onClick={() => startEdit(s)} className="hover:underline text-xs mr-2" style={{ color: 'var(--color-accent)' }}>Edit</button><button onClick={() => store.deleteStakeholder(s.id)} className="hover:underline text-xs" style={{ color: 'var(--color-danger)' }}>Del</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No stakeholders found</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function ActionsTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<EngagementAction>>({});
    const filtered = useMemo(() => store.actions.filter((a) => a.actionNumber.toLowerCase().includes(search.toLowerCase()) || a.title.toLowerCase().includes(search.toLowerCase())), [store.actions, search]);
    const startNew = () => { setForm({ projectId: pid, type: 'meeting', priority: 'medium' }); setEditId(null); setShowForm(true); };
    const startEdit = (a: EngagementAction) => { setForm(a); setEditId(a.id); setShowForm(true); };
    const save = async () => { if (editId) await store.updateAction(editId, form); else await store.createAction(form); setShowForm(false); if (pid) store.fetchAll(pid); };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions..." className="flex-1 rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          <button onClick={startNew} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>+ New Action</button>
        </div>
        {showForm && (
          <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{editId ? 'Edit Action' : 'New Engagement Action'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Title *" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <select value={form.type || 'meeting'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['meeting', 'report', 'presentation', 'workshop', 'site_visit', 'notification', 'other'].map((t) => (<option key={t} value={t}>{capitalize(t)}</option>))}
              </select>
              <select value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['low', 'medium', 'high'].map((p) => (<option key={p} value={p}>{capitalize(p)}</option>))}
              </select>
              {editId && (<select value={form.status || 'planned'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>{['planned', 'in_progress', 'completed', 'cancelled'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}</select>)}
              <select value={form.stakeholderId || ''} onChange={(e) => setForm({ ...form, stakeholderId: e.target.value || undefined })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                <option value="">Link to Stakeholder...</option>
                {store.stakeholders.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
              </select>
              <input placeholder="Assigned To" value={form.assignedTo || ''} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            </div>
            <textarea placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
            <div className="flex gap-2">
              <button onClick={save} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>Save</button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>Cancel</button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-bg-secondary)' }}>
              <tr style={{ color: 'var(--color-text-secondary)' }}>
                <th className="px-4 py-3 font-medium text-left">EA #</th>
                <th className="px-4 py-3 font-medium text-left">Title</th>
                <th className="px-4 py-3 font-medium text-left">Type</th>
                <th className="px-4 py-3 font-medium text-left">Status</th>
                <th className="px-4 py-3 font-medium text-left">Due</th>
                <th className="px-4 py-3 font-medium text-left">Assigned</th>
                <th className="px-4 py-3 font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody style={{ background: 'var(--color-bg-card)' }}>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text)' }}>
                  <td className="px-4 py-3 font-mono text-xs">{a.actionNumber}</td>
                  <td className="px-4 py-3">{a.title}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{capitalize(a.type)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(a.dueDate)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{a.assignedTo || '—'}</td>
                  <td className="px-4 py-3"><button onClick={() => startEdit(a)} className="hover:underline text-xs mr-2" style={{ color: 'var(--color-accent)' }}>Edit</button><button onClick={() => store.deleteAction(a.id)} className="hover:underline text-xs" style={{ color: 'var(--color-danger)' }}>Del</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No engagement actions found</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function InfluenceMap() {
    const active = store.stakeholders.filter((s) => s.status === 'active');
    const quadrants = [
      { label: 'Keep Satisfied', condition: (s: Stakeholder) => s.influence >= 4 && s.interest < 4, bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)' },
      { label: 'Manage Closely', condition: (s: Stakeholder) => s.influence >= 4 && s.interest >= 4, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
      { label: 'Monitor', condition: (s: Stakeholder) => s.influence < 4 && s.interest < 4, bg: 'var(--color-bg-secondary)', border: 'var(--color-border)' },
      { label: 'Keep Informed', condition: (s: Stakeholder) => s.influence < 4 && s.interest >= 4, bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
    ];
    return (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Power/Interest Matrix — Stakeholder positioning for engagement strategy</p>
        <div className="grid grid-cols-2 gap-4">
          {quadrants.map((q) => {
            const members = active.filter(q.condition);
            return (
              <div key={q.label} className="rounded-xl border p-4 min-h-[140px]" style={{ background: q.bg, borderColor: q.border }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{q.label}</h4>
                <div className="space-y-1">
                  {members.map((s) => (<div key={s.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}><span className="font-mono">{s.code}</span><span>{s.name}</span><EngagementBadge level={s.engagement} /></div>))}
                  {members.length === 0 && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No stakeholders</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs flex gap-6" style={{ color: 'var(--color-text-muted)' }}><span>Y-axis: Influence (1-5) | X-axis: Interest (1-5)</span><span>Threshold: 4+</span></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="stakeholders" />
      <ContractPolicyBanner module="stakeholder" policyLabels={{ 'reporting.frequency': 'Reporting Frequency', 'engagement.level': 'Engagement Level' }} />
      <div className="flex gap-1 rounded-lg p-1 overflow-x-auto" style={{ background: 'var(--color-bg-secondary)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              background: tab === t ? 'var(--color-bg-card)' : 'transparent',
              color: tab === t ? 'var(--color-text)' : 'var(--color-text-muted)',
              boxShadow: tab === t ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {store.loading && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</p>}
      {tab === 'Overview' && <Overview />}
      {tab === 'Stakeholder Register' && <RegisterTab />}
      {tab === 'Engagement Actions' && <ActionsTab />}
      {tab === 'Influence Map' && <InfluenceMap />}
    </div>
  );
}
