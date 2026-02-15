'use client';

import { X, Plus, Edit3, Trash2, Save, Calculator, Layers, Package } from 'lucide-react';
import { useState } from 'react';
import type { WorkItem, UnitPriceAnalysis } from '@/stores/costStore';
import { ResourceEditor } from './ResourceEditor';

interface WorkItemDetailDrawerProps {
  workItem: WorkItem & {
    unitPriceAnalyses?: Array<
      UnitPriceAnalysis & {
        resources?: Array<{
          id: string;
          resourceType: 'labor' | 'material' | 'equipment' | 'other';
          code?: string | null;
          name: string;
          unit: string;
          quantity: number;
          unitRate: number;
          total: number;
          sortOrder: number;
        }>;
      }
    >;
  };
  isOpen: boolean;
  onClose: () => void;
  currency: 'TRY' | 'USD';
  onCurrencyChange: (currency: 'TRY' | 'USD') => void;
}

const RESOURCE_TYPE_LABELS = {
  labor: { tr: 'İşçilik', en: 'Labor', color: '#3b82f6' },
  material: { tr: 'Malzeme', en: 'Material', color: '#10b981' },
  equipment: { tr: 'Makine/Ekipman', en: 'Equipment', color: '#f59e0b' },
  other: { tr: 'Diğer', en: 'Other', color: '#6b7280' },
};

