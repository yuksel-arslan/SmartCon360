'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';

import StepProjectType from './steps/StepProjectType';
import StepBasicInfo from './steps/StepBasicInfo';
import StepReview from './steps/StepReview';

import { WIZARD_STEPS } from './types';
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
};

const STEP_COMPONENTS = [
  StepProjectType,
  StepBasicInfo,
  StepReview,
];

export default function ProjectWizard() {
  const router = useRouter();
  const { fetchProjects } = useProjectStore();
  const { getAuthHeader, refreshAccessToken } = useAuthStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(initialData);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const onChange = useCallback(
    (updates: Partial<WizardData>) => {
      setData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return !!data.projectType;
      case 1: return !!data.name.trim() && !!data.code.trim();
      case 2: return true;
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
      const buildHeaders = (): HeadersInit => ({
        'Content-Type': 'application/json',
        ...getAuthHeader() as Record<string, string>,
      });

      // Helper: fetch with auto-refresh on 401
      const authFetch = async (url: string, opts: RequestInit): Promise<Response> => {
        const res = await fetch(url, opts);
        if (res.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return fetch(url, { ...opts, headers: buildHeaders() });
          }
        }
        return res;
      };

      // Create project
      const res = await authFetch('/api/v1/projects', {
        method: 'POST',
        headers: buildHeaders(),
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
          classificationStandard: 'uniclass',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = typeof err.error === 'object' ? err.error.message : err.error;
        throw new Error(message || `Failed to create project (${res.status})`);
      }

      const { data: project } = await res.json();

      // Refresh the project list so the new project appears in sidebar
      await fetchProjects();
      // Redirect to Project Setup wizard for full configuration
      router.push(`/projects/${project.id}/setup`);
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
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
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
