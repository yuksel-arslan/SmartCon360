'use client';

import { useState } from 'react';
import type { SetupStepProps, BoqItem } from '../types';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Loader2 } from 'lucide-react';

export default function StepBoq({ projectId, state, onStateChange, authFetch }: SetupStepProps) {
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState(state.boqFileName || '');
  const [confirmed, setConfirmed] = useState(state.boqUploaded && state.boqItemCount > 0);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    setConfirmed(false);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const res = await authFetch(`/api/v1/projects/${projectId}/boq/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Upload failed');
      }

      const json = await res.json();
      setBoqItems(json.data.items || []);
      setFileName(json.data.fileName);
      onStateChange({
        boqUploaded: true,
        boqFileName: json.data.fileName,
        boqItemCount: json.data.summary.valid,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');

    try {
      const validItems = boqItems.filter((i) => i.isValid);
      const res = await authFetch(`/api/v1/projects/${projectId}/boq/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems, currency: state.currency }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Confirmation failed');
      }

      const json = await res.json();
      setConfirmed(true);
      onStateChange({
        boqUploaded: true,
        boqItemCount: json.data.imported,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const validCount = boqItems.filter((i) => i.isValid).length;
  const invalidCount = boqItems.filter((i) => !i.isValid).length;

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Bill of Quantities (BOQ)
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Upload your BOQ in Excel or CSV format. If you have a BOQ, the system will automatically extract work items,
        quantities, and link them to the WBS/CBS structure. This step is optional — you can also create items manually later.
      </p>

      {/* Upload area */}
      {!confirmed && (
        <label
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all hover:border-opacity-80"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Loader2 size={24} className="animate-spin mb-2" style={{ color: 'var(--color-accent)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Parsing BOQ...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet size={24} className="mb-2" style={{ color: 'var(--color-accent)' }} />
              <span className="text-[12px] font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Upload BOQ file (Excel / CSV)
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Columns: Code, Description, Unit, Quantity, Unit Price (optional), Category (optional)
              </span>
            </>
          )}
        </label>
      )}

      {error && (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Confirmed state */}
      {confirmed && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--color-success)', background: 'rgba(16,185,129,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-success)' }}>
              <Check size={16} color="white" />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>BOQ Imported Successfully</div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {state.boqItemCount} work items from <strong>{fileName}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setConfirmed(false); setBoqItems([]); }}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--color-accent)', background: 'var(--color-accent-muted)' }}
          >
            Upload different file
          </button>
        </div>
      )}

      {/* Preview table */}
      {boqItems.length > 0 && !confirmed && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
                Parsed Items ({boqItems.length})
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-success)' }}>{validCount} valid</span>
                {invalidCount > 0 && (
                  <span style={{ color: 'var(--color-danger)' }}> · {invalidCount} with errors</span>
                )}
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={confirming || validCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
            >
              {confirming ? (
                <><Loader2 size={12} className="animate-spin" /> Importing...</>
              ) : (
                <><Check size={12} /> Import {validCount} Items to CostPilot</>
              )}
            </button>
          </div>

          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}>
                    <th className="text-left px-3 py-2 font-semibold">Code</th>
                    <th className="text-left px-3 py-2 font-semibold">Description</th>
                    <th className="text-left px-3 py-2 font-semibold">Unit</th>
                    <th className="text-right px-3 py-2 font-semibold">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold">Price</th>
                    <th className="text-center px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.slice(0, 50).map((item) => (
                    <tr
                      key={item.rowIndex}
                      className="border-t"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: item.isValid ? 'transparent' : 'rgba(239,68,68,0.04)',
                      }}
                    >
                      <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>{item.code}</td>
                      <td className="px-3 py-1.5 max-w-[200px] truncate" style={{ color: 'var(--color-text)' }}>{item.name}</td>
                      <td className="px-3 py-1.5" style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--color-text)' }}>
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--color-text)' }}>
                        {item.unitPrice ? item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {item.isValid ? (
                          <Check size={12} style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <span title={item.errors.join(', ')}>
                            <X size={12} style={{ color: 'var(--color-danger)' }} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {boqItems.length > 50 && (
                <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-input)' }}>
                  Showing first 50 of {boqItems.length} items
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {boqItems.length === 0 && !confirmed && !uploading && (
        <p className="mt-4 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          This step is optional. If you don't have a BOQ yet, you can skip this and create work items manually in CostPilot.
        </p>
      )}
    </div>
  );
}
