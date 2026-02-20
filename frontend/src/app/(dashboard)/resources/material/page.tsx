'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { ModulePageHeader } from '@/components/modules';
import { useResourceStore, MaterialItem } from '@/stores/resourceStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  Package, AlertTriangle, Recycle, Loader2, AlertCircle,
  Plus, X, Pencil, Trash2, ChevronDown,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  code: '',
  category: 'structural',
  unit: 'pcs',
  plannedQty: '0',
  receivedQty: '0',
  consumedQty: '0',
  wasteQty: '0',
  stockQty: '0',
  unitPrice: '',
  currency: 'USD',
  supplier: '',
  status: 'in_stock',
  reorderLevel: '',
};

const CATEGORIES = ['structural', 'finishing', 'mechanical', 'electrical', 'plumbing', 'insulation', 'concrete', 'steel', 'timber', 'other'];
const UNITS = ['pcs', 'kg', 'ton', 'm', 'm2', 'm3', 'ltr', 'set', 'roll', 'bag', 'bundle'];
const STATUSES = ['in_stock', 'low_stock', 'out_of_stock', 'on_order', 'delivered'];

export default function MaterialPage() {
  const { activeProjectId } = useProjectStore();
  const {
    summary, materials, loading, error,
    fetchAll, createMaterial, updateMaterial, deleteMaterial,
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

  const handleEdit = (item: MaterialItem) => {
    setForm({
      name: item.name,
      code: item.code,
      category: item.category,
      unit: item.unit,
      plannedQty: item.plannedQty,
      receivedQty: item.receivedQty,
      consumedQty: item.consumedQty,
      wasteQty: item.wasteQty,
      stockQty: item.stockQty,
      unitPrice: item.unitPrice || '',
      currency: item.currency,
      supplier: item.supplier || '',
      status: item.status,
      reorderLevel: item.reorderLevel || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!activeProjectId || !form.name || !form.code) return;
    setSaving(true);
    const payload = { ...form, projectId: activeProjectId };
    if (editingId) {
      await updateMaterial(editingId, payload);
    } else {
      await createMaterial(payload);
    }
    await fetchAll(activeProjectId);
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!activeProjectId) return;
    setSaving(true);
    await deleteMaterial(id);
    await fetchAll(activeProjectId);
    setDeleteConfirm(null);
    setSaving(false);
  };

  const totalMaterials = summary?.totalMaterials ?? 0;
  const lowStock = summary?.lowStockItems ?? 0;
  const wasteRate = summary?.totalWasteRate ?? '0';

  const statusColor = (s: string) => {
    if (s === 'in_stock') return { bg: 'rgba(16,185,129,0.12)', text: 'var(--color-success)' };
    if (s === 'low_stock') return { bg: 'rgba(245,158,11,0.12)', text: 'var(--color-warning)' };
    if (s === 'out_of_stock') return { bg: 'rgba(239,68,68,0.12)', text: 'var(--color-danger)' };
    if (s === 'on_order') return { bg: 'rgba(59,130,246,0.12)', text: 'var(--color-accent)' };
    return { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' };
  };

  return (
    <>
      <TopBar title="Material" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4">
        <ModulePageHeader moduleId="material" />

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
                { label: 'Total Materials', value: totalMaterials, icon: Package, color: 'var(--color-accent)' },
                { label: 'Low Stock', value: lowStock, icon: AlertTriangle, color: 'var(--color-warning)' },
                { label: 'Waste Rate', value: `${parseFloat(wasteRate).toFixed(1)}%`, icon: Recycle, color: 'var(--color-danger)' },
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
                    {editingId ? 'Edit Material' : 'Add Material'}
                  </span>
                  <button onClick={resetForm} className="p-1 rounded-md hover:opacity-80" style={{ color: 'var(--color-text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Rebar 12mm' },
                    { key: 'code', label: 'Code', type: 'text', placeholder: 'e.g. MAT-001' },
                    { key: 'plannedQty', label: 'Planned Qty', type: 'text', placeholder: '0' },
                    { key: 'receivedQty', label: 'Received Qty', type: 'text', placeholder: '0' },
                    { key: 'consumedQty', label: 'Consumed Qty', type: 'text', placeholder: '0' },
                    { key: 'wasteQty', label: 'Waste Qty', type: 'text', placeholder: '0' },
                    { key: 'stockQty', label: 'Stock Qty', type: 'text', placeholder: '0' },
                    { key: 'unitPrice', label: 'Unit Price', type: 'text', placeholder: '0.00' },
                    { key: 'supplier', label: 'Supplier', type: 'text', placeholder: 'Supplier name' },
                    { key: 'reorderLevel', label: 'Reorder Level', type: 'text', placeholder: 'Min stock qty' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{field.label}</label>
                      <input
                        type={field.type}
                        value={(form as Record<string, string | number>)[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
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
                    <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category</label>
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-xs outline-none appearance-none"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-normal uppercase tracking-wide mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Unit</label>
                    <div className="relative">
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-xs outline-none appearance-none"
                        style={{
                          background: 'var(--color-bg-input)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
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
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                        ))}
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

            {/* Materials Table */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <span className="text-[11px] font-normal uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Materials ({materials.length})</span>
                {!showForm && (
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg text-white"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <Plus size={13} /> Add Material
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Name', 'Code', 'Category', 'Unit', 'Stock Qty', 'Consumed', 'Waste', 'Status', ''].map((h) => (
                        <th key={h} className="text-left text-[11px] font-normal uppercase tracking-wide px-4 py-3 border-b"
                          style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {materials.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          No materials found. Click &quot;Add Material&quot; to create one.
                        </td>
                      </tr>
                    )}
                    {materials.map((item) => {
                      const sc = statusColor(item.status);
                      const stock = parseFloat(item.stockQty) || 0;
                      const consumed = parseFloat(item.consumedQty) || 0;
                      const waste = parseFloat(item.wasteQty) || 0;
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{item.name}</span>
                            {item.supplier && (
                              <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{item.supplier}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{item.code}</td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                          </td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{item.unit}</td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{stock.toLocaleString()}</td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{consumed.toLocaleString()}</td>
                          <td className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: waste > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{waste.toLocaleString()}</td>
                          <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-[10px] font-normal px-2 py-0.5 rounded-md" style={{ background: sc.bg, color: sc.text }}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
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
