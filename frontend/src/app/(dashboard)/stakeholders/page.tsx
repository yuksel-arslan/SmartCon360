'use client';

import { useState, useEffect, useMemo } from 'react';
import { ModulePageHeader, ContractPolicyBanner } from '@/components/modules';
import { useProjectStore } from '@/stores/projectStore';
import { useStakeholderStore, Stakeholder, EngagementAction } from '@/stores/stakeholderStore';

/* ────────────────── helpers ────────────────── */
const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {capitalize(status)}
    </span>
  );
}

function EngagementBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    monitor: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    inform: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    consult: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    collaborate: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    empower: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {capitalize(level)}
    </span>
  );
}

const TABS = ['Overview', 'Stakeholder Register', 'Engagement Actions', 'Influence Map'] as const;
type Tab = (typeof TABS)[number];

export default function StakeholdersPage() {
  const { activeProject } = useProjectStore();
  const store = useStakeholderStore();
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (activeProject?.id) store.fetchAll(activeProject.id);
  }, [activeProject?.id]);

  function Overview() {
    const s = store.summary;
    if (!s) return <p className="text-sm text-gray-500 dark:text-gray-400">No data yet.</p>;
    const kpis: { label: string; value: string | number; accent?: string }[] = [
      { label: 'Total Stakeholders', value: s.totalStakeholders },
      { label: 'Active', value: s.activeStakeholders },
      { label: 'Key Stakeholders', value: s.highInfluenceHighInterest, accent: 'text-purple-600 dark:text-purple-400' },
      { label: 'Total Actions', value: s.totalActions },
      { label: 'Pending Actions', value: s.pendingActions, accent: s.pendingActions > 0 ? 'text-blue-600 dark:text-blue-400' : undefined },
      { label: 'Overdue Actions', value: s.overdueActions, accent: s.overdueActions > 0 ? 'text-red-600 dark:text-red-400' : undefined },
    ];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold font-mono ${k.accent || 'text-gray-900 dark:text-gray-100'}`}>{k.value}</p>
            </div>
          ))}
        </div>
        {Object.keys(s.engagementDistribution).length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Engagement Distribution</h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(s.engagementDistribution).map(([level, count]) => (
                <div key={level} className="flex items-center gap-2">
                  <EngagementBadge level={level} />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{count}</span>
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
    const startNew = () => { setForm({ projectId: activeProject?.id, role: 'contractor', category: 'internal', influence: 3, interest: 3, engagement: 'inform', status: 'active' }); setEditId(null); setShowForm(true); };
    const startEdit = (s: Stakeholder) => { setForm(s); setEditId(s.id); setShowForm(true); };
    const save = async () => { if (editId) await store.updateStakeholder(editId, form); else await store.createStakeholder(form); setShowForm(false); if (activeProject?.id) store.fetchAll(activeProject.id); };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stakeholders..." className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New Stakeholder</button>
        </div>
        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit Stakeholder' : 'New Stakeholder'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Code *" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="Organization" value={form.organization || ''} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.role || 'contractor'} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['owner', 'client_rep', 'engineer', 'contractor', 'subcontractor', 'consultant', 'regulator', 'community', 'investor', 'other'].map((r) => (<option key={r} value={r}>{capitalize(r)}</option>))}
              </select>
              <select value={form.category || 'internal'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['internal', 'external', 'regulatory', 'community'].map((c) => (<option key={c} value={c}>{capitalize(c)}</option>))}
              </select>
              <select value={form.engagement || 'inform'} onChange={(e) => setForm({ ...form, engagement: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['monitor', 'inform', 'consult', 'collaborate', 'empower'].map((e) => (<option key={e} value={e}>{capitalize(e)}</option>))}
              </select>
              <div><label className="text-xs text-gray-500 dark:text-gray-400">Influence (1-5)</label><input type="range" min={1} max={5} value={form.influence || 3} onChange={(e) => setForm({ ...form, influence: parseInt(e.target.value) })} className="w-full" /><span className="text-xs font-mono">{form.influence || 3}</span></div>
              <div><label className="text-xs text-gray-500 dark:text-gray-400">Interest (1-5)</label><input type="range" min={1} max={5} value={form.interest || 3} onChange={(e) => setForm({ ...form, interest: parseInt(e.target.value) })} className="w-full" /><span className="text-xs font-mono">{form.interest || 3}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save</button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left"><tr><th className="px-4 py-3 font-medium">Code</th><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Inf/Int</th><th className="px-4 py-3 font-medium">Engagement</th><th className="px-4 py-3 font-medium">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3">{s.name}{s.organization ? <span className="text-xs text-gray-400 ml-1">({s.organization})</span> : ''}</td>
                  <td className="px-4 py-3 text-xs">{capitalize(s.role)}</td>
                  <td className="px-4 py-3 text-xs">{capitalize(s.category)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.influence}/{s.interest}</td>
                  <td className="px-4 py-3"><EngagementBadge level={s.engagement} /></td>
                  <td className="px-4 py-3"><button onClick={() => startEdit(s)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button><button onClick={() => store.deleteStakeholder(s.id)} className="text-red-600 hover:underline text-xs">Del</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No stakeholders found</td></tr>)}
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
    const startNew = () => { setForm({ projectId: activeProject?.id, type: 'meeting', priority: 'medium' }); setEditId(null); setShowForm(true); };
    const startEdit = (a: EngagementAction) => { setForm(a); setEditId(a.id); setShowForm(true); };
    const save = async () => { if (editId) await store.updateAction(editId, form); else await store.createAction(form); setShowForm(false); if (activeProject?.id) store.fetchAll(activeProject.id); };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions..." className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New Action</button>
        </div>
        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit Action' : 'New Engagement Action'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Title *" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.type || 'meeting'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['meeting', 'report', 'presentation', 'workshop', 'site_visit', 'notification', 'other'].map((t) => (<option key={t} value={t}>{capitalize(t)}</option>))}
              </select>
              <select value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['low', 'medium', 'high'].map((p) => (<option key={p} value={p}>{capitalize(p)}</option>))}
              </select>
              {editId && (<select value={form.status || 'planned'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">{['planned', 'in_progress', 'completed', 'cancelled'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}</select>)}
              <select value={form.stakeholderId || ''} onChange={(e) => setForm({ ...form, stakeholderId: e.target.value || undefined })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                <option value="">Link to Stakeholder...</option>
                {store.stakeholders.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
              </select>
              <input placeholder="Assigned To" value={form.assignedTo || ''} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save</button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left"><tr><th className="px-4 py-3 font-medium">EA #</th><th className="px-4 py-3 font-medium">Title</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Due</th><th className="px-4 py-3 font-medium">Assigned</th><th className="px-4 py-3 font-medium">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{a.actionNumber}</td>
                  <td className="px-4 py-3">{a.title}</td>
                  <td className="px-4 py-3 text-xs">{capitalize(a.type)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3 text-xs">{fmtDate(a.dueDate)}</td>
                  <td className="px-4 py-3 text-xs">{a.assignedTo || '—'}</td>
                  <td className="px-4 py-3"><button onClick={() => startEdit(a)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button><button onClick={() => store.deleteAction(a.id)} className="text-red-600 hover:underline text-xs">Del</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No engagement actions found</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function InfluenceMap() {
    const active = store.stakeholders.filter((s) => s.status === 'active');
    const quadrants = [
      { label: 'Keep Satisfied', condition: (s: Stakeholder) => s.influence >= 4 && s.interest < 4, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
      { label: 'Manage Closely', condition: (s: Stakeholder) => s.influence >= 4 && s.interest >= 4, color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
      { label: 'Monitor', condition: (s: Stakeholder) => s.influence < 4 && s.interest < 4, color: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
      { label: 'Keep Informed', condition: (s: Stakeholder) => s.influence < 4 && s.interest >= 4, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
    ];
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Power/Interest Matrix — Stakeholder positioning for engagement strategy</p>
        <div className="grid grid-cols-2 gap-4">
          {quadrants.map((q) => {
            const members = active.filter(q.condition);
            return (
              <div key={q.label} className={`rounded-xl border p-4 min-h-[140px] ${q.color}`}>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{q.label}</h4>
                <div className="space-y-1">
                  {members.map((s) => (<div key={s.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"><span className="font-mono">{s.code}</span><span>{s.name}</span><EngagementBadge level={s.engagement} /></div>))}
                  {members.length === 0 && <p className="text-xs text-gray-400">No stakeholders</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 flex gap-6"><span>Y-axis: Influence (1-5) | X-axis: Interest (1-5)</span><span>Threshold: 4+</span></div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="stakeholders" />
      <ContractPolicyBanner module="stakeholder" policyLabels={{ 'reporting.frequency': 'Reporting Frequency', 'engagement.level': 'Engagement Level' }} />
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 overflow-x-auto">
        {TABS.map((t) => (<button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>{t}</button>))}
      </div>
      {store.loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
      {tab === 'Overview' && <Overview />}
      {tab === 'Stakeholder Register' && <RegisterTab />}
      {tab === 'Engagement Actions' && <ActionsTab />}
      {tab === 'Influence Map' && <InfluenceMap />}
    </div>
  );
}
