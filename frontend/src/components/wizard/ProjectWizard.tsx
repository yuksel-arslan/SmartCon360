'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { getTemplate } from '@/lib/core/project-templates';

import StepProjectType from './steps/StepProjectType';
import StepBasicInfo from './steps/StepBasicInfo';
import StepLBS from './steps/StepLBS';
import StepTrades from './steps/StepTrades';
import StepTaktConfig from './steps/StepTaktConfig';
import StepReview from './steps/StepReview';

import { WIZARD_STEPS, DEFAULT_WORKING_DAYS } from './types';
import type { WizardData } from './types';

const initialData: WizardData = {
  projectType: '',
  name: '',
  code: '',
  description: '',
  plannedStart: '',
  plannedFinish: '',
  address: '',
  city: '',
  country: '',
  budget: '',
  currency: 'USD',
  locations: [],
  trades: [],
  defaultTaktTime: 5,
  bufferSize: 1,
  workingDays: [...DEFAULT_WORKING_DAYS],
};

const STEP_COMPONENTS = [
  StepProjectType,
  StepBasicInfo,
  StepLBS,
  StepTrades,
  StepTaktConfig,
  StepReview,
];

export default function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(initialData);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const onChange = useCallback(
    (updates: Partial<WizardData>) => {
      setData((prev) => {
        const next = { ...prev, ...updates };

        // When project type changes, load template data
        if (updates.projectType && updates.projectType !== prev.projectType) {
          const template = getTemplate(updates.projectType);
          if (template) {
            next.locations = template.locations;
            next.trades = template.trades.map((t) => ({ ...t, enabled: true }));
            next.defaultTaktTime = template.defaultTaktTime;
            next.bufferSize = template.defaultBufferSize;
          }
        }

        return next;
      });
    },
    []
  );

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return !!data.projectType;
      case 1: return !!data.name.trim() && !!data.code.trim();
      case 2: return data.locations.length > 0;
      case 3: return data.trades.some((t) => t.enabled);
      case 4: return data.defaultTaktTime > 0 && data.workingDays.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  const next = () => {
    if (step < WIZARD_STEPS.length - 1 && canAdvance()) {
      setStep(step + 1);
    }
  };

  const back = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const createProject = async () => {
    setCreating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Create project
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: data.name,
          code: data.code,
          projectType: data.projectType,
          description: data.description || undefined,
          plannedStart: data.plannedStart || undefined,
          plannedFinish: data.plannedFinish || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          country: data.country || undefined,
          budget: data.budget ? Number(data.budget) : undefined,
          currency: data.currency,
          defaultTaktTime: data.defaultTaktTime,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to create project (${res.status})`);
      }

      const { data: project } = await res.json();

      // 2. Bulk create locations from template
      if (data.locations.length > 0) {
        const flatLocations = flattenLocations(data.locations);
        if (flatLocations.length > 0) {
          await fetch(`/api/v1/projects/${project.id}/locations/bulk`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ locations: flatLocations }),
          });
        }
      }

      // 3. Create enabled trades
      const enabledTrades = data.trades.filter((t) => t.enabled);
      for (const trade of enabledTrades) {
        await fetch(`/api/v1/projects/${project.id}/trades`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: trade.name,
            code: trade.code,
            color: trade.color,
            defaultCrewSize: trade.defaultCrewSize,
            predecessorTradeIds: [],
          }),
        });
      }

      // 4. Auto-generate initial takt plan (AI-1 Core)
      await fetch(`/api/v1/projects/${project.id}/plan/generate`, {
        method: 'POST',
        headers,
      }).catch(() => {
        // Plan generation is best-effort — don't block project creation
      });

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const StepComponent = STEP_COMPONENTS[step];
  const isLast = step === WIZARD_STEPS.length - 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Stepper */}
      <div className="flex items-center gap-1 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: i === step ? 'rgba(232,115,26,0.12)' : i < step ? 'rgba(16,185,129,0.1)' : 'transparent',
                color: i === step ? 'var(--color-accent)' : i < step ? 'var(--color-success)' : 'var(--color-text-muted)',
                cursor: i < step ? 'pointer' : i === step ? 'default' : 'not-allowed',
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: i === step ? 'var(--color-accent)' : i < step ? 'var(--color-success)' : 'var(--color-bg-input)',
                  color: i <= step ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {i < step ? <Check size={10} /> : i + 1}
              </div>
              <span className="hidden md:inline">{s.label}</span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className="w-4 h-px"
                style={{ background: i < step ? 'var(--color-success)' : 'var(--color-border)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <StepComponent data={data} onChange={onChange} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6">
          <div className="max-w-2xl mx-auto">
            <div className="rounded-lg px-4 py-2.5 text-[12px] font-medium mb-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="border-t px-6 py-3 flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={step === 0 ? () => router.push('/dashboard') : back}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft size={14} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {isLast ? (
            <button
              onClick={createProject}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
            >
              {creating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Create Project
                </>
              )}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: canAdvance() ? 'var(--color-accent)' : 'var(--color-bg-input)' }}
            >
              Next
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Flatten template locations into API-compatible format with parent references.
 */
function flattenLocations(
  templates: WizardData['locations'],
  parentName?: string,
): { name: string; locationType: string; parentName?: string; areaSqm?: number; sortOrder: number }[] {
  const result: ReturnType<typeof flattenLocations> = [];
  let sortOrder = 0;

  for (const loc of templates) {
    const repeat = loc.repeat && loc.repeat > 1 ? loc.repeat : 1;

    for (let i = 0; i < repeat; i++) {
      const name = repeat > 1 && loc.repeatLabel
        ? loc.repeatLabel.replace('{n}', String(i + 1))
        : repeat > 1
          ? `${loc.name} ${i + 1}`
          : loc.name;

      result.push({
        name,
        locationType: loc.type,
        parentName,
        areaSqm: loc.areaSqm,
        sortOrder: sortOrder++,
      });

      if (loc.children) {
        result.push(...flattenLocations(loc.children, name));
      }
    }
  }

  return result;
}