export function WorkItemDetailDrawer({
  workItem,
  isOpen,
  onClose,
  currency,
  onCurrencyChange,
}: WorkItemDetailDrawerProps) {
  const [showResourceEditor, setShowResourceEditor] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this cost item?')) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch(`/api/v1/cost/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Refresh work item data
      window.location.reload(); // TODO: Better way to refresh
    } catch (error) {
      console.error('Failed to delete resource:', error);
      alert('Failed to delete resource. Please try again.');
    }
  };

  if (!isOpen) return null;

  const analysis = workItem.unitPriceAnalyses?.[0]; // Latest version
  const resources = analysis?.resources || [];

  const formatCurrency = (amount: number) => {
    if (currency === 'TRY') {
      return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const groupedResources = resources.reduce((acc, resource) => {
    if (!acc[resource.resourceType]) {
      acc[resource.resourceType] = [];
    }
    acc[resource.resourceType].push(resource);
    return acc;
  }, {} as Record<string, typeof resources>);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] lg:w-[700px] z-50 flex flex-col shadow-2xl transition-transform"
        style={{ background: 'var(--color-bg-main)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {workItem.code}
              </h2>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
              >
                {workItem.category}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {workItem.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={20} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Currency Selector */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Currency / Para Birimi
            </span>
            <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => onCurrencyChange('TRY')}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background: currency === 'TRY' ? 'var(--color-accent)' : 'transparent',
                  color: currency === 'TRY' ? 'white' : 'var(--color-text-muted)',
                }}
              >
                TRY (₺)
              </button>
              <button
                onClick={() => onCurrencyChange('USD')}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background: currency === 'USD' ? 'var(--color-accent)' : 'transparent',
                  color: currency === 'USD' ? 'white' : 'var(--color-text-muted)',
                }}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* Unit Price Summary */}
          {analysis && (
            <div
              className="rounded-xl p-4 border"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Calculator size={16} />
                  Birim Fiyat Analizi / Unit Price Analysis
                  <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                    (v{analysis.version})
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div style={{ color: 'var(--color-text-muted)' }}>İşçilik / Labor</div>
                  <div className="font-mono font-semibold mt-1" style={{ color: '#3b82f6' }}>
                    {formatCurrency(Number(analysis.laborCost || 0))}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Malzeme / Material</div>
                  <div className="font-mono font-semibold mt-1" style={{ color: '#10b981' }}>
                    {formatCurrency(Number(analysis.materialCost || 0))}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Ekipman / Equipment</div>
                  <div className="font-mono font-semibold mt-1" style={{ color: '#f59e0b' }}>
                    {formatCurrency(Number(analysis.equipmentCost || 0))}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Subtotal</div>
                  <div className="font-mono font-semibold mt-1" style={{ color: 'var(--color-text)' }}>
                    {formatCurrency(Number(analysis.subtotal || 0))}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'var(--color-text-muted)' }}>Genel Giderler / Overhead ({analysis.overheadPct}%)</span>
                  <span className="font-mono" style={{ color: 'var(--color-text)' }}>
                    {formatCurrency(Number(analysis.overheadAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: 'var(--color-text-muted)' }}>Kar / Profit ({analysis.profitPct}%)</span>
                  <span className="font-mono" style={{ color: 'var(--color-text)' }}>
                    {formatCurrency(Number(analysis.profitAmount || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                    Birim Fiyat / Unit Price
                  </span>
                  <span className="font-mono font-bold text-lg" style={{ color: 'var(--color-accent)' }}>
                    {formatCurrency(Number(analysis.unitPrice || 0))} / {workItem.unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown (Resources) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <Layers size={16} />
                Maliyet Kalemleri / Cost Items
              </h3>
              <button
                onClick={() => {
                  setEditingResource(null);
                  setShowResourceEditor(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                <Plus size={14} />
                Add Resource
              </button>
            </div>

            {Object.entries(groupedResources).map(([type, resourceList]) => {
              const typeInfo = RESOURCE_TYPE_LABELS[type as keyof typeof RESOURCE_TYPE_LABELS];
              const typeTotal = resourceList.reduce((sum, r) => sum + Number(r.total), 0);

              return (
                <div
                  key={type}
                  className="mb-4 rounded-xl border overflow-hidden"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {/* Type Header */}
                  <div
                    className="px-4 py-2 flex items-center justify-between"
                    style={{ background: `${typeInfo.color}15` }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ background: typeInfo.color }}
                      />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                        {typeInfo.tr} / {typeInfo.en}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: typeInfo.color }}>
                      {formatCurrency(typeTotal)}
                    </span>
                  </div>

                  {/* Resources */}
                  {resourceList.map((resource) => (
                    <div
                      key={resource.id}
                      className="px-4 py-3 border-t flex items-start justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {resource.code && (
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--color-bg-main)', color: 'var(--color-text-muted)' }}
                            >
                              {resource.code}
                            </span>
                          )}
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                            {resource.name}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                          {resource.quantity.toFixed(4)} {resource.unit} × {formatCurrency(Number(resource.unitRate))} = {' '}
                          <span className="font-semibold" style={{ color: typeInfo.color }}>
                            {formatCurrency(Number(resource.total))}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingResource(resource);
                            setShowResourceEditor(true);
                          }}
                          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
                          title="Edit"
                        >
                          <Edit3 size={14} style={{ color: 'var(--color-text-muted)' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
                          title="Delete"
                        >
                          <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {resources.length === 0 && (
              <div
                className="text-center py-8 rounded-xl border-2 border-dashed"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cost items defined</p>
                <p className="text-xs mt-1">Click "Add Resource" to create detailed breakdown</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div
            className="rounded-lg p-3 text-xs space-y-1"
            style={{ background: 'var(--color-bg-card)' }}
          >
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Source:</span>
              <span style={{ color: 'var(--color-text)' }}>{workItem.source}</span>
            </div>
            {workItem.sourceYear && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Source Year:</span>
                <span style={{ color: 'var(--color-text)' }}>{workItem.sourceYear}</span>
              </div>
            )}
            {analysis && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Analysis Source:</span>
                <span style={{ color: 'var(--color-text)' }}>{analysis.source}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resource Editor Modal */}
      {showResourceEditor && (
        <ResourceEditor
          analysisId={analysis?.id || ''}
          resource={editingResource}
          currency={currency}
          onClose={() => {
            setShowResourceEditor(false);
            setEditingResource(null);
          }}
          onSave={() => {
            setShowResourceEditor(false);
            setEditingResource(null);
            // TODO: Refresh work item data
          }}
        />
      )}
    </>
  );
}
