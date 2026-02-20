'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { ModulePageHeader } from '@/components/modules';
import { useResourceStore, Crew } from '@/stores/resourceStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  Users, TrendingUp, BarChart3, Loader2, AlertCircle,
  Plus, X, Pencil, Trash2, ChevronDown,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  code: '',
  foremanName: '',
  workerCount: 0,
  status: 'active',
  company: '',
  skillLevel: 'intermediate',
  utilization: '0',
  dailyRate: '',
  currency: 'USD',
};

export default function WorkmanshipPage() {
  const { activeProjectId } = useProjectStore();
  const {
    summary, crews, loading, error,
    fetchAll, createCrew, updateCrew, deleteCrew,
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

  const handleEdit = (crew: Crew) => {
    setForm({
      name: crew.name,
      code: crew.code,
      foremanName: crew.foremanName || '',
      workerCount: crew.workerCount,
      status: crew.status,
      company: crew.company || '',
      skillLevel: crew.skillLevel || 'intermediate',
      utilization: crew.utilization,
      dailyRate: crew.dailyRate || '',
      currency: crew.currency,
    });
    setEditingId(crew.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!activeProjectId || !form.name || !form.code) return;
    setSaving(true);
    const payload = { ...form, projectId: activeProjectId, workerCount: Number(form.workerCount) };
    if (editingId) {
      await updateCrew(editingId, payload);
    } else {
      await createCrew(payload);
    }
    await fetchAll(activeProjectId);
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!activeProjectId) return;
    setSaving(true);
    await deleteCrew(id);
    await fetchAll(activeProjectId);
    setDeleteConfirm(null);
    setSaving(false);
  };

  const activeCrews = summary?.activeCrews ?? 0;
  const totalWorkers = summary?.totalWorkers ?? 0;
  const avgUtil = summary?.avgUtilization ?? '0';

  return (
    <>
      <TopBar title="Workmanship" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
        <ModulePageHeader moduleId="workmanship" />

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
                { label: 'Active Crews', value: activeCrews, icon: Users, color: 'var(--color-accent)' },
                { label: 'Total Workers', value: totalWorkers, icon: TrendingUp, color: 'var(--color-success)' },
                { label: 'Avg Utilization', value: `${parseFloat(avgUtil).toFixed(1)}%`, icon: BarChart3, color: 'var(--color-warning)' },
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
                    {editingId ? 'Edit Crew' : 'Add Crew'}
                  </span>
                  <button onClick={resetForm} className="p-1 rounded-md hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'name', label: 'Crew Name', type: 'text', placeholder: 'e.g. MEP Crew A' },
                    { key: 'code', label: 'Code', type: 'text', placeholder: 'e.g. CRW-001' },
                    { key: 'foremanName', label: 'Foreman', type: 'text', placeholder: 'Foreman name' },
                    { key: 'workerCount', label: 'Workers', type: 'number', placeholder: '0' },
                    { key: 'company', label: 'Company', type: 'text', placeholder: 'Company name' },
                    { key: 'dailyRate', label: 'Daily Rate', type: 'text', placeholder: '0.00' },
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
                        <option value="active">Active</option>
                        <option value="idle">Idle</option>
                        <option value="mobilizing">Mobilizing</option>
                        <option value="demobilized">Demobilized</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Skill Level</label>
                    <div className="relative">
                      <select
                        value={form.skillLevel}
                        onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-xs outline-none appearance-none"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        <option value="junior">Junior</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="senior">Senior</option>
                        <option value="master">Master</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>Cancel</button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !form.name || !form.code}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white flex items-center gap-2 disabled:opacity-50"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            )}

            {/* Crews Table */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <span className="text-[11px] font-normal uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Crews ({crews.length})</span>
                {!showForm && (
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg text-white"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Plus size={13} /> Add Crew
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Name', 'Code', 'Trade', 'Workers', 'Status', 'Utilization', 'Company', ''].map((h) => (
                        <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
                          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crews.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          No crews found. Click &quot;Add Crew&quot; to create one.
                        </td>
                      </tr>
                    )}
                    {crews.map((crew) => {
                      const util = parseFloat(crew.utilization) || 0;
                      return (
                        <tr key={crew.id}>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{crew.name}</span>
                            {crew.foremanName && (
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{crew.foremanName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{crew.code}</td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>{crew.skillLevel || '--'}</td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{crew.workerCount}</td>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-[10px] font-normal px-2 py-0.5 rounded-md" style={{
                              background: crew.status === 'active' ? 'rgba(16,185,129,0.12)' : crew.status === 'idle' ? 'rgba(245,158,11,0.12)' : 'var(--color-bg-input)',
                              color: crew.status === 'active' ? 'var(--color-success)' : crew.status === 'idle' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                            }}>{crew.status}</span>
                          </td>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            {util > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 rounded-full flex-1 max-w-[80px]" style={{ background: 'var(--color-bg-input)' }}>
                                  <div className="h-1.5 rounded-full" style={{ width: `${util}%`, background: util > 85 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                                </div>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{util}%</span>
                              </div>
                            ) : (
                              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>--</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{crew.company || '--'}</td>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEdit(crew)} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--color-accent)' }} title="Edit">
                                <Pencil size={13} />
                              </button>
                              {deleteConfirm === crew.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(crew.id)}
                                    disabled={saving}
                                    className="px-2 py-1 rounded text-[10px] font-medium text-white"
                                    style={{ background: 'var(--color-danger)' }}
                                  >
                                    {saving ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                                  </button>
                                  <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-[10px]" style={{ color: 'var(--color-text-muted)' }}>No</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(crew.id)} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--color-danger)' }} title="Delete">
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
