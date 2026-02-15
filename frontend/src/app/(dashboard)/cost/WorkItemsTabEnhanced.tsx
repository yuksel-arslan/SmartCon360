'use client';

/**
 * Enhanced WorkItemsTab with Detail Drawer and Multi-Currency Support
 *
 * This component replaces the existing WorkItemsTab in page.tsx
 * It adds:
 * - Click to view work item details with cost breakdown
 * - Resource editing capability
 * - Multi-currency support (TRY/USD)
 */

import { useState } from 'react';
import { X, Plus, Trash2, Loader2, Eye, Calculator } from 'lucide-react';
import { useCostStore } from '@/stores/costStore';
import type { WorkItem } from '@/stores/costStore';
import { WorkItemDetailDrawer } from '@/components/cost';

// Reusable UI components (assumed to exist in the project)
const Input = ({ ...props }) => (
  <input
    className="px-3 py-2 rounded-lg border text-xs"
    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
    {...props}
  />
);

const Select = ({ ...props }) => (
  <select
    className="px-3 py-2 rounded-lg border text-xs"
    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
    {...props}
  />
);

const Btn = ({ variant = 'default', ...props }: any) => {
  const styles = {
    primary: { background: 'var(--color-accent)', color: 'white' },
    danger: { background: 'var(--color-danger)', color: 'white' },
    default: { background: 'var(--color-bg-input)', color: 'var(--color-text)' },
  };
  return (
    <button
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      style={styles[variant as keyof typeof styles]}
      {...props}
    />
  );
};

const Card = ({ ...props }) => (
  <div
    className="rounded-xl border p-4"
    style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    {...props}
  />
);

const PROJECT_ID = '00000000-0000-4000-a000-000000000001';

export function WorkItemsTabEnhanced() {
  const { workItems, addWorkItem, deleteWorkItem } = useCostStore();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('m²');
  const [cat, setCat] = useState('Structural');
  const [source, setSource] = useState('custom');
  const [desc, setDesc] = useState('');

  // Detail drawer state
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');

  const categories = [...new Set(workItems.map((w: WorkItem) => w.category))];
  const filtered = workItems.filter((item: WorkItem) => {
    const ms = !search || item.code.toLowerCase().includes(search.toLowerCase()) || item.name.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === 'all' || item.category === filterCat;
    return ms && mc;
  });

  const handleAdd = async () => {
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    await addWorkItem({
      projectId: PROJECT_ID,
      code: code.trim(),
      name: name.trim(),
      unit,
      category: cat,
      source,
      description: desc || undefined
    });
    setSaving(false);
    setCode('');
    setName('');
    setDesc('');
    setShowForm(false);
  };

  const handleRowClick = async (item: WorkItem) => {
    // Fetch full work item details with resources
    try {
      const res = await fetch(`/api/v1/cost/work-items/${item.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setSelectedWorkItem(json.data);
        setDrawerOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch work item details:', error);
      // Fallback: open with basic data
      setSelectedWorkItem(item);
      setDrawerOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Work Items ({filtered.length})
        </h3>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search..." value={search} onChange={(e: any) => setSearch(e.target.value)} />
          <Select value={filterCat} onChange={(e: any) => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Btn variant={showForm ? 'danger' : 'primary'} onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> New Item</>}
          </Btn>
        </div>
      </div>

      {showForm && (
        <Card className="!border-[var(--color-accent)]">
          <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Add New Work Item</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Input placeholder="Item code *" value={code} onChange={(e: any) => setCode(e.target.value)} />
            <Input placeholder="Item name *" value={name} onChange={(e: any) => setName(e.target.value)} className="col-span-2" />
            <Select value={unit} onChange={(e: any) => setUnit(e.target.value)}>
              {['m²', 'm³', 'm', 'kg', 'ton', 'pcs', 'set', 'hr'].map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
            <Select value={cat} onChange={(e: any) => setCat(e.target.value)}>
              {['Structural', 'Finishing', 'Insulation', 'Mechanical', 'Electrical', 'Earthworks', 'Landscaping'].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Btn onClick={handleAdd} disabled={saving || !code.trim() || !name.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
            </Btn>
          </div>
        </Card>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-input)' }}>
                {['Code', 'Name', 'Unit', 'Category', 'Source', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: WorkItem) => (
                <tr
                  key={item.id}
                  className="border-t group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-accent)' }}>{item.code}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{item.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{item.source}</td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRowClick(item)}
                        className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
                        title="View Details"
                      >
                        <Eye size={12} style={{ color: 'var(--color-accent)' }} />
                      </button>
                      <button
                        onClick={() => deleteWorkItem(item.id)}
                        className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
                        title="Delete"
                      >
                        <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Work Item Detail Drawer */}
      {selectedWorkItem && (
        <WorkItemDetailDrawer
          workItem={selectedWorkItem}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedWorkItem(null);
          }}
          currency={currency}
          onCurrencyChange={setCurrency}
        />
      )}
    </div>
  );
}
