'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { ModulePageHeader } from '@/components/modules';
import { useResourceStore, Scaffold } from '@/stores/resourceStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  Layers, ClipboardCheck, Ruler, Loader2, AlertCircle,
  Plus, X, Pencil, Trash2, ChevronDown,
} from 'lucide-react';

const EMPTY_FORM = {
  tag: '',
  type: 'tube_and_coupler',
  status: 'erected',
  height: '',
  length: '',
  width: '',
  areaSqm: '',
  loadCapacity: '',
  inspectionInterval: 7,
  contractor: '',
  permitNumber: '',
  notes: '',
};

const SCAFFOLD_TYPES = ['tube_and_coupler', 'frame', 'system', 'cantilever', 'suspended', 'mobile', 'other'];
const SCAFFOLD_STATUSES = ['erected', 'in_use', 'pending_inspection', 'flagged', 'dismantled', 'planned'];

function fmtDate(d?: string | null) {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '--'; }
}

export default function ScaffoldingsPage() {
  const { activeProjectId } = useProjectStore();
  const {
    summary, scaffolds, loading, error,
    fetchAll, createScaffold, updateScaffold, deleteScaffold,
  } = useResourceStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (activeProjectId) {
      fetchAll(activeProjectId);
    }
  }, [activeProjectId, fetchAll]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: Scaffold) => {
    setForm({
      tag: item.tag,
      type: item.type,
      status: item.status,
      height: item.height || '',
      length: item.length || '',
      width: item.width || '',
      areaSqm: item.areaSqm || '',
      loadCapacity: item.loadCapacity || '',
      inspectionInterval: item.inspectionInterval,
      contractor: item.contractor || '',
      permitNumber: item.permitNumber || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!activeProjectId || !form.tag) return;
    setSaving(true);
    const payload = { ...form, projectId: activeProjectId, inspectionInterval: Number(form.inspectionInterval) };
    if (editingId) {
      await updateScaffold(editingId, payload);
    } else {
      await createScaffold(payload);
    }
    await fetchAll(activeProjectId);
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!activeProjectId) return;
    setSaving(true);
    await deleteScaffold(id);
    await fetchAll(activeProjectId);
    setDeleteConfirm(null);
    setSaving(false);
  };

  const activeScaffolds = summary?.activeScaffolds ?? 0;
  const inspectionsDue = summary?.inspectionsDue ?? 0;
  const totalArea = summary?.totalScaffoldArea ?? '0';

  const statusColor = (s: string) => {
    if (s === 'erected' || s === 'in_use') return { bg: 'rgba(16,185,129,0.12)', text: 'var(--color-success)' };
    if (s === 'pending_inspection') return { bg: 'rgba(245,158,11,0.12)', text: 'var(--color-warning)' };
    if (s === 'flagged') return { bg: 'rgba(239,68,68,0.12)', text: 'var(--color-danger)' };
    if (s === 'dismantled') return { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
    return { bg: 'rgba(59,130,246,0.12)', text: 'var(--color-accent)' };
  };

  return (
    <>
      <TopBar title="Scaffoldings" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
        <ModulePageHeader moduleId="scaffoldings" />

        {error && (
          <div className="rounded-lg px-4 py-3 flex items-center gap-3 text-[12px]"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Active Scaffolds', value: activeScaffolds, icon: Layers, color: 'var(--color-accent)' },
                { label: 'Inspections Due', value: inspectionsDue, icon: ClipboardCheck, color: 'var(--color-warning)' },
                { label: 'Total Area (m\u00B2)', value: `${parseFloat(totalArea).toLocaleString()}`, icon: Ruler, color: 'var(--color-success)' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border p-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[11px] font-normal uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                      <div className="text-2xl font-medium mt-1" style={{ fontFamily: 'var(--font-display)', color: kpi.color }}>{kpi.value}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                      <kpi.icon size={18} style={{ color: kpi.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Create / Edit Form */}
            {showForm && (
              <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {editingId ? 'Edit Scaffold' : 'Add Scaffold'}
                  </span>
                  <button onClick={resetForm} className="p-1 rounded-md hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'tag', label: 'Tag / ID', type: 'text', placeholder: 'e.g. SCF-001' },
                    { key: 'height', label: 'Height (m)', type: 'text', placeholder: '0.0' },
                    { key: 'length', label: 'Length (m)', type: 'text', placeholder: '0.0' },
                    { key: 'width', label: 'Width (m)', type: 'text', placeholder: '0.0' },
                    { key: 'areaSqm', label: 'Area (m\u00B2)', type: 'text', placeholder: '0.0' },
                    { key: 'loadCapacity', label: 'Load Capacity (kg)', type: 'text', placeholder: '0' },
                    { key: 'inspectionInterval', label: 'Inspection Interval (days)', type: 'number', placeholder: '7' },
                    { key: 'contractor', label: 'Contractor', type: 'text', placeholder: 'Contractor name' },
                    { key: 'permitNumber', label: 'Permit Number', type: 'text', placeholder: 'PTW-xxx' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{field.label}</label>
                      <input
                        type={field.type}
                        value={(form as Record<string, string | number>)[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-1"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Type</label>
                    <div className="relative">
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-xs outline-none appearance-none"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {SCAFFOLD_TYPES.map((t) => (
                          <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Status</label>
                    <div className="relative">
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-xs outline-none appearance-none"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {SCAFFOLD_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Optional notes..."
                      className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-1"
                      style={{
                        background: 'var(--color-bg-input)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Cancel</button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !form.tag}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            )}

            {/* Scaffolds Table */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <span className="text-[11px] font-normal uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Scaffolds ({scaffolds.length})</span>
                {!showForm && (
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg text-white"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Plus size={13} /> Add Scaffold
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Tag', 'Type', 'Status', 'Height', 'Area (m\u00B2)', 'Last Inspection', 'Next Inspection', ''].map((h) => (
                        <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
                          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scaffolds.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          No scaffolds found. Click &quot;Add Scaffold&quot; to create one.
                        </td>
                      </tr>
                    )}
                    {scaffolds.map((item) => {
                      const sc = statusColor(item.status);
                      const area = parseFloat(item.areaSqm || '0');
                      const height = parseFloat(item.height || '0');
                      const isOverdue = item.nextInspection && new Date(item.nextInspection) < new Date();
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{item.tag}</span>
                            {item.contractor && (
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.contractor}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                            {item.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </td>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-[10px] font-normal px-2 py-0.5 rounded-md" style={{ background: sc.bg, color: sc.text }}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                            {height > 0 ? `${height}m` : '--'}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                            {area > 0 ? area.toLocaleString() : '--'}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                            {fmtDate(item.lastInspection)}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
                            {fmtDate(item.nextInspection)}
                          </td>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEdit(item)} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--color-accent)' }} title="Edit">
                                <Pencil size={13} />
                              </button>
                              {deleteConfirm === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={saving}
                                    className="px-2 py-1 rounded text-[10px] font-medium text-white"
                                    style={{ background: 'var(--color-danger)' }}
                                  >
                                    {saving ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                                  </button>
                                  <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-[10px]" style={{ color: 'var(--color-text-muted)' }}>No</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--color-danger)' }} title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
