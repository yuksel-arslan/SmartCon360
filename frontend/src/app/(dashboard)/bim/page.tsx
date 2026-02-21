'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileUp, Loader2, CheckCircle2, AlertCircle,
  Box, Layers, MapPin, DollarSign, GitBranch, BarChart3,
  ArrowRight, Trash2,
} from 'lucide-react';
import { ModulePageHeader } from '@/components/modules';
import { useBIMStore } from '@/stores/bimStore';

// ── Helpers ─────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      {children}
    </div>
  );
}

function formatSize(mb: number): string {
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

// ── Main Page ───────────────────────────────────────────

export default function BIMPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    uploading, uploadResult, uploadError,
    processing, processError,
    currentResult,
    uploadFile, processProject, reset,
  } = useBIMStore();

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      alert('Only .ifc files are accepted');
      return;
    }
    const result = await uploadFile(file);
    if (result) {
      const processResult = await processProject(result.project_id);
      if (processResult) {
        router.push(`/bim/${processResult.project_id}`);
      }
    }
  }, [uploadFile, processProject, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) handleFileSelect(file);
    e.currentTarget.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const isProcessing = uploading || processing;
  const error = uploadError || processError;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <ModulePageHeader moduleId="bim" />

      {/* Upload Section */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(14,165,233,0.1)' }}
            >
              <Upload size={14} style={{ color: '#0EA5E9' }} />
            </div>
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
              Upload IFC File
            </h3>
          </div>

          {/* Drop zone */}
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-[#0EA5E9]' : ''}`}
            style={{
              borderColor: dragOver ? '#0EA5E9' : 'var(--color-border)',
              background: dragOver ? 'rgba(14,165,233,0.05)' : 'var(--color-bg-input)',
            }}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ifc"
              onChange={handleInputChange}
              className="hidden"
            />

            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin" style={{ color: '#0EA5E9' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {uploading ? 'Uploading IFC file...' : 'Processing BIM data...'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {uploading
                      ? 'Transferring file to BIM Intelligence Engine'
                      : 'Running element extraction, classification, WBS/LBS, zone generation...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileUp size={32} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    Drop IFC file here or click to browse
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Supports .ifc files up to 200 MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', color: 'rgb(239,68,68)' }}
            >
              <AlertCircle size={14} />
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Pipeline Overview */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(14,165,233,0.1)' }}
            >
              <GitBranch size={14} style={{ color: '#0EA5E9' }} />
            </div>
            <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
              BIM Intelligence Pipeline
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { icon: Box, label: 'IFC Parsing', desc: 'Extract building elements' },
              { icon: GitBranch, label: 'Element Graph', desc: 'Spatial & structural relationships' },
              { icon: BarChart3, label: 'Quantity Extraction', desc: 'BaseQuantities + Qto fallback' },
              { icon: Layers, label: 'Classification', desc: 'Uniclass + OmniClass mapping' },
              { icon: MapPin, label: 'WBS Generation', desc: 'Work breakdown structure' },
              { icon: MapPin, label: 'LBS Generation', desc: 'Location breakdown structure' },
              { icon: Layers, label: 'Zone Generation', desc: 'Takt-ready construction zones' },
              { icon: DollarSign, label: 'Cost Binding', desc: 'Cost item stubs per element' },
            ].map((step, i) => (
              <div
                key={i}
                className="rounded-lg p-3 border transition-colors"
                style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <step.icon size={13} style={{ color: '#0EA5E9' }} strokeWidth={1.5} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    {step.label}
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Layer 1 — fully deterministic, no AI dependency. Processes IFC files and produces SmartCon360-compatible output.
          </p>
        </div>
      </Card>

      {/* Capabilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          {
            icon: Box,
            title: 'Element Intelligence',
            desc: 'Extracts all building elements from IFC with full metadata — materials, storeys, properties, and spatial relationships.',
            color: '#0EA5E9',
          },
          {
            icon: Layers,
            title: 'Auto Classification',
            desc: 'Maps IFC entities to Uniclass 2015 and OmniClass codes with confidence scoring for standardized categorization.',
            color: '#8B5CF6',
          },
          {
            icon: MapPin,
            title: 'WBS & LBS Generation',
            desc: 'Automatically generates Work Breakdown and Location Breakdown Structures from the IFC spatial hierarchy.',
            color: '#10B981',
          },
          {
            icon: Layers,
            title: 'Takt Zone Generation',
            desc: 'Creates takt-ready construction zones from storeys and spaces, ready for TaktFlow scheduling.',
            color: '#F59E0B',
          },
          {
            icon: DollarSign,
            title: 'Cost Binding',
            desc: 'Generates cost item stubs linked to elements and quantities, ready for CostPilot integration.',
            color: '#EC4899',
          },
          {
            icon: BarChart3,
            title: 'Quantity Extraction',
            desc: 'Extracts quantities from BaseQuantities, Qto property sets, and geometry fallback — area, volume, length.',
            color: '#F97316',
          },
        ].map((cap) => (
          <Card key={cap.title}>
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${cap.color}12` }}
              >
                <cap.icon size={16} style={{ color: cap.color }} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  {cap.title}
                </h4>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {cap.desc}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
