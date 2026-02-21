'use client';

import { useState, useEffect, useMemo } from 'react';
import { ModulePageHeader, ContractPolicyBanner } from '@/components/modules';
import { useProjectStore } from '@/stores/projectStore';
import { useCommStore, Rfi, Transmittal, MeetingMinute } from '@/stores/commStore';

/* ────────────────── helpers ────────────────── */
const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    answered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    received: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    reviewed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    superseded: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    issued: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    acknowledged: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {capitalize(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[priority] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {capitalize(priority)}
    </span>
  );
}

const TABS = ['Overview', 'RFIs', 'Transmittals', 'Meeting Minutes'] as const;
type Tab = (typeof TABS)[number];

export default function CommunicationPage() {
  const { activeProjectId } = useProjectStore();
  const pid = activeProjectId || '';
  const store = useCommStore();
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (pid) store.fetchAll(pid);
  }, [pid]);

  /* ─── Overview ─── */
  function Overview() {
    const s = store.summary;
    if (!s) return <p className="text-sm text-gray-500 dark:text-gray-400">No data yet.</p>;

    const kpis: { label: string; value: string | number; accent?: string }[] = [
      { label: 'Total RFIs', value: s.totalRfis },
      { label: 'Open RFIs', value: s.openRfis, accent: s.openRfis > 0 ? 'text-blue-600 dark:text-blue-400' : undefined },
      { label: 'Overdue RFIs', value: s.overdueRfis, accent: s.overdueRfis > 0 ? 'text-red-600 dark:text-red-400' : undefined },
      { label: 'Avg Response (days)', value: s.avgResponseDays ?? '—' },
      { label: 'Total Transmittals', value: s.totalTransmittals },
      { label: 'Pending Transmittals', value: s.pendingTransmittals },
      { label: 'Total Meetings', value: s.totalMeetings },
      { label: 'Meetings This Month', value: s.meetingsThisMonth },
    ];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold font-mono ${k.accent || 'text-gray-900 dark:text-gray-100'}`}>{k.value}</p>
          </div>
        ))}
      </div>
    );
  }

  /* ─── RFIs Tab ─── */
  function RfisTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Rfi>>({});

    const filtered = useMemo(
      () =>
        store.rfis.filter(
          (r) =>
            r.rfiNumber.toLowerCase().includes(search.toLowerCase()) ||
            r.subject.toLowerCase().includes(search.toLowerCase())
        ),
      [store.rfis, search]
    );

    const startNew = () => {
      setForm({ projectId: pid, discipline: 'architectural', priority: 'medium', createdBy: '00000000-0000-0000-0000-000000000000' });
      setEditId(null);
      setShowForm(true);
    };

    const startEdit = (r: Rfi) => {
      setForm(r);
      setEditId(r.id);
      setShowForm(true);
    };

    const save = async () => {
      if (editId) await store.updateRfi(editId, form);
      else await store.createRfi(form);
      setShowForm(false);
      if (pid) store.fetchAll(pid);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFIs..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + New RFI
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit RFI' : 'New RFI'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Subject *" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.discipline || 'architectural'} onChange={(e) => setForm({ ...form, discipline: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['architectural', 'structural', 'mep', 'civil', 'landscape', 'other'].map((d) => (
                  <option key={d} value={d}>{capitalize(d)}</option>
                ))}
              </select>
              <select value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>{capitalize(p)}</option>
                ))}
              </select>
              {editId && (
                <select value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  {['draft', 'submitted', 'under_review', 'answered', 'closed', 'overdue'].map((s) => (
                    <option key={s} value={s}>{capitalize(s)}</option>
                  ))}
                </select>
              )}
              <input placeholder="Assigned To" value={form.assignedTo || ''} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="Drawing Ref" value={form.drawingRef || ''} onChange={(e) => setForm({ ...form, drawingRef: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
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
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">RFI #</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Discipline</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{r.rfiNumber}</td>
                  <td className="px-4 py-3">{r.subject}</td>
                  <td className="px-4 py-3">{capitalize(r.discipline)}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs">{fmtDate(r.responseDue)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                    <button onClick={() => { store.deleteRfi(r.id); }} className="text-red-600 hover:underline text-xs">Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No RFIs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ─── Transmittals Tab ─── */
  function TransmittalsTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Transmittal>>({});

    const filtered = useMemo(
      () =>
        store.transmittals.filter(
          (t) =>
            t.transmittalNumber.toLowerCase().includes(search.toLowerCase()) ||
            t.subject.toLowerCase().includes(search.toLowerCase())
        ),
      [store.transmittals, search]
    );

    const startNew = () => {
      setForm({ projectId: pid, type: 'for_information', priority: 'medium', fromCompany: '', toCompany: '', createdBy: '00000000-0000-0000-0000-000000000000' });
      setEditId(null);
      setShowForm(true);
    };

    const startEdit = (t: Transmittal) => {
      setForm(t);
      setEditId(t.id);
      setShowForm(true);
    };

    const save = async () => {
      if (editId) await store.updateTransmittal(editId, form);
      else await store.createTransmittal(form);
      setShowForm(false);
      if (pid) store.fetchAll(pid);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transmittals..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + New Transmittal
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit Transmittal' : 'New Transmittal'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Subject *" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.type || 'for_information'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['for_approval', 'for_information', 'for_review', 'for_construction', 'as_built'].map((t) => (
                  <option key={t} value={t}>{capitalize(t)}</option>
                ))}
              </select>
              <select value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>{capitalize(p)}</option>
                ))}
              </select>
              {editId && (
                <select value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  {['draft', 'sent', 'received', 'reviewed', 'approved', 'rejected', 'superseded'].map((s) => (
                    <option key={s} value={s}>{capitalize(s)}</option>
                  ))}
                </select>
              )}
              <input placeholder="From Company *" value={form.fromCompany || ''} onChange={(e) => setForm({ ...form, fromCompany: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="To Company *" value={form.toCompany || ''} onChange={(e) => setForm({ ...form, toCompany: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
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
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">TRN #</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">From / To</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{t.transmittalNumber}</td>
                  <td className="px-4 py-3">{t.subject}</td>
                  <td className="px-4 py-3 text-xs">{capitalize(t.type)}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-xs">{t.fromCompany} → {t.toCompany}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(t)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                    <button onClick={() => { store.deleteTransmittal(t.id); }} className="text-red-600 hover:underline text-xs">Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No transmittals found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ─── Meeting Minutes Tab ─── */
  function MeetingsTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<MeetingMinute>>({});

    const filtered = useMemo(
      () =>
        store.meetings.filter(
          (m) =>
            m.meetingNumber.toLowerCase().includes(search.toLowerCase()) ||
            m.title.toLowerCase().includes(search.toLowerCase())
        ),
      [store.meetings, search]
    );

    const startNew = () => {
      setForm({ projectId: pid, type: 'progress', date: new Date().toISOString().slice(0, 10), conductedBy: '00000000-0000-0000-0000-000000000000' });
      setEditId(null);
      setShowForm(true);
    };

    const startEdit = (m: MeetingMinute) => {
      setForm({ ...m, date: m.date?.slice(0, 10) });
      setEditId(m.id);
      setShowForm(true);
    };

    const save = async () => {
      if (editId) await store.updateMeeting(editId, form);
      else await store.createMeeting(form);
      setShowForm(false);
      if (pid) store.fetchAll(pid);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + New Meeting
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit Meeting' : 'New Meeting Minutes'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Title *" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.type || 'progress'} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['progress', 'coordination', 'safety', 'design', 'kickoff', 'closeout', 'other'].map((t) => (
                  <option key={t} value={t}>{capitalize(t)}</option>
                ))}
              </select>
              <input type="date" value={typeof form.date === 'string' ? form.date.slice(0, 10) : ''} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              {editId && (
                <select value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  {['draft', 'issued', 'acknowledged'].map((s) => (
                    <option key={s} value={s}>{capitalize(s)}</option>
                  ))}
                </select>
              )}
              <input placeholder="Location" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="Start Time (HH:MM)" value={form.startTime || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Save</button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">MOM #</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{m.meetingNumber}</td>
                  <td className="px-4 py-3">{m.title}</td>
                  <td className="px-4 py-3 text-xs">{capitalize(m.type)}</td>
                  <td className="px-4 py-3 text-xs">{fmtDate(m.date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-xs">{m.location || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(m)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                    <button onClick={() => { store.deleteMeeting(m.id); }} className="text-red-600 hover:underline text-xs">Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No meetings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="communication" />
      <ContractPolicyBanner
        module="comm_hub"
        policyLabels={{ 'rfi.response_days': 'RFI Response (days)', 'escalation.model': 'Escalation Model' }}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {store.loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>}

      {tab === 'Overview' && <Overview />}
      {tab === 'RFIs' && <RfisTab />}
      {tab === 'Transmittals' && <TransmittalsTab />}
      {tab === 'Meeting Minutes' && <MeetingsTab />}
    </div>
  );
}
