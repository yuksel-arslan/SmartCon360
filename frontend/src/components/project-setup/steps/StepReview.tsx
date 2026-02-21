'use client';

import type { SetupStepProps } from '../types';
import {
  getMissingRequiredSteps,
  BUILDING_TYPES,
  PROJECT_PHASES,
  STRUCTURAL_SYSTEMS,
  MEP_COMPLEXITY_LEVELS,
  FLOW_DIRECTIONS,
  DELIVERY_METHODS,
  CONTRACT_PRICING_MODELS,
  SITE_CONDITIONS,
  calculateRecommendedTakt,
  getModuleBehavior,
} from '../types';
import { Check, X, FileText, FolderTree, DollarSign, Wrench, Image, MapPin, Clock, AlertTriangle, Building2, Layers, Zap, ArrowUpDown } from 'lucide-react';

export default function StepReview({ state }: SetupStepProps) {
  const standardLabel: Record<string, string> = {
    uniclass: 'Uniclass 2015',
    omniclass: 'OmniClass',
    custom: 'Custom',
  };

  // Lookups
  const buildingTypeObj = BUILDING_TYPES.find((b) => b.value === state.buildingType);
  const phaseObj = PROJECT_PHASES.find((p) => p.value === state.projectPhase);
  const structObj = STRUCTURAL_SYSTEMS.find((s) => s.value === state.structuralSystem);
  const mepObj = MEP_COMPLEXITY_LEVELS.find((m) => m.value === state.mepComplexity);
  const flowObj = FLOW_DIRECTIONS.find((f) => f.value === state.flowDirection);
  const deliveryObj = DELIVERY_METHODS.find((d) => d.value === state.deliveryMethod);
  const pricingObj = CONTRACT_PRICING_MODELS.find((p) => p.value === state.contractPricingModel);
  const siteObj = SITE_CONDITIONS.find((s) => s.value === state.siteCondition);
  const moduleBehavior = state.contractPricingModel ? getModuleBehavior(state.contractPricingModel) : null;

  const buildingLabel = buildingTypeObj ? `${buildingTypeObj.icon} ${buildingTypeObj.label}` : state.buildingType || 'Not selected';
  const isInfra = state.buildingType === 'infrastructure';

  const floorSummary = !isInfra && state.floorCount > 0
    ? `${state.floorCount} floor${state.floorCount !== 1 ? 's' : ''}${state.basementCount > 0 ? ` + ${state.basementCount} basement${state.basementCount !== 1 ? 's' : ''}` : ''}, ${state.zonesPerFloor} zone${state.zonesPerFloor !== 1 ? 's' : ''}/floor`
    : isInfra ? 'Linear sections' : '';

  const areaSummary = state.typicalFloorArea > 0
    ? `${state.typicalFloorArea.toLocaleString()} m²/floor, zone ~${Math.round(state.typicalFloorArea / state.zonesPerFloor)} m²`
    : '';

  const taktRec = calculateRecommendedTakt(state);

  const sections = [
    {
      icon: <FolderTree size={16} />,
      label: 'Classification Standard',
      value: standardLabel[state.classificationStandard] || state.classificationStandard,
      done: true,
    },
    {
      icon: <Building2 size={16} />,
      label: 'Building Type',
      value: `${buildingLabel}${phaseObj ? ` — ${phaseObj.icon} ${phaseObj.label}` : ''}`,
      done: !!state.buildingType && !!state.projectPhase,
    },
    {
      icon: <Layers size={16} />,
      label: 'Building Configuration',
      value: [
        floorSummary,
        areaSummary,
        structObj ? `${structObj.icon} ${structObj.label}` : '',
        mepObj ? `MEP: ${mepObj.label}` : '',
        flowObj ? flowObj.label : '',
      ].filter(Boolean).join(' · ') || 'Not configured',
      done: !!state.structuralSystem && !!state.mepComplexity,
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
        ? `${state.defaultTaktTime} day takt, ${state.bufferSize} buffer, ${state.workingDays?.length || 5} working days/week`
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

      {/* Project info card */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
      >
        <h3
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          {state.projectName}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
          <span>{buildingLabel}</span>
          <span>·</span>
          <span>{standardLabel[state.classificationStandard] || state.classificationStandard}</span>
          {phaseObj && <><span>·</span><span>{phaseObj.icon} {phaseObj.label}</span></>}
          <span>·</span>
          <span>{state.currency}</span>
        </div>

        {/* Compact parameter summary */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            structObj && { label: 'Structure', value: `${structObj.icon} ${structObj.label}` },
            mepObj && { label: 'MEP', value: mepObj.label },
            deliveryObj && { label: 'Delivery', value: deliveryObj.label },
            pricingObj && { label: 'Pricing', value: pricingObj.label },
            siteObj && { label: 'Site', value: siteObj.label },
          ].filter(Boolean).map((item) => (
            <div
              key={item!.label}
              className="rounded px-2 py-1.5 text-[10px]"
              style={{ background: 'var(--color-bg-input)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>{item!.label}: </span>
              <span style={{ color: 'var(--color-text)' }}>{item!.value}</span>
            </div>
          ))}
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

      {/* Missing steps warning */}
      {(() => {
        const missing = getMissingRequiredSteps(state);
        if (missing.length === 0) return null;
        return (
          <div
            className="mt-6 flex items-start gap-3 rounded-lg px-4 py-3 text-[12px]"
            style={{ background: 'rgba(239,68,68,0.08)', borderLeft: '3px solid var(--color-danger)' }}
          >
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
            <div>
              <strong style={{ color: 'var(--color-danger)' }}>Cannot finalize — missing required steps:</strong>
              <ul className="mt-1 space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {missing.map((m) => (
                  <li key={m}>• {m}</li>
                ))}
              </ul>
              <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Go back and complete the steps marked with <X size={10} className="inline" style={{ color: 'var(--color-warning)' }} /> before finalizing.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Contract-driven module behavior */}
      {moduleBehavior && pricingObj && (
        <div
          className="mt-6 rounded-lg px-4 py-3 text-[12px]"
          style={{ background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid #6366F1' }}
        >
          <strong style={{ color: '#6366F1' }}>Contract-Driven Module Behavior — {pricingObj.label}</strong>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="rounded px-2 py-1.5" style={{ background: 'var(--color-bg-input)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>CostPilot: </span>
              <span style={{ color: 'var(--color-text)' }}>
                {moduleBehavior.costPilot.evmEnabled ? 'EVM enabled' : 'EVM N/A'} · {moduleBehavior.costPilot.paymentLabel}
              </span>
            </div>
            <div className="rounded px-2 py-1.5" style={{ background: 'var(--color-bg-input)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>TaktFlow: </span>
              <span style={{ color: 'var(--color-text)' }}>Progress by {moduleBehavior.taktFlow.progressUnit}</span>
            </div>
            <div className="rounded px-2 py-1.5" style={{ background: 'var(--color-bg-input)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>ClaimShield: </span>
              <span style={{ color: 'var(--color-text)' }}>{moduleBehavior.claimShield.changeOrderType}</span>
            </div>
            <div className="rounded px-2 py-1.5" style={{ background: 'var(--color-bg-input)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>SupplyChain: </span>
              <span style={{ color: 'var(--color-text)' }}>
                {moduleBehavior.supplyChain.materialProcurement} procurement{moduleBehavior.supplyChain.mrpEnabled ? ' · MRP on' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Integration info */}
      {getMissingRequiredSteps(state).length === 0 && (
        <div
          className="mt-6 rounded-lg px-4 py-3 text-[12px]"
          style={{ background: 'rgba(232,115,26,0.06)', borderLeft: '3px solid var(--color-accent)' }}
        >
          <strong>After finalization:</strong>
          <ul className="mt-1 space-y-1" style={{ color: 'var(--color-text-muted)' }}>
            <li>• LBS zones will be used in TaktFlow for trade flow scheduling ({flowObj?.label || 'Bottom → Up'})</li>
            <li>• WBS nodes will be available in TaktFlow for trade assignment</li>
            <li>• CBS nodes will be linked to CostPilot budget items</li>
            {state.boqUploaded && <li>• BOQ items will be transferred to CostPilot as Work Items</li>}
            <li>• Discipline trades will flow through zones with {state.defaultTaktTime}-day takt rhythm</li>
            {structObj && <li>• Structural system ({structObj.label}) configured for trade sequencing</li>}
            {mepObj && mepObj.taktMultiplier > 1.0 && <li>• MEP complexity ({mepObj.label}) factored into takt duration — ×{mepObj.taktMultiplier} multiplier</li>}
            {pricingObj && <li>• Contract policies auto-generated from {pricingObj.label} model — configures CostPilot, ClaimShield, SupplyChain behavior</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
