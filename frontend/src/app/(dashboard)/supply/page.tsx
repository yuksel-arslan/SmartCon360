'use client';

import { useState, useEffect, useMemo } from 'react';
import { ModulePageHeader, ContractPolicyBanner } from '@/components/modules';
import { useProjectStore } from '@/stores/projectStore';
import { useSupplyStore, Supplier, PurchaseOrder, Delivery } from '@/stores/supplyStore';

/* ────────────────── helpers ────────────────── */
const capitalize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtCurrency = (v: number, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'var(--color-bg-hover)', text: 'var(--color-text-secondary)' },
    active: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
    approved: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
    probation: { bg: 'rgba(234,179,8,0.15)', text: 'var(--color-warning)' },
    blacklisted: { bg: 'rgba(239,68,68,0.15)', text: 'var(--color-danger)' },
    inactive: { bg: 'var(--color-bg-hover)', text: 'var(--color-text-muted)' },
    submitted: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
    ordered: { bg: 'rgba(6,182,212,0.15)', text: 'var(--color-cyan)' },
    partial_received: { bg: 'rgba(234,179,8,0.15)', text: 'var(--color-warning)' },
    received: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
    cancelled: { bg: 'rgba(239,68,68,0.15)', text: 'var(--color-danger)' },
    scheduled: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
    in_transit: { bg: 'rgba(6,182,212,0.15)', text: 'var(--color-cyan)' },
    delivered: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
    inspected: { bg: 'rgba(168,85,247,0.15)', text: '#A855F7' },
    accepted: { bg: 'rgba(34,197,94,0.15)', text: 'var(--color-success)' },
    rejected: { bg: 'rgba(239,68,68,0.15)', text: 'var(--color-danger)' },
  };
  const c = colors[status] || { bg: 'var(--color-bg-hover)', text: 'var(--color-text-secondary)' };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {capitalize(status)}
    </span>
  );
}

const SUPPLY_POLICY_LABELS: Record<string, string> = {
  'procurement.responsibility': 'Procurement',
  'mrp.enabled': 'MRP Engine',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-input)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
};

const TABS = ['Overview', 'Suppliers', 'Purchase Orders', 'Deliveries'] as const;
type Tab = (typeof TABS)[number];

