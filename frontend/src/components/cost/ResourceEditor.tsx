'use client';

import { X, Save, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ResourceEditorProps {
  analysisId: string;
  resource?: {
    id: string;
    resourceType: 'labor' | 'material' | 'equipment' | 'other';
    code?: string | null;
    name: string;
    unit: string;
    quantity: number;
    unitRate: number;
    total: number;
  } | null;
  currency: 'TRY' | 'USD';
  onClose: () => void;
  onSave: () => void;
}

export function ResourceEditor({ analysisId, resource, currency, onClose, onSave }: ResourceEditorProps) {
  const isEdit = !!resource;

  const [resourceType, setResourceType] = useState<'labor' | 'material' | 'equipment' | 'other'>(
    resource?.resourceType || 'material'
  );
  const [code, setCode] = useState(resource?.code || '');
  const [name, setName] = useState(resource?.name || '');
  const [unit, setUnit] = useState(resource?.unit || 'm²');
  const [quantity, setQuantity] = useState(resource?.quantity?.toString() || '1.0');
  const [unitRate, setUnitRate] = useState(resource?.unitRate?.toString() || '0.00');
  const [saving, setSaving] = useState(false);

  const calculatedTotal = parseFloat(quantity || '0') * parseFloat(unitRate || '0');

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);

    try {
      const payload = {
        resourceType,
        code: code.trim() || null,
        name: name.trim(),
        unit: unit.trim(),
        quantity: parseFloat(quantity),
        unitRate: parseFloat(unitRate),
        rateSource: 'manual',
      };

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      let res;
      if (isEdit && resource) {
        // Update existing resource
        res = await fetch(`/api/v1/cost/resources/${resource.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        // Create new resource
        res = await fetch(`/api/v1/cost/unit-prices/${analysisId}/resources`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      onSave();
    } catch (error) {
      console.error('Failed to save resource:', error);
      alert('Failed to save resource. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (currency === 'TRY') {
      return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const RESOURCE_TYPES = [
    { value: 'material', label: 'Malzeme / Material', color: '#10b981' },
    { value: 'labor', label: 'İşçilik / Labor', color: '#3b82f6' },
    { value: 'equipment', label: 'Makine/Ekipman / Equipment', color: '#f59e0b' },
    { value: 'other', label: 'Diğer / Other', color: '#6b7280' },
  ] as const;

  const COMMON_UNITS = [
    'm²', 'm³', 'm', 'kg', 'ton', 'adet', 'takım', 'gün', 'saat',
    'SF', 'CY', 'LF', 'EA', 'LS', 'day', 'hour',
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      >
        {/* Modal */}
        <div
          className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--color-bg-main)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {isEdit ? 'Edit Resource / Kaynağı Düzenle' : 'Add Resource / Kaynak Ekle'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              disabled={saving}
            >
              <X size={20} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>

          {/* Form */}
          <div className="px-6 py-5 space-y-5">
            {/* Resource Type */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Kaynak Tipi / Resource Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RESOURCE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setResourceType(type.value)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all"
                    style={{
                      borderColor: resourceType === type.value ? type.color : 'var(--color-border)',
                      background: resourceType === type.value ? `${type.color}15` : 'transparent',
                      color: resourceType === type.value ? type.color : 'var(--color-text)',
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded"
                      style={{ background: type.color }}
                    />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code (optional) */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Kaynak Kodu / Resource Code (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., M-100, L-205, E-150"
                className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Kaynak Adı / Resource Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Hazır Alçı Sıva, Alçı Sıva Taşeronu"
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Birim / Unit *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                }}
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity & Unit Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Miktar / Quantity *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Birim Fiyat / Unit Rate * ({currency === 'TRY' ? '₺' : '$'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={unitRate}
                  onChange={(e) => setUnitRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>

            {/* Calculated Total */}
            <div
              className="rounded-lg p-4 border"
              style={{
                borderColor: 'var(--color-accent)',
                background: 'var(--color-accent-muted)',
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  Toplam / Total:
                </span>
                <span className="text-xl font-bold font-mono" style={{ color: 'var(--color-accent)' }}>
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>
              <div className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {quantity} {unit} × {formatCurrency(parseFloat(unitRate || '0'))} / {unit}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isEdit ? 'Update Resource' : 'Add Resource'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
