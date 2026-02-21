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
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    probation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    blacklisted: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    ordered: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    partial_received: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    received: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    in_transit: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    inspected: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {capitalize(status)}
    </span>
  );
}

const SUPPLY_POLICY_LABELS: Record<string, string> = {
  'procurement.responsibility': 'Procurement',
  'mrp.enabled': 'MRP Engine',
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
    if (!s) return <p className="text-sm text-gray-500 dark:text-gray-400">No data yet.</p>;

    const kpis: { label: string; value: string | number; accent?: string }[] = [
      { label: 'Total Suppliers', value: s.totalSuppliers },
      { label: 'Active Suppliers', value: s.activeSuppliers },
      { label: 'Total POs', value: s.totalPOs },
      { label: 'Open POs', value: s.openPOs, accent: s.openPOs > 0 ? 'text-blue-600 dark:text-blue-400' : undefined },
      { label: 'Total PO Value', value: fmtCurrency(s.totalPOAmount) },
      { label: 'Total Deliveries', value: s.totalDeliveries },
      { label: 'Pending Deliveries', value: s.pendingDeliveries },
      { label: 'Overdue Deliveries', value: s.overdueDeliveries, accent: s.overdueDeliveries > 0 ? 'text-red-600 dark:text-red-400' : undefined },
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New Supplier</button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit Supplier' : 'New Supplier'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Code *" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.category || 'materials'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['materials', 'equipment', 'subcontractor', 'services', 'other'].map((c) => (<option key={c} value={c}>{capitalize(c)}</option>))}
              </select>
              <select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['active', 'approved', 'probation', 'blacklisted', 'inactive'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}
              </select>
              <input placeholder="Contact Name" value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="Contact Email" value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <input placeholder="Contact Phone" value={form.contactPhone || ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.rating || ''} onChange={(e) => setForm({ ...form, rating: e.target.value ? parseInt(e.target.value) : undefined })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                <option value="">Rating...</option>
                {[1, 2, 3, 4, 5].map((r) => (<option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>))}
              </select>
            </div>
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
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-xs">{capitalize(s.category)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-xs">{s.rating ? `${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}` : '—'}</td>
                  <td className="px-4 py-3 text-xs">{s.contactName || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(s)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                    <button onClick={() => store.deleteSupplier(s.id)} className="text-red-600 hover:underline text-xs">Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No suppliers found</td></tr>)}
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search POs..." className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New PO</button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit PO' : 'New Purchase Order'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Title *" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.category || 'materials'} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['materials', 'equipment_rental', 'subcontract', 'services'].map((c) => (<option key={c} value={c}>{capitalize(c)}</option>))}
              </select>
              <select value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                {['low', 'medium', 'high', 'urgent'].map((p) => (<option key={p} value={p}>{capitalize(p)}</option>))}
              </select>
              {editId && (
                <select value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  {['draft', 'submitted', 'approved', 'ordered', 'partial_received', 'received', 'cancelled'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}
                </select>
              )}
              <input type="number" placeholder="Total Amount" value={form.totalAmount || ''} onChange={(e) => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              <select value={form.supplierId || ''} onChange={(e) => setForm({ ...form, supplierId: e.target.value || undefined })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                <option value="">Select Supplier...</option>
                {store.suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
              </select>
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
                <th className="px-4 py-3 font-medium">PO #</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.title}</td>
                  <td className="px-4 py-3 text-xs">{po.supplier?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs">{capitalize(po.category)}</td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtCurrency(po.totalAmount, po.currency)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(po)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                    <button onClick={() => store.deletePO(po.id)} className="text-red-600 hover:underline text-xs">Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No purchase orders found</td></tr>)}
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deliveries..." className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
          <button onClick={startNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">+ New Delivery</button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{editId ? 'Edit Delivery' : 'New Delivery'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="date" value={typeof form.scheduledDate === 'string' ? form.scheduledDate.slice(0, 10) : ''} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              {editId && (
                <select value={form.status || 'scheduled'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  {['scheduled', 'in_transit', 'delivered', 'inspected', 'accepted', 'rejected'].map((s) => (<option key={s} value={s}>{capitalize(s)}</option>))}
                </select>
              )}
              <select value={form.purchaseOrderId || ''} onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value || undefined })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                <option value="">Link to PO...</option>
                {store.purchaseOrders.map((po) => (<option key={po.id} value={po.id}>{po.poNumber} — {po.title}</option>))}
              </select>
              <input type="number" placeholder="Item Count" value={form.itemCount || ''} onChange={(e) => setForm({ ...form, itemCount: parseInt(e.target.value) || 0 })} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
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
                <th className="px-4 py-3 font-medium">DEL #</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Actual</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{d.deliveryNumber}</td>
                  <td className="px-4 py-3">{d.description || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-xs">{fmtDate(d.scheduledDate)}</td>
                  <td className="px-4 py-3 text-xs">{fmtDate(d.actualDate)}</td>
                  <td className="px-4 py-3 text-xs">{d.itemCount}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(d)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                    <button onClick={() => store.deleteDelivery(d.id)} className="text-red-600 hover:underline text-xs">Del</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No deliveries found</td></tr>)}
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
      {tab === 'Suppliers' && <SuppliersTab />}
      {tab === 'Purchase Orders' && <PurchaseOrdersTab />}
      {tab === 'Deliveries' && <DeliveriesTab />}
    </div>
  );
}
