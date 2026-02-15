'use client';

import type { SetupStepProps } from '../types';
import { Check, X, FileText, FolderTree, DollarSign, Wrench, Image, MapPin, Clock } from 'lucide-react';

export default function StepReview({ state }: SetupStepProps) {
  const standardLabel: Record<string, string> = {
    uniclass: 'Uniclass 2015',
    masterformat: 'MasterFormat 2018',
    uniformat: 'UniFormat II',
    custom: 'Custom',
  };

  const sections = [
    {
      icon: <FolderTree size={16} />,
      label: 'Classification Standard',
      value: standardLabel[state.classificationStandard] || state.classificationStandard,
      done: true,
    },
    {
      icon: <Image size={16} />,
      label: 'Drawings',
      value: state.drawingCount > 0 ? `${state.drawingCount} files uploaded` : 'No drawings uploaded',
      done: state.drawingCount > 0,
      optional: true,
    },
    {
      icon: <FileText size={16} />,
      label: 'BOQ (Bill of Quantities)',
      value: state.boqUploaded
        ? `${state.boqItemCount} items from ${state.boqFileName}`
        : 'Not uploaded',
      done: state.boqUploaded,
      optional: true,
    },
    {
      icon: <FolderTree size={16} />,
      label: 'WBS (Work Breakdown Structure)',
      value: state.wbsGenerated ? `${state.wbsNodeCount} nodes generated` : 'Not generated',
      done: state.wbsGenerated,
    },
    {
      icon: <DollarSign size={16} />,
      label: 'CBS (Cost Breakdown Structure)',
      value: state.cbsGenerated ? `${state.cbsNodeCount} cost categories` : 'Not generated',
      done: state.cbsGenerated,
    },
    {
      icon: <MapPin size={16} />,
      label: 'LBS (Location Breakdown)',
      value: state.lbsConfigured
        ? `${state.locationCount} locations, ${state.zoneCount} zones`
        : 'Not configured',
      done: state.lbsConfigured,
    },
    {
      icon: <Wrench size={16} />,
      label: 'Discipline Trades',
      value: state.tradeCount > 0 ? `${state.tradeCount} trades configured` : 'Not configured',
      done: state.tradeCount > 0,
    },
    {
      icon: <Clock size={16} />,
      label: 'Takt Configuration',
      value: state.taktPlanGenerated
        ? `${state.defaultTaktTime} day takt, ${state.workingDays?.length || 5} working days/week`
        : 'Not configured',
      done: state.taktPlanGenerated,
    },
  ];

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Project Setup Review
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Review your project setup configuration. Click &quot;Finalize Setup&quot; to complete and activate the project.
      </p>

      {/* Project info */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
      >
        <h3
          className="text-lg font-semibold mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          {state.projectName}
        </h3>
        <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          <span className="capitalize">{state.projectType}</span>
          <span>·</span>
          <span>{state.currency}</span>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.label}
            className="flex items-center gap-4 rounded-lg border px-4 py-3"
            style={{
              borderColor: section.done ? 'rgba(16,185,129,0.3)' : section.optional ? 'var(--color-border)' : 'rgba(245,158,11,0.3)',
              background: section.done ? 'rgba(16,185,129,0.04)' : 'var(--color-bg-card)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: section.done
                  ? 'rgba(16,185,129,0.15)'
                  : section.optional
                    ? 'var(--color-bg-input)'
                    : 'rgba(245,158,11,0.15)',
                color: section.done
                  ? 'var(--color-success)'
                  : section.optional
                    ? 'var(--color-text-muted)'
                    : 'var(--color-warning)',
              }}
            >
              {section.done ? <Check size={14} /> : section.optional ? <span className="text-[10px]">—</span> : <X size={14} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                  {section.label}
                </span>
                {section.optional && !section.done && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--color-bg-input)', color: 'var(--color-text-muted)' }}
                  >
                    Optional
                  </span>
                )}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {section.value}
              </div>
            </div>

            <div style={{ color: section.done ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {section.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Integration info */}
      <div
        className="mt-6 rounded-lg px-4 py-3 text-[12px]"
        style={{ background: 'rgba(232,115,26,0.06)', borderLeft: '3px solid var(--color-accent)' }}
      >
        <strong>After finalization:</strong>
        <ul className="mt-1 space-y-1" style={{ color: 'var(--color-text-muted)' }}>
          <li>• LBS zones will be used in TaktFlow for trade flow scheduling</li>
          <li>• WBS nodes will be available in TaktFlow for trade assignment</li>
          <li>• CBS nodes will be linked to CostPilot budget items</li>
          {state.boqUploaded && <li>• BOQ items will be transferred to CostPilot as Work Items</li>}
          <li>• Discipline trades will flow through zones with the configured takt rhythm</li>
        </ul>
      </div>
    </div>
  );
}
