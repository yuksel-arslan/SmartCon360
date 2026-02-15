'use client';

import {
  DollarSign,
  Calculator,
  FileSpreadsheet,
  Receipt,
  TrendingUp,
  BarChart3,
  Package,
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  Trash2,
  Plus,
  Upload,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ModulePageHeader } from '@/components/modules';
import { useCostStore } from '@/stores/costStore';
import { useProjectStore } from '@/stores/projectStore';

type CostTab = 'overview' | 'work-items' | 'unit-prices' | 'metraj' | 'estimates' | 'budgets' | 'hakedis' | 'evm';

const tabs: { id: CostTab; label: string; icon: typeof DollarSign }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'work-items', label: 'Work Items', icon: ClipboardList },
  { id: 'unit-prices', label: 'Unit Prices', icon: Calculator },
  { id: 'metraj', label: 'Metraj', icon: FileSpreadsheet },
  { id: 'estimates', label: 'Estimates', icon: Package },
  { id: 'budgets', label: 'Budgets', icon: DollarSign },
  { id: 'hakedis', label: 'Hakediş', icon: Receipt },
  { id: 'evm', label: 'EVM', icon: TrendingUp },
];

export default function CostPage() {
  const [activeTab, setActiveTab] = useState<CostTab>('overview');
  const { activeProjectId } = useProjectStore();
  const { loading, error, initialized, usingApi, fetchAll } = useCostStore();

  const loadData = useCallback(async () => {
    const projectId = activeProjectId || 'p1';
    await fetchAll(projectId);
  }, [activeProjectId, fetchAll]);

  useEffect(() => {
    if (!initialized) {
      loadData();
    }
  }, [initialized, loadData]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
      <ModulePageHeader moduleId="cost" />

      {/* API Status */}
      {initialized && !usingApi && (
        <div
          className="rounded-lg px-4 py-2 flex items-center gap-2 text-[11px]"
          style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
        >
          <AlertCircle size={14} />
          Demo verileri gösteriliyor — Backend bağlantısı kurulamadı
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-3 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl border p-1"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && !initialized && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        </div>
      )}

      {/* Tab Content */}
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

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function TrendIcon({ value, size = 12 }: { value: number; size?: number }) {
  if (value > 0) return <ArrowUpRight size={size} style={{ color: 'var(--color-success)' }} />;
  if (value < 0) return <ArrowDownRight size={size} style={{ color: 'var(--color-danger)' }} />;
  return <Minus size={size} style={{ color: 'var(--color-text-muted)' }} />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'var(--color-bg-input)', text: 'var(--color-text-muted)' },
    submitted: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' },
    approved: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
    paid: { bg: 'var(--color-accent-muted)', text: 'var(--color-accent)' },
    superseded: { bg: 'rgba(156,163,175,0.1)', text: 'rgb(156,163,175)' },
    active: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' },
  };

  const c = colors[status] || colors.draft;

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const { kpis, workItems, estimates, payments } = useCostStore();

  const kpiCards = [
    {
      label: 'CPI',
      value: kpis.cpi.toFixed(2),
      trend: kpis.cpi >= 1 ? 1 : -1,
      desc: kpis.cpi >= 1 ? 'Under budget' : 'Over budget',
    },
    {
      label: 'SPI',
      value: kpis.spi.toFixed(2),
      trend: kpis.spi >= 1 ? 1 : -1,
      desc: kpis.spi >= 1 ? 'On schedule' : 'Behind schedule',
    },
    {
      label: 'Budget Variance',
      value: `${kpis.budgetVariancePct > 0 ? '+' : ''}${kpis.budgetVariancePct.toFixed(1)}%`,
      trend: kpis.budgetVariancePct,
      desc: 'Actual vs planned',
    },
    {
      label: 'EAC',
      value: `${formatCurrency(kpis.eac)} ₺`,
      trend: 0,
      desc: 'Estimate at completion',
    },
    {
      label: 'Hakediş (Kümülatif)',
      value: `${formatCurrency(kpis.cumulativeHakedis)} ₺`,
      trend: 1,
      desc: `${payments.length} dönem`,
    },
    {
      label: 'Work Items',
      value: kpis.workItemCount.toString(),
      trend: 0,
      desc: `${workItems.filter((w) => w.isActive).length} aktif`,
    },
    {
      label: 'Metraj Tamamlanma',
      value: `${kpis.metrajCompletionPct}%`,
      trend: 1,
      desc: 'Quantity takeoff',
    },
    {
      label: 'COPQ',
      value: `${formatCurrency(kpis.copq)} ₺`,
      trend: -1,
      desc: 'Cost of poor quality',
    },
  ];

  const latestEstimate = estimates.find((e) => e.status === 'approved') || estimates[estimates.length - 1];
  const draftPayment = payments.find((p) => p.status === 'draft');

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border p-4"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {kpi.label}
              </div>
              <TrendIcon value={kpi.trend} />
            </div>
            <div className="text-2xl font-medium mt-1" style={{ color: 'var(--color-text)' }}>
              {kpi.value}
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {kpi.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Cost Lifecycle */}
      <div
        className="rounded-xl border p-6"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Cost Lifecycle Pipeline
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { step: 'Work Items', sub: `${kpis.workItemCount} pozlar`, done: kpis.workItemCount > 0 },
            { step: 'Unit Prices', sub: `${workItems.filter((w) => w.unitPriceAnalyses?.length).length} analyzed`, done: true },
            { step: 'Metraj', sub: `${kpis.metrajCompletionPct}% complete`, done: kpis.metrajCompletionPct >= 100 },
            { step: 'Keşif', sub: latestEstimate ? `v${latestEstimate.version} ${latestEstimate.status}` : 'Not started', done: !!latestEstimate && latestEstimate.status === 'approved' },
            { step: 'Bütçe', sub: `${formatCurrency(kpis.eac)} ₺ active`, done: true },
            { step: 'Hakediş', sub: draftPayment ? `#${draftPayment.periodNumber} in progress` : `${payments.length} completed`, done: !draftPayment },
            { step: 'EVM', sub: `CPI ${kpis.cpi.toFixed(2)}`, done: kpis.cpi >= 0.95 },
          ].map((item, i, arr) => (
            <div key={item.step} className="flex items-center gap-2">
              <div
                className="flex flex-col items-center px-3 py-2 rounded-lg min-w-[90px]"
                style={{
                  background: item.done ? 'var(--color-accent-muted)' : 'var(--color-bg-input)',
                  border: '1px solid',
                  borderColor: item.done ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                <span
                  className="text-xs font-semibold"
                  style={{ color: item.done ? 'var(--color-accent)' : 'var(--color-text)' }}
                >
                  {item.step}
                </span>
                <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {item.sub}
                </span>
              </div>
              {i < arr.length - 1 && (
                <span className="text-lg" style={{ color: 'var(--color-text-muted)' }}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latest Hakedis */}
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Son Hakediş Durumu
          </h3>
          {payments.slice(-3).reverse().map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono font-medium" style={{ color: 'var(--color-accent)' }}>
                  #{p.periodNumber}
                </div>
                <div>
                  <div className="text-xs" style={{ color: 'var(--color-text)' }}>
                    {formatCurrency(parseFloat(p.grossAmount))} ₺
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {p.periodStart} — {p.periodEnd}
                  </div>
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>

        {/* Estimates History */}
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Keşif Geçmişi
          </h3>
          {estimates.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  {e.name}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {formatCurrency(parseFloat(e.grandTotal))} ₺ (KDV dahil)
                </div>
              </div>
              <StatusBadge status={e.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WORK ITEMS TAB
// ============================================================================

function WorkItemsTab() {
  const { workItems, addWorkItem, deleteWorkItem } = useCostStore();
  const { activeProjectId } = useProjectStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('m2');
  const [formCategory, setFormCategory] = useState('insaat');
  const [formSource, setFormSource] = useState('custom');

  const categories = [...new Set(workItems.map((w) => w.category))];

  const filtered = workItems.filter((item) => {
    const matchSearch =
      !search ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const handleAdd = async () => {
    if (!formCode.trim() || !formName.trim()) return;
    setSaving(true);
    await addWorkItem(activeProjectId || 'p1', {
      code: formCode.trim(),
      name: formName.trim(),
      unit: formUnit,
      category: formCategory,
      source: formSource,
    });
    setSaving(false);
    setFormCode('');
    setFormName('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteWorkItem(id);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Work Items / Pozlar ({filtered.length})
        </h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border outline-none"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-input)',
              color: 'var(--color-text)',
            }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border outline-none"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-bg-input)',
              color: 'var(--color-text)',
            }}
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" className="hidden" />
          <button
            onClick={handleImportClick}
            className="text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            <Upload size={12} /> Import Excel
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            style={{ background: showForm ? 'var(--color-danger)' : 'var(--color-accent)', color: '#fff' }}
          >
            {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add Item</>}
          </button>
        </div>
      </div>

      {/* Inline Add Form */}
      {showForm && (
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-accent)' }}
        >
          <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Yeni Poz Ekle</h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Poz kodu *"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
            />
            <input
              type="text"
              placeholder="Poz adı *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border outline-none col-span-2"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
            />
            <select
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
            >
              {['m2', 'm3', 'mt', 'kg', 'ton', 'adet', 'tk', 'sa'].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
            >
              {['insaat', 'mekanik', 'elektrik', 'altyapi', 'peyzaj'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={saving || !formCode.trim() || !formName.trim()}
              className="text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Ekle
            </button>
          </div>
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-input)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Code</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Name</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Unit</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Category</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Source</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Unit Price (₺)</th>
                <th className="w-10 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-t cursor-pointer transition-colors group"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-card)'; }}
                >
                  <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-accent)' }}>
                    {item.code}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{item.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] capitalize" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] capitalize" style={{ color: 'var(--color-text-muted)' }}>
                      {item.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--color-text)' }}>
                    {item.unitPriceAnalyses?.[0]
                      ? formatNumber(parseFloat(item.unitPriceAnalyses[0].unitPrice))
                      : '—'}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                      title="Sil"
                    >
                      <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  </td>
                </tr>
              ))}
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
  const { estimates, createEstimate } = useCostStore();
  const { activeProjectId } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('yaklasik_maliyet');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    await createEstimate(activeProjectId || 'p1', { name: formName.trim(), type: formType });
    setSaving(false);
    setFormName('');
    setShowForm(false);
  };

  const createButton = (
    <button
      onClick={() => setShowForm(true)}
      className="text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
      style={{ background: 'var(--color-accent)', color: '#fff' }}
    >
      <Plus size={12} /> Yeni Keşif
    </button>
  );

  if (estimates.length === 0 && !showForm) {
    return (
      <div
        className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <Package size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
        <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
          Keşif oluşturun
        </h2>
        <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
          Metraj ve birim fiyat analizlerinden otomatik keşif oluşturun veya manuel ekleyin.
        </p>
        <div className="mt-4">{createButton}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Keşifler ({estimates.length})
        </h3>
        <div className="flex gap-2">
          {showForm ? (
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{ background: 'var(--color-danger)', color: '#fff' }}
            >
              <X size={12} /> Cancel
            </button>
          ) : createButton}
        </div>
      </div>

      {/* Inline Create Form */}
      {showForm && (
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-accent)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Keşif adı *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border outline-none col-span-2"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
            />
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
            >
              <option value="yaklasik_maliyet">Yaklaşık Maliyet</option>
              <option value="ihale_teklifi">İhale Teklifi</option>
              <option value="revize_kesif">Revize Keşif</option>
              <option value="ek_kesif">Ek Keşif</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
              className="text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Oluştur
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {estimates.map((e) => (
          <div
            key={e.id}
            className="rounded-xl border p-5 cursor-pointer transition-colors"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                {e.name}
              </span>
              <StatusBadge status={e.status} />
            </div>
            <div className="text-lg font-medium font-mono" style={{ color: 'var(--color-accent)' }}>
              {formatCurrency(parseFloat(e.totalAmount))} ₺
            </div>
            <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              KDV dahil: {formatCurrency(parseFloat(e.grandTotal))} ₺ (KDV %{parseFloat(e.vatPct).toFixed(0)})
            </div>
            <div className="text-[10px] mt-2 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <FileText size={10} />
              v{e.version} — {e.type.replace('_', ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HAKEDIS TAB
// ============================================================================

function HakedisTab() {
  const { payments, createPayment } = useCostStore();
  const { activeProjectId } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formStart || !formEnd) return;
    setSaving(true);
    await createPayment(activeProjectId || 'p1', { periodStart: formStart, periodEnd: formEnd });
    setSaving(false);
    setFormStart('');
    setFormEnd('');
    setShowForm(false);
  };

  const createButton = (
    <button
      onClick={() => setShowForm(!showForm)}
      className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
      style={{ background: showForm ? 'var(--color-danger)' : 'var(--color-accent)', color: '#fff' }}
    >
      {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Yeni Hakediş</>}
    </button>
  );

  if (payments.length === 0 && !showForm) {
    return (
      <div
        className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <Receipt size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
        <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
          İlk Hakediş
        </h2>
        <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
          İmalat metrajı girerek hakediş oluşturun. Teminat, avans kesintisi, fiyat farkı ve KDV otomatik hesaplanır.
        </p>
        <div className="mt-4">{createButton}</div>
      </div>
    );
  }

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
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Hakediş Belgeleri ({payments.length})
        </h3>
        {createButton}
      </div>

      {/* Inline Create Form */}
      {showForm && (
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-accent)' }}
        >
          <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Hakediş #{payments.length + 1}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Dönem Başlangıç</label>
              <input
                type="date"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border outline-none w-full"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-muted)' }}>Dönem Bitiş</label>
              <input
                type="date"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border outline-none w-full"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                disabled={saving || !formStart || !formEnd}
                className="text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 w-full justify-center"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div
        className="rounded-xl border p-5 grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Toplam Hakediş</div>
          <div className="text-lg font-medium font-mono" style={{ color: 'var(--color-text)' }}>
            {payments.length}
          </div>
        </div>
        <div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Kümülatif Tutar</div>
          <div className="text-lg font-medium font-mono" style={{ color: 'var(--color-accent)' }}>
            {formatCurrency(parseFloat(payments[payments.length - 1]?.cumulativeAmount || '0'))} ₺
          </div>
        </div>
        <div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Ödenen</div>
          <div className="text-lg font-medium font-mono" style={{ color: 'rgb(34,197,94)' }}>
            {payments.filter((p) => p.status === 'paid').length} hakediş
          </div>
        </div>
        <div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Bekleyen</div>
          <div className="text-lg font-medium font-mono" style={{ color: 'rgb(245,158,11)' }}>
            {payments.filter((p) => p.status === 'submitted' || p.status === 'draft').length} hakediş
          </div>
        </div>
      </div>

      {/* Hakedis Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-input)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>#</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Period</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Brüt (₺)</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Net (₺)</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Kümülatif (₺)</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-t cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-card)'; }}
                >
                  <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-accent)' }}>
                    {p.periodNumber}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                    {p.periodStart} — {p.periodEnd}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--color-text)' }}>
                    {formatNumber(parseFloat(p.grossAmount))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--color-text)' }}>
                    {formatNumber(parseFloat(p.netAmount))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium" style={{ color: 'var(--color-accent)' }}>
                    {formatNumber(parseFloat(p.cumulativeAmount))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(p.status)}
                      <StatusBadge status={p.status} />
                    </div>
                  </td>
                </tr>
              ))}
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
  const { evmSnapshots } = useCostStore();
  const latest = evmSnapshots[evmSnapshots.length - 1];

  if (!latest) {
    return (
      <div
        className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <TrendingUp size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
        <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
          EVM verisi yok
        </h2>
        <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
          Hakediş verilerinden EVM snapshot oluşturun. PV, EV, AC otomatik hesaplanır.
        </p>
      </div>
    );
  }

  const evmMetrics = [
    { label: 'PV (Planned Value)', value: formatCurrency(parseFloat(latest.pv)), suffix: '₺' },
    { label: 'EV (Earned Value)', value: formatCurrency(parseFloat(latest.ev)), suffix: '₺' },
    { label: 'AC (Actual Cost)', value: formatCurrency(parseFloat(latest.ac)), suffix: '₺' },
    { label: 'CV (Cost Variance)', value: formatCurrency(parseFloat(latest.cv)), suffix: '₺', isPositiveGood: true },
    { label: 'SV (Schedule Variance)', value: formatCurrency(parseFloat(latest.sv)), suffix: '₺', isPositiveGood: true },
    { label: 'CPI', value: parseFloat(latest.cpi).toFixed(4), isPositiveGood: true, threshold: 1 },
    { label: 'SPI', value: parseFloat(latest.spi).toFixed(4), isPositiveGood: true, threshold: 1 },
    { label: 'EAC', value: formatCurrency(parseFloat(latest.eac)), suffix: '₺' },
    { label: 'ETC', value: formatCurrency(parseFloat(latest.etc)), suffix: '₺' },
    { label: 'VAC', value: formatCurrency(parseFloat(latest.vac)), suffix: '₺', isPositiveGood: true },
    { label: 'TCPI', value: parseFloat(latest.tcpi).toFixed(4) },
  ];

  return (
    <div className="space-y-6">
      {/* EVM Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {evmMetrics.map((m) => {
          const numVal = parseFloat(m.value.replace(/[^0-9.-]/g, ''));
          let color = 'var(--color-text)';
          if (m.isPositiveGood) {
            const threshold = m.threshold || 0;
            color = numVal >= threshold ? 'rgb(34,197,94)' : 'var(--color-danger)';
          }

          return (
            <div
              key={m.label}
              className="rounded-xl border p-3"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {m.label}
              </div>
              <div className="text-lg font-medium font-mono mt-1" style={{ color }}>
                {m.value}{m.suffix ? ` ${m.suffix}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* S-Curve Data Table */}
      <div
        className="rounded-xl border p-5"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          S-Curve Data ({evmSnapshots.length} snapshot)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-bg-input)' }}>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Date</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>PV (₺)</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>EV (₺)</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>AC (₺)</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>CPI</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--color-text-muted)' }}>SPI</th>
              </tr>
            </thead>
            <tbody>
              {evmSnapshots.map((s) => (
                <tr
                  key={s.id}
                  className="border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td className="px-3 py-2 font-mono" style={{ color: 'var(--color-text)' }}>
                    {s.snapshotDate}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    {formatNumber(parseFloat(s.pv))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--color-accent)' }}>
                    {formatNumber(parseFloat(s.ev))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--color-text)' }}>
                    {formatNumber(parseFloat(s.ac))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: parseFloat(s.cpi) >= 1 ? 'rgb(34,197,94)' : 'var(--color-danger)' }}>
                    {parseFloat(s.cpi).toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: parseFloat(s.spi) >= 1 ? 'rgb(34,197,94)' : 'var(--color-danger)' }}>
                    {parseFloat(s.spi).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PLACEHOLDER TABS (to be expanded with full API integration)
// ============================================================================

function UnitPricesTab() {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <Calculator size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        Unit Price Analysis
      </h2>
      <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
        Detailed breakdown of each work item into labor (işçilik), material (malzeme), and equipment (makine) components. Supports Bayındırlık rates, custom rates, and supplier quotes.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['Labor Breakdown', 'Material Costs', 'Equipment Rates', 'Overhead & Profit', 'Bayındırlık Rates', 'Supplier Quotes', 'Bulk Recalculate'].map((tag) => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetrajTab() {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <FileSpreadsheet size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        Quantity Takeoff (Metraj)
      </h2>
      <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
        Measure and calculate quantities for each work item per location. Supports manual entry with calculation formulas, Excel/CSV import, and BIM-based auto-extraction when available.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['Manual Entry', 'Excel Import', 'BIM Extraction', 'Calculation Formulas', 'Location-Based', 'Drawing References', 'Revision Tracking'].map((tag) => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            {tag}
          </span>
        ))}
      </div>
      <p className="text-xs mt-4 italic" style={{ color: 'var(--color-text-muted)' }}>
        BIM is optional. Metraj works fully without BIM via manual entry or spreadsheet import.
      </p>
    </div>
  );
}

function BudgetsTab() {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <DollarSign size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        Budget Management
      </h2>
      <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
        Create budgets from approved estimates. Track planned, committed, and actual amounts per WBS item. Monitor budget variance with real-time cost tracking.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['WBS Aligned', 'Planned vs Actual', 'Committed Costs', 'Variance Analysis', 'Cash Flow', 'Approval Workflow'].map((tag) => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
