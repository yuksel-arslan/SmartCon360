'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetupStepProps, DrawingFile } from '../types';
import { DISCIPLINES } from '../types';
import { Upload, FileText, Trash2, Loader2, AlertCircle, HardDrive, CheckCircle2 } from 'lucide-react';

const ALLOWED_EXTENSIONS = '.pdf,.dwg,.dxf,.rvt,.ifc';
const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  dwg: 'AutoCAD DWG',
  dxf: 'DXF',
  rvt: 'Revit',
  ifc: 'IFC/BIM',
};

export default function StepDrawings({ projectId, state, onStateChange, authHeaders }: SetupStepProps) {
  const [drawings, setDrawings] = useState<DrawingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('architectural');
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);

  // Check Google Drive connection status (granted at login)
  useEffect(() => {
    const checkDrive = async () => {
      try {
        const res = await fetch('/api/v1/auth/google/drive-connect', {
          headers: { ...authHeaders },
        });
        if (res.ok) {
          const json = await res.json();
          setDriveConnected(json.data?.connected || false);
        }
      } catch {
        // ignore
      }
    };
    checkDrive();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchDrawings = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/drawings`, {
        headers: { ...authHeaders },
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setDrawings(list);
        if (list.length !== state.drawingCount) {
          onStateChange({ drawingCount: list.length });
        }
      }
    } catch {
      // ignore
    }
  }, [projectId, authHeaders, state.drawingCount, onStateChange]);

  useEffect(() => {
    fetchDrawings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('discipline', selectedDiscipline);

      const res = await fetch(`/api/v1/projects/${projectId}/drawings`, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Upload failed');
      }

      const json = await res.json();
      setDrawings((prev) => [...prev, ...(json.data || [])]);
      onStateChange({ drawingCount: state.drawingCount + (json.data?.length || 0) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (drawingId: string) => {
    try {
      await fetch(`/api/v1/projects/${projectId}/drawings/${drawingId}`, { method: 'DELETE', headers: { ...authHeaders } });
      setDrawings((prev) => prev.filter((d) => d.id !== drawingId));
      onStateChange({ drawingCount: Math.max(0, state.drawingCount - 1) });
    } catch {
      // ignore
    }
  };

  const groupedByDiscipline = drawings.reduce<Record<string, DrawingFile[]>>((acc, d) => {
    if (!acc[d.discipline]) acc[d.discipline] = [];
    acc[d.discipline].push(d);
    return acc;
  }, {});

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Project Drawings
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Upload your project drawings organized by discipline. Supported formats: PDF, DWG, DXF, RVT, IFC.
      </p>

      {/* Google Drive status — auto-connected at login */}
      <div
        className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3 border"
        style={{
          borderColor: driveConnected ? 'rgba(34,197,94,0.3)' : 'var(--color-border)',
          background: driveConnected ? 'rgba(34,197,94,0.05)' : 'var(--color-bg-card)',
        }}
      >
        {driveConnected === null ? (
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        ) : driveConnected ? (
          <>
            <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
            <div>
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>
                Google Drive connected
              </span>
              <span className="text-[11px] ml-2" style={{ color: 'var(--color-text-muted)' }}>
                Files saved to SmartCon360/ on your Drive — max 100 MB per file
              </span>
            </div>
          </>
        ) : (
          <>
            <HardDrive size={16} style={{ color: '#f59e0b' }} />
            <div>
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>
                Local storage
              </span>
              <span className="text-[11px] ml-2" style={{ color: 'var(--color-text-muted)' }}>
                Project owner must sign in with Google for Drive storage. Currently max 20 MB per file.
              </span>
            </div>
          </>
        )}
      </div>

      {/* Discipline selector */}
      <div className="mb-4">
        <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          Upload discipline
        </label>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.filter((d) => d.value !== 'general').map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDiscipline(d.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: selectedDiscipline === d.value ? d.color + '20' : 'var(--color-bg-input)',
                color: selectedDiscipline === d.value ? d.color : 'var(--color-text-muted)',
                border: `1px solid ${selectedDiscipline === d.value ? d.color : 'var(--color-border)'}`,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <label
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all hover:border-opacity-80"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
      >
        <input
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS}
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <>
            <Loader2 size={24} className="animate-spin mb-2" style={{ color: 'var(--color-accent)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Uploading{driveConnected ? ' to Google Drive' : ''}...
            </span>
          </>
        ) : (
          <>
            <Upload size={24} className="mb-2" style={{ color: 'var(--color-accent)' }} />
            <span className="text-[12px] font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              Click to upload or drag files here
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              PDF, DWG, DXF, RVT, IFC — max {driveConnected ? '100' : '20'} MB per file
            </span>
          </>
        )}
      </label>

      {error && (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Uploaded drawings list */}
      {drawings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
            Uploaded Drawings ({drawings.length})
          </h3>

          {Object.entries(groupedByDiscipline).map(([disc, files]) => {
            const discInfo = DISCIPLINES.find((d) => d.value === disc);
            return (
              <div key={disc} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: discInfo?.color || '#6B7280' }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                    {discInfo?.label || disc} ({files.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {files.map((d) => {
                    const meta = (d as unknown as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
                    const isOnDrive = meta?.storageProvider === 'google-drive';
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2 border"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} style={{ color: discInfo?.color || 'var(--color-text-muted)' }} />
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text)' }}>
                              {d.originalName}
                            </div>
                            <div className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                              {FILE_TYPE_LABELS[d.fileType] || d.fileType.toUpperCase()} · {(d.fileSize / 1024 / 1024).toFixed(1)} MB
                              {isOnDrive && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: 'rgba(66,133,244,0.1)', color: '#4285F4' }}>
                                  <HardDrive size={8} /> Drive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {drawings.length === 0 && (
        <div className="mt-4 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          No drawings uploaded yet. You can skip this step and upload drawings later.
        </div>
      )}
    </div>
  );
}
