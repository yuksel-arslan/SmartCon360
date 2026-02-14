'use client';

import { Camera } from 'lucide-react';

export default function VisionPage() {
  const kpis = [
    { label: 'Photos Today', value: '24' },
    { label: 'AI Detections', value: '8' },
    { label: 'Progress Accuracy', value: '96%' },
    { label: 'Zones Captured', value: '18' },
  ];

  const features = [
    'Photo Upload',
    'AI Progress Detection',
    'Defect Detection',
    'Before/After',
    '360 Photos',
    'Time-Lapse',
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            VisionAI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            AI-powered visual progress tracking
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
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

      {/* Coming Soon */}
      <div
        className="rounded-xl border p-12 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
      >
        <Camera size={48} strokeWidth={1} style={{ color: 'var(--color-accent)' }} />
        <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
          VisionAI Module
        </h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
          Upload site photos and let AI analyze construction progress, detect defects, and generate visual progress reports with before/after comparison.
        </p>
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {features.map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
