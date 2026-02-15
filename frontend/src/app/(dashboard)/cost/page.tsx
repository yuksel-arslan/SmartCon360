'use client';

import {
  DollarSign, Calculator, FileSpreadsheet, Receipt, TrendingUp, BarChart3,
  Package, ClipboardList, Loader2, AlertCircle, CheckCircle2, Clock, Send,
  FileText, ArrowUpRight, ArrowDownRight, Minus, X, Trash2, Plus, Upload,
  Edit3, Eye, ChevronDown, Building2, Landmark, Wrench,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ModulePageHeader } from '@/components/modules';
import { useCostStore } from '@/stores/costStore';
import { useProjectStore } from '@/stores/projectStore';
import type {
  WorkItem, UnitPriceAnalysis, QuantityTakeoff, Estimate,
  Budget, BudgetItem, PaymentCertificate, EvmSnapshot, CostRecord,
} from '@/stores/costStore';

type CostTab = 'overview' | 'work-items' | 'unit-prices' | 'metraj' | 'estimates' | 'budgets' | 'hakedis' | 'evm';

const PROJECT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000099';

const tabs: { id: CostTab; label: string; icon: typeof DollarSign }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'work-items', label: 'Pozlar', icon: ClipboardList },
  { id: 'unit-prices', label: 'Birim Fiyat', icon: Calculator },
  { id: 'metraj', label: 'Metraj', icon: FileSpreadsheet },
  { id: 'estimates', label: 'Keşif', icon: Package },
  { id: 'budgets', label: 'Bütçe', icon: DollarSign },
  { id: 'hakedis', label: 'Hakediş', icon: Receipt },
  { id: 'evm', label: 'EVM', icon: TrendingUp },
];

export default function CostPage() {
  const [activeTab, setActiveTab] = useState<CostTab>('overview');
  const { activeProjectId } = useProjectStore();
  const { loading, error, initialized, fetchAll } = useCostStore();

  const pid = activeProjectId || PROJECT_ID;

  const loadData = useCallback(async () => {
    await fetchAll(pid);
  }, [pid, fetchAll]);

  useEffect(() => {
    if (!initialized) loadData();
  }, [initialized, loadData]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
      <ModulePageHeader moduleId="cost" />

      {error && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-3 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tab Navigation */}
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
              <tab.icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading && !initialized && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      )}

      {initialized && (
        <>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'work-items' && <WorkItemsTab />}
          {activeTab === 'unit-prices' && <UnitPricesTab />}
          {activeTab === 'metraj' && <MetrajTab />}
          {activeTab === 'estimates' && <EstimatesTab />}
          {activeTab === 'budgets' && <BudgetsTab />}
          {activeTab === 'hakedis' && <HakedisTab />}
          {activeTab === 'evm' && <EvmTab />}
        </>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function fmt(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' },
    submitted: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    approved: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    paid: { bg: 'var(--color-accent-muted)', text: 'var(--color-accent)' },
    active: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
  };
  const c = colors[status] || colors.draft;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
      style={{ background: c.bg, color: c.text }}>{status}</span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-5 ${className}`}
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      {children}
    </div>
  );
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }} />
  );
}

function Select({ children, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select {...props}
      className={`text-xs px-3 py-2 rounded-lg border outline-none ${className}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}>
      {children}
    </select>
  );
}

