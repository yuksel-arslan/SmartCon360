'use client';

import { DollarSign, Calculator, FileSpreadsheet, Receipt, TrendingUp, BarChart3, Package, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { ModulePageHeader } from '@/components/modules';

type CostTab = 'overview' | 'work-items' | 'unit-prices' | 'metraj' | 'estimates' | 'budgets' | 'hakedis' | 'evm';

const tabs: { id: CostTab; label: string; icon: typeof DollarSign }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'work-items', label: 'Work Items', icon: ClipboardList },
  { id: 'unit-prices', label: 'Unit Prices', icon: Calculator },
  { id: 'metraj', label: 'Metraj', icon: FileSpreadsheet },
  { id: 'estimates', label: 'Estimates', icon: Package },
  { id: 'budgets', label: 'Budgets', icon: DollarSign },
  { id: 'hakedis', label: 'Hakedis', icon: Receipt },
  { id: 'evm', label: 'EVM', icon: TrendingUp },
];

const overviewKpis = [
  { label: 'CPI', value: '1.03', trend: 'up' },
  { label: 'SPI', value: '0.97', trend: 'down' },
  { label: 'Budget Variance', value: '-2.1%', trend: 'down' },
  { label: 'EAC', value: '48.2M', trend: 'neutral' },
  { label: 'Hakedis (Cumulative)', value: '18.4M', trend: 'up' },
  { label: 'Work Items', value: '342', trend: 'neutral' },
  { label: 'Metraj Completion', value: '78%', trend: 'up' },
  { label: 'COPQ', value: '245K', trend: 'down' },
];

export default function CostPage() {
  const [activeTab, setActiveTab] = useState<CostTab>('overview');

  return (
    <div className="p-6 space-y-6">
      <ModulePageHeader moduleId="cost" />

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

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'work-items' && <WorkItemsTab />}
      {activeTab === 'unit-prices' && <UnitPricesTab />}
      {activeTab === 'metraj' && <MetrajTab />}
      {activeTab === 'estimates' && <EstimatesTab />}
      {activeTab === 'budgets' && <BudgetsTab />}
      {activeTab === 'hakedis' && <HakedisTab />}
      {activeTab === 'evm' && <EvmTab />}
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border p-4"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {kpi.label}
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>
              {kpi.value}
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
            { step: 'Work Items', sub: '342 pozlar', done: true },
            { step: 'Unit Prices', sub: '312 analyzed', done: true },
            { step: 'Metraj', sub: '78% complete', done: false },
            { step: 'Estimates', sub: 'v3 approved', done: true },
            { step: 'Budget', sub: '48.2M active', done: true },
            { step: 'Hakedis', sub: '#6 in progress', done: false },
            { step: 'EVM', sub: 'CPI 1.03', done: true },
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
    </div>
  );
}

function WorkItemsTab() {
  const items = [
    { code: '04.606/2A', name: '250 dozlu beton dokumu', unit: 'm3', category: 'Insaat', unitPrice: '2,450.00' },
    { code: '04.743/1', name: 'Demir isleri (nervurlu)', unit: 'ton', category: 'Insaat', unitPrice: '18,200.00' },
    { code: 'IMO-015', name: 'Sogutma tesisati montaji', unit: 'mt', category: 'Mekanik', unitPrice: '345.00' },
    { code: 'ELK-042', name: 'Kablo cekilmesi (3x2.5mm)', unit: 'mt', category: 'Elektrik', unitPrice: '85.50' },
    { code: '27.581/1', name: 'Alcipan duvar yapilmasi', unit: 'm2', category: 'Insaat', unitPrice: '520.00' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Work Items / Pozlar
        </h3>
        <div className="flex gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            Import Excel
          </button>
          <button
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            + Add Item
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--color-bg-input)' }}>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Code</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Name</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Unit</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Category</th>
              <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.code}
                className="border-t cursor-pointer transition-colors"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-card)'; }}
              >
                <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-accent)' }}>{item.code}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{item.name}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
                    {item.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--color-text)' }}>{item.unitPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
        Detailed breakdown of each work item into labor (iscilik), material (malzeme), and equipment (makine) components. Supports Bayindirlik rates, custom rates, and supplier quotes.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['Labor Breakdown', 'Material Costs', 'Equipment Rates', 'Overhead & Profit', 'Bayindirlik Rates', 'Supplier Quotes', 'Bulk Recalculate'].map((tag) => (
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

function EstimatesTab() {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <Package size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        Cost Estimates (Kesif)
      </h2>
      <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
        Auto-generate cost estimates from metraj quantities and unit price analyses. Create yaklasik maliyet, ihale teklifi, revize kesif, and ek kesif with full version tracking.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['Auto-Generate', 'Version Control', 'Compare Estimates', 'KDV Calculation', 'Approve to Budget', 'Ek Kesif'].map((tag) => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            {tag}
          </span>
        ))}
      </div>
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

function HakedisTab() {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <Receipt size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        Payment Certificates (Hakedis)
      </h2>
      <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
        Progress-based payment management with imalat metraji (measured quantities). Handles retention, advance deductions, price escalation (fiyat farki), and KDV calculation. Feeds directly into EVM as Earned Value.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['Imalat Metraji', 'Retention', 'Advance Deduction', 'Price Escalation', 'KDV', 'PDF Report', 'Cumulative Tracking', 'EVM Feed'].map((tag) => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function EvmTab() {
  return (
    <div
      className="rounded-xl border p-8 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <TrendingUp size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        Earned Value Management
      </h2>
      <p className="text-sm mt-2 max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
        Full EVM dashboard with PV, EV, AC calculations sourced from hakedis data. S-Curve visualization, CPI/SPI trending, and AI-powered EAC/ETC forecasting.
      </p>
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {['PV/EV/AC', 'CPI/SPI', 'S-Curve', 'EAC/ETC Forecast', 'TCPI', 'Trend Analysis', 'COPQ Integration'].map((tag) => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