export default function SupplyPage() {
  const { activeProjectId } = useProjectStore();
  const pid = activeProjectId || '';
  const store = useSupplyStore();
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (pid) store.fetchAll(pid);
  }, [pid]);

  /* ─── Overview ─── */
  function Overview() {
    const s = store.summary;
    if (!s) return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No data yet.</p>;

    const kpis: { label: string; value: string | number; accent?: string }[] = [
      { label: 'Total Suppliers', value: s.totalSuppliers },
      { label: 'Active Suppliers', value: s.activeSuppliers },
      { label: 'Total POs', value: s.totalPOs },
      { label: 'Open POs', value: s.openPOs, accent: s.openPOs > 0 ? '#3B82F6' : undefined },
      { label: 'Total PO Value', value: fmtCurrency(s.totalPOAmount) },
      { label: 'Total Deliveries', value: s.totalDeliveries },
      { label: 'Pending Deliveries', value: s.pendingDeliveries },
      { label: 'Overdue Deliveries', value: s.overdueDeliveries, accent: s.overdueDeliveries > 0 ? 'var(--color-danger)' : undefined },
    ];

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border p-4" style={cardStyle}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{k.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: k.accent || 'var(--color-text)' }}>{k.value}</p>
          </div>
        ))}
      </div>
    );
  }

  /* ─── Suppliers Tab ─── */
  function SuppliersTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Supplier>>({});

    const filtered = useMemo(
      () => store.suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())),
      [store.suppliers, search]
    );

    const startNew = () => {
      setForm({ projectId: pid, category: 'materials', status: 'active' });
      setEditId(null);
      setShowForm(true);
    };

    const startEdit = (s: Supplier) => { setForm(s); setEditId(s.id); setShowForm(true); };

    const save = async () => {
      if (editId) await store.updateSupplier(editId, form);
      else await store.createSupplier(form);
      setShowForm(false);
      if (pid) store.fetchAll(pid);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="flex-1 rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          <button onClick={startNew} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>+ New Supplier</button>
        </div>

        {showForm && (
          <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{editId ? 'Edit Supplier' : 'New Supplier'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Code *" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <input placeholder="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <select value={form.category || 'materials'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['materials', 'equipment', 'subcontractor', 'services', 'other'].map((c) => (<option key={c} value={c}>{capitalize(c)}</option>))}
              </select>
              <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['active', 'approved', 'probation', 'blacklisted', 'inactive'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}
              </select>
              <input placeholder="Contact Name" value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <input placeholder="Contact Email" value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <input placeholder="Contact Phone" value={form.contactPhone || ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <select value={form.rating || ''} onChange={(e) => setForm({ ...form, rating: e.target.value ? parseInt(e.target.value) : undefined })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                <option value="">Rating...</option>
                {[1, 2, 3, 4, 5].map((r) => (<option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>))}
              </select>
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
                <th className="px-4 py-3 font-medium text-left">Category</th>
                <th className="px-4 py-3 font-medium text-left">Status</th>
                <th className="px-4 py-3 font-medium text-left">Rating</th>
                <th className="px-4 py-3 font-medium text-left">Contact</th>
                <th className="px-4 py-3 font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody style={{ background: 'var(--color-bg-card)' }}>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text)' }}>
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{capitalize(s.category)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-xs">{s.rating ? `${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}` : '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.contactName || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(s)} className="hover:underline text-xs mr-2" style={{ color: 'var(--color-accent)' }}>Edit</button>
                    <button onClick={() => store.deleteSupplier(s.id)} className="hover:underline text-xs" style={{ color: 'var(--color-danger)' }}>Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No suppliers found</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ─── Purchase Orders Tab ─── */
  function PurchaseOrdersTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<PurchaseOrder>>({});

    const filtered = useMemo(
      () => store.purchaseOrders.filter((po) => po.poNumber.toLowerCase().includes(search.toLowerCase()) || po.title.toLowerCase().includes(search.toLowerCase())),
      [store.purchaseOrders, search]
    );

    const startNew = () => {
      setForm({ projectId: pid, category: 'materials', priority: 'medium', totalAmount: 0, createdBy: '00000000-0000-0000-0000-000000000000' });
      setEditId(null);
      setShowForm(true);
    };

    const startEdit = (po: PurchaseOrder) => { setForm(po); setEditId(po.id); setShowForm(true); };

    const save = async () => {
      if (editId) await store.updatePO(editId, form);
      else await store.createPO(form);
      setShowForm(false);
      if (pid) store.fetchAll(pid);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search POs..." className="flex-1 rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          <button onClick={startNew} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>+ New PO</button>
        </div>

        {showForm && (
          <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{editId ? 'Edit PO' : 'New Purchase Order'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Title *" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <select value={form.category || 'materials'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['materials', 'equipment_rental', 'subcontract', 'services'].map((c) => (<option key={c} value={c}>{capitalize(c)}</option>))}
              </select>
              <select value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                {['low', 'medium', 'high', 'urgent'].map((p) => (<option key={p} value={p}>{capitalize(p)}</option>))}
              </select>
              {editId && (
                <select value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                  {['draft', 'submitted', 'approved', 'ordered', 'partial_received', 'received', 'cancelled'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}
                </select>
              )}
              <input type="number" placeholder="Total Amount" value={form.totalAmount || ''} onChange={(e) => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              <select value={form.supplierId || ''} onChange={(e) => setForm({ ...form, supplierId: e.target.value || undefined })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                <option value="">Select Supplier...</option>
                {store.suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
              </select>
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
                <th className="px-4 py-3 font-medium text-left">PO #</th>
                <th className="px-4 py-3 font-medium text-left">Title</th>
                <th className="px-4 py-3 font-medium text-left">Supplier</th>
                <th className="px-4 py-3 font-medium text-left">Category</th>
                <th className="px-4 py-3 font-medium text-left">Status</th>
                <th className="px-4 py-3 font-medium text-left">Amount</th>
                <th className="px-4 py-3 font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody style={{ background: 'var(--color-bg-card)' }}>
              {filtered.map((po) => (
                <tr key={po.id} className="border-t" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text)' }}>
                  <td className="px-4 py-3 font-mono text-xs">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.title}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{po.supplier?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{capitalize(po.category)}</td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtCurrency(po.totalAmount, po.currency)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(po)} className="hover:underline text-xs mr-2" style={{ color: 'var(--color-accent)' }}>Edit</button>
                    <button onClick={() => store.deletePO(po.id)} className="hover:underline text-xs" style={{ color: 'var(--color-danger)' }}>Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No purchase orders found</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ─── Deliveries Tab ─── */
  function DeliveriesTab() {
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Delivery>>({});

    const filtered = useMemo(
      () => store.deliveries.filter((d) => d.deliveryNumber.toLowerCase().includes(search.toLowerCase()) || (d.description || '').toLowerCase().includes(search.toLowerCase())),
      [store.deliveries, search]
    );

    const startNew = () => {
      setForm({ projectId: pid, scheduledDate: new Date().toISOString().slice(0, 10) });
      setEditId(null);
      setShowForm(true);
    };

    const startEdit = (d: Delivery) => { setForm({ ...d, scheduledDate: d.scheduledDate?.slice(0, 10) }); setEditId(d.id); setShowForm(true); };

    const save = async () => {
      if (editId) await store.updateDelivery(editId, form);
      else await store.createDelivery(form);
      setShowForm(false);
      if (pid) store.fetchAll(pid);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deliveries..." className="flex-1 rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
          <button onClick={startNew} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--color-accent)' }}>+ New Delivery</button>
        </div>

        {showForm && (
          <div className="rounded-xl border p-4 space-y-3" style={cardStyle}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{editId ? 'Edit Delivery' : 'New Delivery'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="date" value={typeof form.scheduledDate === 'string' ? form.scheduledDate.slice(0, 10) : ''} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
              {editId && (
                <select value={form.status || 'scheduled'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                  {['scheduled', 'in_transit', 'delivered', 'inspected', 'accepted', 'rejected'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}
                </select>
              )}
              <select value={form.purchaseOrderId || ''} onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value || undefined })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}>
                <option value="">Link to PO...</option>
                {store.purchaseOrders.map((po) => (<option key={po.id} value={po.id}>{po.poNumber} — {po.title}</option>))}
              </select>
              <input type="number" placeholder="Item Count" value={form.itemCount || ''} onChange={(e) => setForm({ ...form, itemCount: parseInt(e.target.value) || 0 })} className="rounded-lg border px-3 py-2 text-sm" style={inputStyle} />
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
                <th className="px-4 py-3 font-medium text-left">DEL #</th>
                <th className="px-4 py-3 font-medium text-left">Description</th>
                <th className="px-4 py-3 font-medium text-left">Status</th>
                <th className="px-4 py-3 font-medium text-left">Scheduled</th>
                <th className="px-4 py-3 font-medium text-left">Actual</th>
                <th className="px-4 py-3 font-medium text-left">Items</th>
                <th className="px-4 py-3 font-medium text-left">Actions</th>
              </tr>
            </thead>
            <tbody style={{ background: 'var(--color-bg-card)' }}>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text)' }}>
                  <td className="px-4 py-3 font-mono text-xs">{d.deliveryNumber}</td>
                  <td className="px-4 py-3">{d.description || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(d.scheduledDate)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(d.actualDate)}</td>
                  <td className="px-4 py-3 text-xs">{d.itemCount}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(d)} className="hover:underline text-xs mr-2" style={{ color: 'var(--color-accent)' }}>Edit</button>
                    <button onClick={() => store.deleteDelivery(d.id)} className="hover:underline text-xs" style={{ color: 'var(--color-danger)' }}>Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>No deliveries found</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="supply" />
      <ContractPolicyBanner module="supply_chain" policyLabels={SUPPLY_POLICY_LABELS} />

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
      {tab === 'Suppliers' && <SuppliersTab />}
      {tab === 'Purchase Orders' && <PurchaseOrdersTab />}
      {tab === 'Deliveries' && <DeliveriesTab />}
    </div>
  );
}