function Btn({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }) {
  const bg = variant === 'primary' ? 'var(--color-accent)' : variant === 'danger' ? 'var(--color-danger)' : 'transparent';
  const clr = variant === 'ghost' ? 'var(--color-text-muted)' : '#fff';
  return (
    <button {...props}
      className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 ${props.className || ''}`}
      style={{ background: bg, color: clr, borderColor: variant === 'ghost' ? 'var(--color-border)' : undefined, border: variant === 'ghost' ? '1px solid' : undefined }}>
      {children}
    </button>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const { workItems, estimates, budgets, payments, evmSnapshots, quantityTakeoffs } = useCostStore();

  const latest = evmSnapshots[evmSnapshots.length - 1];
  const cpi = latest ? parseFloat(latest.cpi) : 0;
  const spi = latest ? parseFloat(latest.spi) : 0;
  const eac = latest ? parseFloat(latest.eac) : 0;
  const activeBudget = budgets.find(b => b.status === 'active') || budgets[0];
  const budgetTotal = activeBudget ? parseFloat(activeBudget.totalAmount) : 0;
  const lastPayment = payments[payments.length - 1];
  const cumHakedis = lastPayment ? parseFloat(lastPayment.cumulativeAmount) : 0;
  const approvedEstimate = estimates.find(e => e.status === 'approved');

  const kpis = [
    { label: 'CPI', value: cpi ? cpi.toFixed(2) : '—', good: cpi >= 1, desc: cpi >= 1 ? 'Bütçe altında' : 'Bütçe üstünde' },
    { label: 'SPI', value: spi ? spi.toFixed(2) : '—', good: spi >= 1, desc: spi >= 1 ? 'Programda' : 'Geride' },
    { label: 'Bütçe (BAC)', value: budgetTotal ? `${fmtShort(budgetTotal)} ₺` : '—', good: true, desc: activeBudget?.name || '' },
    { label: 'EAC', value: eac ? `${fmtShort(eac)} ₺` : '—', good: eac <= budgetTotal, desc: 'Tahmini tamamlanma maliyeti' },
    { label: 'Kümülatif Hakediş', value: `${fmtShort(cumHakedis)} ₺`, good: true, desc: `${payments.length} dönem` },
    { label: 'İş Kalemleri', value: `${workItems.length}`, good: true, desc: `${[...new Set(workItems.map(w => w.category))].length} kategori` },
    { label: 'Metraj', value: `${quantityTakeoffs.length}`, good: true, desc: 'Kayıt' },
    { label: 'Keşif', value: approvedEstimate ? `${fmtShort(approvedEstimate.grandTotal)} ₺` : '—', good: true, desc: approvedEstimate?.name || 'Henüz yok' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</span>
              {kpi.good ? <ArrowUpRight size={12} style={{ color: 'rgb(34,197,94)' }} /> : <ArrowDownRight size={12} style={{ color: 'var(--color-danger)' }} />}
            </div>
            <div className="text-xl font-medium mt-1 font-mono" style={{ color: 'var(--color-text)' }}>{kpi.value}</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{kpi.desc}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Son Hakedişler</h3>
          {payments.length === 0 && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Henüz hakediş yok</p>}
          {payments.slice(-4).reverse().map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-accent)' }}>#{p.periodNumber}</span>
                <div>
                  <div className="text-xs" style={{ color: 'var(--color-text)' }}>{fmtShort(p.grossAmount)} ₺</div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{p.periodStart?.slice(0, 10)} — {p.periodEnd?.slice(0, 10)}</div>
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Keşif Geçmişi</h3>
          {estimates.length === 0 && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Henüz keşif yok</p>}
          {estimates.map(e => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{e.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtShort(e.grandTotal)} ₺ (KDV dahil)</div>
              </div>
              <StatusBadge status={e.status} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// WORK ITEMS TAB
// ============================================================================

function WorkItemsTab() {
  const { workItems, addWorkItem, deleteWorkItem } = useCostStore();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('m²');
  const [cat, setCat] = useState('Kaba Yapı');
  const [source, setSource] = useState('custom');
  const [desc, setDesc] = useState('');

  const categories = [...new Set(workItems.map(w => w.category))];
  const filtered = workItems.filter(item => {
    const ms = !search || item.code.toLowerCase().includes(search.toLowerCase()) || item.name.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === 'all' || item.category === filterCat;
    return ms && mc;
  });

  const handleAdd = async () => {
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    await addWorkItem({ projectId: PROJECT_ID, code: code.trim(), name: name.trim(), unit, category: cat, source, description: desc || undefined });
    setSaving(false);
    setCode(''); setName(''); setDesc('');
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Pozlar ({filtered.length})</h3>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">Tüm Kategoriler</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Btn variant={showForm ? 'danger' : 'primary'} onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={12} /> İptal</> : <><Plus size={12} /> Yeni Poz</>}
          </Btn>
        </div>
      </div>

      {showForm && (
        <Card className="!border-[var(--color-accent)]">
          <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Yeni Poz Ekle</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Input placeholder="Poz kodu *" value={code} onChange={e => setCode(e.target.value)} />
            <Input placeholder="Poz adı *" value={name} onChange={e => setName(e.target.value)} className="col-span-2" />
            <Select value={unit} onChange={e => setUnit(e.target.value)}>
              {['m²', 'm³', 'm', 'kg', 'ton', 'adet', 'takım', 'saat'].map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
            <Select value={cat} onChange={e => setCat(e.target.value)}>
              {['Kaba Yapı', 'İnce Yapı', 'Yalıtım', 'Mekanik', 'Elektrik', 'Hafriyat', 'Peyzaj'].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Btn onClick={handleAdd} disabled={saving || !code.trim() || !name.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Ekle
            </Btn>
          </div>
        </Card>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-input)' }}>
                {['Kod', 'Ad', 'Birim', 'Kategori', 'Kaynak', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-t group" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
                  <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-accent)' }}>{item.code}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{item.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>{item.category}</span></td>
                  <td className="px-4 py-3 text-[10px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{item.source}</td>
                  <td className="px-2 py-3">
                    <button onClick={() => deleteWorkItem(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded" title="Sil">
                      <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UNIT PRICES TAB
// ============================================================================

function UnitPricesTab() {
  const { workItems, fetchUnitPrices, unitPriceAnalyses, createUnitPriceAnalysis } = useCostStore();
  const [selectedWI, setSelectedWI] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form for new analysis
  const [fOverhead, setFOverhead] = useState('15');
  const [fProfit, setFProfit] = useState('10');
  const [fSource, setFSource] = useState('bayindirlik');
  const [resources, setResources] = useState<Array<{ resourceType: string; name: string; unit: string; quantity: string; unitRate: string }>>([
    { resourceType: 'labor', name: '', unit: 'saat', quantity: '', unitRate: '' },
  ]);

  useEffect(() => {
    if (selectedWI) fetchUnitPrices(selectedWI);
  }, [selectedWI, fetchUnitPrices]);

  const addResource = () => {
    setResources([...resources, { resourceType: 'material', name: '', unit: 'kg', quantity: '', unitRate: '' }]);
  };

  const removeResource = (idx: number) => {
    setResources(resources.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!selectedWI || resources.some(r => !r.name || !r.quantity || !r.unitRate)) return;
    setSaving(true);
    await createUnitPriceAnalysis({
      workItemId: selectedWI,
      overheadPct: parseFloat(fOverhead) || 0,
      profitPct: parseFloat(fProfit) || 0,
      resources: resources.map(r => ({
        resourceType: r.resourceType,
        name: r.name,
        unit: r.unit,
        quantity: parseFloat(r.quantity),
        unitRate: parseFloat(r.unitRate),
      })),
    });
    setSaving(false);
    setShowForm(false);
    setResources([{ resourceType: 'labor', name: '', unit: 'saat', quantity: '', unitRate: '' }]);
    fetchUnitPrices(selectedWI);
  };

  const selectedItem = workItems.find(w => w.id === selectedWI);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Birim Fiyat Analizi</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            <Landmark size={12} /> Bayındırlık
            <Building2 size={12} className="ml-2" /> İller Bankası
            <Wrench size={12} className="ml-2" /> Özel
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Work Item List */}
        <div className="lg:col-span-1">
          <Card className="max-h-[600px] overflow-y-auto !p-3">
            <h4 className="text-[10px] font-semibold mb-2 px-2" style={{ color: 'var(--color-text-muted)' }}>İş Kalemi Seçin</h4>
            {workItems.map(wi => (
              <button key={wi.id} onClick={() => setSelectedWI(wi.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-colors"
                style={{
                  background: selectedWI === wi.id ? 'var(--color-accent-muted)' : 'transparent',
                  color: selectedWI === wi.id ? 'var(--color-accent)' : 'var(--color-text)',
                }}>
                <div className="font-mono font-medium text-[10px]">{wi.code}</div>
                <div className="truncate">{wi.name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{wi.unit} — {wi.category}</div>
              </button>
            ))}
          </Card>
        </div>

        {/* Analysis Detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedWI && (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <Calculator size={40} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
              <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>Birim fiyat analizini görüntülemek için sol taraftan bir iş kalemi seçin</p>
            </Card>
          )}

          {selectedWI && selectedItem && (
            <>
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-mono font-medium" style={{ color: 'var(--color-accent)' }}>{selectedItem.code}</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{selectedItem.name}</div>
                  </div>
                  <Btn onClick={() => setShowForm(!showForm)} variant={showForm ? 'danger' : 'primary'}>
                    {showForm ? <><X size={12} /> İptal</> : <><Plus size={12} /> Yeni Analiz</>}
                  </Btn>
                </div>

                {unitPriceAnalyses.length === 0 && !showForm && (
                  <p className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>Bu iş kalemi için henüz birim fiyat analizi yok</p>
                )}

                {unitPriceAnalyses.map(a => (
                  <div key={a.id} className="border rounded-lg p-4 mb-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>v{a.version}</span>
                        <span className="text-[10px] capitalize px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>{a.source}</span>
                      </div>
                      <div className="text-lg font-mono font-medium" style={{ color: 'var(--color-accent)' }}>{fmt(a.unitPrice)} ₺</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-[10px] mb-3">
                      <div><span style={{ color: 'var(--color-text-muted)' }}>İşçilik:</span> <span className="font-mono" style={{ color: 'var(--color-text)' }}>{fmt(a.laborCost)} ₺</span></div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Malzeme:</span> <span className="font-mono" style={{ color: 'var(--color-text)' }}>{fmt(a.materialCost)} ₺</span></div>
                      <div><span style={{ color: 'var(--color-text-muted)' }}>Makine:</span> <span className="font-mono" style={{ color: 'var(--color-text)' }}>{fmt(a.equipmentCost)} ₺</span></div>
                    </div>
                    <div className="text-[10px] flex gap-4" style={{ color: 'var(--color-text-muted)' }}>
                      <span>Genel Gider: %{parseFloat(a.overheadPct).toFixed(0)} ({fmt(a.overheadAmount)} ₺)</span>
                      <span>Kar: %{parseFloat(a.profitPct).toFixed(0)} ({fmt(a.profitAmount)} ₺)</span>
                    </div>
                    {a.resources && a.resources.length > 0 && (
                      <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr><th className="text-left py-1" style={{ color: 'var(--color-text-muted)' }}>Tür</th><th className="text-left py-1" style={{ color: 'var(--color-text-muted)' }}>Ad</th><th className="text-right py-1" style={{ color: 'var(--color-text-muted)' }}>Miktar</th><th className="text-right py-1" style={{ color: 'var(--color-text-muted)' }}>B.Fiyat</th><th className="text-right py-1" style={{ color: 'var(--color-text-muted)' }}>Toplam</th></tr>
                          </thead>
                          <tbody>
                            {a.resources.map(r => (
                              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                                <td className="py-1 capitalize" style={{ color: r.resourceType === 'labor' ? 'rgb(59,130,246)' : r.resourceType === 'material' ? 'rgb(34,197,94)' : 'var(--color-accent)' }}>{r.resourceType === 'labor' ? 'İşçilik' : r.resourceType === 'material' ? 'Malzeme' : 'Makine'}</td>
                                <td className="py-1" style={{ color: 'var(--color-text)' }}>{r.name}</td>
                                <td className="py-1 text-right font-mono" style={{ color: 'var(--color-text)' }}>{fmt(r.quantity)} {r.unit}</td>
                                <td className="py-1 text-right font-mono" style={{ color: 'var(--color-text)' }}>{fmt(r.unitRate)} ₺</td>
                                <td className="py-1 text-right font-mono font-medium" style={{ color: 'var(--color-text)' }}>{fmt(r.total)} ₺</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </Card>

              {/* New Analysis Form */}
              {showForm && (
                <Card className="!border-[var(--color-accent)]">
                  <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Yeni Birim Fiyat Analizi</h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Kaynak</label>
                      <Select value={fSource} onChange={e => setFSource(e.target.value)} className="w-full">
                        <option value="bayindirlik">Bayındırlık Bakanlığı</option>
                        <option value="iller_bankasi">İller Bankası</option>
                        <option value="custom">Özel Birim Fiyat</option>
                        <option value="supplier">Tedarikçi Teklifi</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Genel Gider %</label>
                      <Input value={fOverhead} onChange={e => setFOverhead(e.target.value)} type="number" className="w-full" />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Kar %</label>
                      <Input value={fProfit} onChange={e => setFProfit(e.target.value)} type="number" className="w-full" />
                    </div>
                  </div>

                  <h5 className="text-[10px] font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Kaynaklar (İşçilik / Malzeme / Makine)</h5>
                  {resources.map((r, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 mb-2">
                      <Select value={r.resourceType} onChange={e => { const nr = [...resources]; nr[i].resourceType = e.target.value; setResources(nr); }}>
                        <option value="labor">İşçilik</option>
                        <option value="material">Malzeme</option>
                        <option value="equipment">Makine</option>
                      </Select>
                      <Input placeholder="Ad *" value={r.name} onChange={e => { const nr = [...resources]; nr[i].name = e.target.value; setResources(nr); }} className="col-span-2" />
                      <Input placeholder="Miktar" value={r.quantity} onChange={e => { const nr = [...resources]; nr[i].quantity = e.target.value; setResources(nr); }} type="number" />
                      <Input placeholder="Birim Fiyat" value={r.unitRate} onChange={e => { const nr = [...resources]; nr[i].unitRate = e.target.value; setResources(nr); }} type="number" />
                      <button onClick={() => removeResource(i)} className="p-2 rounded-lg" title="Kaldır">
                        <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Btn variant="ghost" onClick={addResource}><Plus size={12} /> Kaynak Ekle</Btn>
                    <Btn onClick={handleCreate} disabled={saving}>
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Oluştur
                    </Btn>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// METRAJ TAB
// ============================================================================

function MetrajTab() {
  const { quantityTakeoffs, workItems, addQuantityTakeoff, deleteQuantityTakeoff } = useCostStore();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fWorkItem, setFWorkItem] = useState('');
  const [fQty, setFQty] = useState('');
  const [fUnit, setFUnit] = useState('m²');
  const [fDrawing, setFDrawing] = useState('');
  const [fNotes, setFNotes] = useState('');

  const handleCreate = async () => {
    if (!fWorkItem || !fQty) return;
    setSaving(true);
    await addQuantityTakeoff({
      projectId: PROJECT_ID,
      workItemId: fWorkItem,
      quantity: parseFloat(fQty),
      unit: fUnit,
      drawingRef: fDrawing || undefined,
      notes: fNotes || undefined,
    });
    setSaving(false);
    setFWorkItem(''); setFQty(''); setFDrawing(''); setFNotes('');
    setShowForm(false);
  };

  // Group by work item
  const grouped = quantityTakeoffs.reduce<Record<string, { workItem: WorkItem | undefined; takeoffs: typeof quantityTakeoffs; totalQty: number }>>((acc, t) => {
    const key = t.workItemId;
    if (!acc[key]) acc[key] = { workItem: t.workItem || workItems.find(w => w.id === key), takeoffs: [], totalQty: 0 };
    acc[key].takeoffs.push(t);
    acc[key].totalQty += parseFloat(t.quantity);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Metraj Cetveli ({quantityTakeoffs.length} kayıt)</h3>
        <Btn variant={showForm ? 'danger' : 'primary'} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={12} /> İptal</> : <><Plus size={12} /> Yeni Metraj</>}
        </Btn>
      </div>

      {showForm && (
        <Card className="!border-[var(--color-accent)]">
          <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Yeni Metraj Kaydı</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Select value={fWorkItem} onChange={e => { setFWorkItem(e.target.value); const wi = workItems.find(w => w.id === e.target.value); if (wi) setFUnit(wi.unit); }} className="col-span-2">
              <option value="">İş kalemi seçin...</option>
              {workItems.map(wi => <option key={wi.id} value={wi.id}>{wi.code} — {wi.name}</option>)}
            </Select>
            <Input placeholder="Miktar *" value={fQty} onChange={e => setFQty(e.target.value)} type="number" />
            <Input value={fUnit} onChange={e => setFUnit(e.target.value)} placeholder="Birim" />
            <Input placeholder="Çizim Ref." value={fDrawing} onChange={e => setFDrawing(e.target.value)} />
            <Btn onClick={handleCreate} disabled={saving || !fWorkItem || !fQty}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Ekle
            </Btn>
          </div>
        </Card>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-input)' }}>
                {['Poz', 'Ad', 'Miktar', 'Birim', 'Çizim Ref.', 'Rev.', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quantityTakeoffs.map(t => {
                const wi = t.workItem || workItems.find(w => w.id === t.workItemId);
                return (
                  <tr key={t.id} className="border-t group" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
                    <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-accent)' }}>{wi?.code || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{wi?.name || '—'}</td>
                    <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-text)' }}>{fmt(t.quantity)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{t.unit}</td>
                    <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{t.drawingRef || '—'}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--color-text-muted)' }}>r{t.revision}</td>
                    <td className="px-2 py-3">
                      <button onClick={() => deleteQuantityTakeoff(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded" title="Sil">
                        <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {quantityTakeoffs.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Henüz metraj kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ESTIMATES TAB
// ============================================================================

function EstimatesTab() {
  const { estimates, createEstimate, deleteEstimate } = useCostStore();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('yaklasik_maliyet');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    await createEstimate({ projectId: PROJECT_ID, name: formName.trim(), type: formType, createdBy: USER_ID });
    setSaving(false);
    setFormName('');
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Keşifler ({estimates.length})</h3>
        <Btn variant={showForm ? 'danger' : 'primary'} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={12} /> İptal</> : <><Plus size={12} /> Yeni Keşif</>}
        </Btn>
      </div>

      {showForm && (
        <Card className="!border-[var(--color-accent)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Keşif adı *" value={formName} onChange={e => setFormName(e.target.value)} className="col-span-2" />
            <Select value={formType} onChange={e => setFormType(e.target.value)}>
              <option value="yaklasik_maliyet">Yaklaşık Maliyet</option>
              <option value="ihale_teklif">İhale Teklifi</option>
              <option value="revize_kesif">Revize Keşif</option>
              <option value="ek_kesif">Ek Keşif</option>
            </Select>
            <Btn onClick={handleCreate} disabled={saving || !formName.trim()}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Oluştur
            </Btn>
          </div>
        </Card>
      )}

      {estimates.length === 0 && !showForm && (
        <Card className="flex flex-col items-center py-12 text-center">
          <Package size={40} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>Henüz keşif yok. Metraj ve birim fiyat analizlerinden otomatik keşif oluşturun.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {estimates.map(e => (
          <Card key={e.id} className="relative group">
            <button onClick={() => deleteEstimate(e.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded" title="Sil">
              <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
            </button>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{e.name}</span>
              <StatusBadge status={e.status} />
            </div>
            <div className="text-lg font-medium font-mono" style={{ color: 'var(--color-accent)' }}>{fmtShort(e.totalAmount)} ₺</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>KDV dahil: {fmtShort(e.grandTotal)} ₺</div>
            <div className="text-[10px] mt-2 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <FileText size={10} /> v{e.version} — {e.type.replace(/_/g, ' ')}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// BUDGETS TAB
// ============================================================================

function BudgetsTab() {
  const { budgets, selectedBudget, createBudget, fetchBudgetDetail } = useCostStore();
  const [showForm, setShowForm] = useState(false);
  const [fName, setFName] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  useEffect(() => {
    if (viewId) fetchBudgetDetail(viewId);
  }, [viewId, fetchBudgetDetail]);

  const handleCreate = async () => {
    if (!fName.trim() || !fAmount) return;
    setSaving(true);
    await createBudget({ projectId: PROJECT_ID, name: fName.trim(), totalAmount: parseFloat(fAmount) });
    setSaving(false);
    setFName(''); setFAmount('');
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Bütçeler ({budgets.length})</h3>
        <Btn variant={showForm ? 'danger' : 'primary'} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={12} /> İptal</> : <><Plus size={12} /> Yeni Bütçe</>}
        </Btn>
      </div>

      {showForm && (
        <Card className="!border-[var(--color-accent)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Bütçe adı *" value={fName} onChange={e => setFName(e.target.value)} className="col-span-2" />
            <Input placeholder="Toplam tutar (₺) *" value={fAmount} onChange={e => setFAmount(e.target.value)} type="number" />
            <Btn onClick={handleCreate} disabled={saving || !fName.trim() || !fAmount}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Oluştur
            </Btn>
          </div>
        </Card>
      )}

      {budgets.length === 0 && !showForm && (
        <Card className="flex flex-col items-center py-12 text-center">
          <DollarSign size={40} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>Henüz bütçe yok. Onaylı keşiften bütçe oluşturun veya manuel ekleyin.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map(b => (
          <Card key={b.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{b.name}</span>
              <StatusBadge status={b.status} />
            </div>
            <div className="text-xl font-medium font-mono" style={{ color: 'var(--color-accent)' }}>{fmt(b.totalAmount)} ₺</div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>v{b.version} — {b.currency}</div>
            <button onClick={() => setViewId(viewId === b.id ? null : b.id)}
              className="text-[10px] mt-2 flex items-center gap-1"
              style={{ color: 'var(--color-accent)' }}>
              <Eye size={10} /> {viewId === b.id ? 'Kapat' : 'Kalem Detayı'}
            </button>

            {viewId === b.id && selectedBudget?.items && (
              <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr><th className="text-left py-1" style={{ color: 'var(--color-text-muted)' }}>Kalem</th><th className="text-right py-1" style={{ color: 'var(--color-text-muted)' }}>Planlanan</th><th className="text-right py-1" style={{ color: 'var(--color-text-muted)' }}>Gerçekleşen</th><th className="text-right py-1" style={{ color: 'var(--color-text-muted)' }}>Sapma</th></tr>
                  </thead>
                  <tbody>
                    {selectedBudget.items.map(item => {
                      const planned = parseFloat(item.plannedAmount);
                      const actual = parseFloat(item.actualAmount);
                      const variance = planned - actual;
                      return (
                        <tr key={item.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="py-1" style={{ color: 'var(--color-text)' }}>{item.description}</td>
                          <td className="py-1 text-right font-mono" style={{ color: 'var(--color-text)' }}>{fmtShort(planned)} ₺</td>
                          <td className="py-1 text-right font-mono" style={{ color: 'var(--color-text)' }}>{fmtShort(actual)} ₺</td>
                          <td className="py-1 text-right font-mono" style={{ color: variance >= 0 ? 'rgb(34,197,94)' : 'var(--color-danger)' }}>{fmtShort(variance)} ₺</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HAKEDIS TAB
// ============================================================================

function HakedisTab() {
  const { payments, createPayment, submitPayment, approvePayment } = useCostStore();
  const [showForm, setShowForm] = useState(false);
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!fStart || !fEnd) return;
    setSaving(true);
    await createPayment({
      projectId: PROJECT_ID,
      periodNumber: payments.length + 1,
      periodStart: new Date(fStart).toISOString(),
      periodEnd: new Date(fEnd).toISOString(),
      createdBy: USER_ID,
      retentionPct: 5,
    });
    setSaving(false);
    setFStart(''); setFEnd('');
    setShowForm(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 size={14} style={{ color: 'rgb(34,197,94)' }} />;
      case 'approved': return <CheckCircle2 size={14} style={{ color: 'var(--color-accent)' }} />;
      case 'submitted': return <Send size={14} style={{ color: 'rgb(59,130,246)' }} />;
      default: return <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Hakediş Belgeleri ({payments.length})</h3>
        <Btn variant={showForm ? 'danger' : 'primary'} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={12} /> İptal</> : <><Plus size={12} /> Yeni Hakediş</>}
        </Btn>
      </div>

      {showForm && (
        <Card className="!border-[var(--color-accent)]">
          <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Hakediş #{payments.length + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Dönem Başlangıç</label>
              <Input type="date" value={fStart} onChange={e => setFStart(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Dönem Bitiş</label>
              <Input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} className="w-full" />
            </div>
            <div className="flex items-end">
              <Btn onClick={handleCreate} disabled={saving || !fStart || !fEnd} className="w-full justify-center">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Oluştur
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Summary */}
      {payments.length > 0 && (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Toplam Hakediş</div>
              <div className="text-lg font-medium font-mono" style={{ color: 'var(--color-text)' }}>{payments.length}</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Kümülatif Tutar</div>
              <div className="text-lg font-medium font-mono" style={{ color: 'var(--color-accent)' }}>{fmtShort(payments[payments.length - 1]?.cumulativeAmount || '0')} ₺</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Ödenen</div>
              <div className="text-lg font-medium font-mono" style={{ color: 'rgb(34,197,94)' }}>{payments.filter(p => p.status === 'paid').length}</div>
            </div>
            <div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Bekleyen</div>
              <div className="text-lg font-medium font-mono" style={{ color: 'rgb(245,158,11)' }}>{payments.filter(p => ['submitted', 'draft'].includes(p.status)).length}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-input)' }}>
                {['#', 'Dönem', 'Brüt (₺)', 'Teminat', 'KDV', 'Net (₺)', 'Kümülatif (₺)', 'Durum', 'İşlem'].map(h => (
                  <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
                  <td className="px-3 py-3 font-mono font-medium" style={{ color: 'var(--color-accent)' }}>{p.periodNumber}</td>
                  <td className="px-3 py-3 text-[10px]" style={{ color: 'var(--color-text)' }}>{p.periodStart?.slice(0, 10)} — {p.periodEnd?.slice(0, 10)}</td>
                  <td className="px-3 py-3 font-mono text-right" style={{ color: 'var(--color-text)' }}>{fmtShort(p.grossAmount)}</td>
                  <td className="px-3 py-3 font-mono text-right text-[10px]" style={{ color: 'var(--color-text-muted)' }}>%{parseFloat(p.retentionPct).toFixed(0)}</td>
                  <td className="px-3 py-3 font-mono text-right text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtShort(p.vatAmount)}</td>
                  <td className="px-3 py-3 font-mono text-right font-medium" style={{ color: 'var(--color-text)' }}>{fmtShort(p.netAmount)}</td>
                  <td className="px-3 py-3 font-mono text-right font-medium" style={{ color: 'var(--color-accent)' }}>{fmtShort(p.cumulativeAmount)}</td>
                  <td className="px-3 py-3"><div className="flex items-center gap-1">{statusIcon(p.status)} <StatusBadge status={p.status} /></div></td>
                  <td className="px-3 py-3">
                    {p.status === 'draft' && <button onClick={() => submitPayment(p.id)} className="text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)' }}>Gönder</button>}
                    {p.status === 'submitted' && <button onClick={() => approvePayment(p.id, USER_ID)} className="text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: 'rgb(34,197,94)' }}>Onayla</button>}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Henüz hakediş yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EVM TAB
// ============================================================================

function EvmTab() {
  const { evmSnapshots, createEvmSnapshot } = useCostStore();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fDate, setFDate] = useState('');
  const [fPV, setFPV] = useState('');
  const [fEV, setFEV] = useState('');
  const [fAC, setFAC] = useState('');
  const [fBAC, setFBAC] = useState('');

  const latest = evmSnapshots[evmSnapshots.length - 1];

  const handleCreate = async () => {
    if (!fDate || !fPV || !fEV || !fAC || !fBAC) return;
    setSaving(true);
    await createEvmSnapshot({
      projectId: PROJECT_ID,
      snapshotDate: new Date(fDate).toISOString(),
      pv: parseFloat(fPV),
      ev: parseFloat(fEV),
      ac: parseFloat(fAC),
      bac: parseFloat(fBAC),
    });
    setSaving(false);
    setFDate(''); setFPV(''); setFEV(''); setFAC(''); setFBAC('');
    setShowForm(false);
  };

  const evmMetrics = latest ? [
    { label: 'PV (Planned Value)', value: `${fmtShort(latest.pv)} ₺` },
    { label: 'EV (Earned Value)', value: `${fmtShort(latest.ev)} ₺` },
    { label: 'AC (Actual Cost)', value: `${fmtShort(latest.ac)} ₺` },
    { label: 'CV (Cost Variance)', value: `${fmtShort(latest.cv)} ₺`, good: parseFloat(latest.cv) >= 0 },
    { label: 'SV (Schedule Variance)', value: `${fmtShort(latest.sv)} ₺`, good: parseFloat(latest.sv) >= 0 },
    { label: 'CPI', value: parseFloat(latest.cpi).toFixed(4), good: parseFloat(latest.cpi) >= 1 },
    { label: 'SPI', value: parseFloat(latest.spi).toFixed(4), good: parseFloat(latest.spi) >= 1 },
    { label: 'EAC', value: `${fmtShort(latest.eac)} ₺` },
    { label: 'ETC', value: `${fmtShort(latest.etc)} ₺` },
    { label: 'VAC', value: `${fmtShort(latest.vac)} ₺`, good: parseFloat(latest.vac) >= 0 },
    { label: 'TCPI', value: parseFloat(latest.tcpi).toFixed(4) },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Earned Value Management ({evmSnapshots.length} snapshot)</h3>
        <Btn variant={showForm ? 'danger' : 'primary'} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={12} /> İptal</> : <><Plus size={12} /> Yeni Snapshot</>}
        </Btn>
      </div>

      {showForm && (
        <Card className="!border-[var(--color-accent)]">
          <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>EVM Snapshot Oluştur</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} placeholder="Tarih" />
            <Input type="number" value={fPV} onChange={e => setFPV(e.target.value)} placeholder="PV (₺)" />
            <Input type="number" value={fEV} onChange={e => setFEV(e.target.value)} placeholder="EV (₺)" />
            <Input type="number" value={fAC} onChange={e => setFAC(e.target.value)} placeholder="AC (₺)" />
            <Input type="number" value={fBAC} onChange={e => setFBAC(e.target.value)} placeholder="BAC (₺)" />
            <Btn onClick={handleCreate} disabled={saving || !fDate || !fPV || !fEV || !fAC || !fBAC}>
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Oluştur
            </Btn>
          </div>
        </Card>
      )}

      {!latest && !showForm && (
        <Card className="flex flex-col items-center py-12 text-center">
          <TrendingUp size={40} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--color-text-muted)' }}>Henüz EVM verisi yok. Hakediş verilerinden snapshot oluşturun.</p>
        </Card>
      )}

      {latest && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {evmMetrics.map(m => (
              <Card key={m.label} className="!p-3">
                <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{m.label}</div>
                <div className="text-lg font-medium font-mono mt-1"
                  style={{ color: m.good === undefined ? 'var(--color-text)' : m.good ? 'rgb(34,197,94)' : 'var(--color-danger)' }}>
                  {m.value}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>S-Curve Data</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--color-bg-input)' }}>
                    {['Tarih', 'PV (₺)', 'EV (₺)', 'AC (₺)', 'CPI', 'SPI'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evmSnapshots.map(s => (
                    <tr key={s.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text)' }}>{s.snapshotDate?.slice(0, 10)}</td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--color-text-muted)' }}>{fmtShort(s.pv)}</td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--color-accent)' }}>{fmtShort(s.ev)}</td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: 'var(--color-text)' }}>{fmtShort(s.ac)}</td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: parseFloat(s.cpi) >= 1 ? 'rgb(34,197,94)' : 'var(--color-danger)' }}>{parseFloat(s.cpi).toFixed(4)}</td>
                      <td className="px-3 py-2 font-mono text-right" style={{ color: parseFloat(s.spi) >= 1 ? 'rgb(34,197,94)' : 'var(--color-danger)' }}>{parseFloat(s.spi).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
