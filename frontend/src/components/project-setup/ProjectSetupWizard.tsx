'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Rocket } from 'lucide-react';

import { SETUP_STEPS } from './types';
import type { SetupState } from './types';

import StepClassification from './steps/StepClassification';
import StepDrawings from './steps/StepDrawings';
import StepBoq from './steps/StepBoq';
import StepWbs from './steps/StepWbs';
import StepCbs from './steps/StepCbs';
import StepTrades from './steps/StepTrades';
import StepReview from './steps/StepReview';

const STEP_COMPONENTS = [
  StepClassification,
  StepDrawings,
  StepBoq,
  StepWbs,
  StepCbs,
  StepTrades,
  StepReview,
];

const initialState: SetupState = {
  currentStep: 'classification',
  completedSteps: [],
  classificationStandard: 'uniclass',
  boqUploaded: false,
  boqFileName: null,
  boqItemCount: 0,
  drawingCount: 0,
  wbsGenerated: false,
  wbsNodeCount: 0,
  cbsGenerated: false,
  cbsNodeCount: 0,
  taktPlanGenerated: false,
  projectType: '',
  currency: 'USD',
  projectName: '',
};

interface Props {
  projectId: string;
}

export default function ProjectSetupWizard({ projectId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SetupState>(initialState);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');

  // Fetch setup state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/setup`);
      if (res.ok) {
        const json = await res.json();
        setState((prev) => ({ ...prev, ...json.data }));

        // Restore step position
        const currentStepIndex = SETUP_STEPS.findIndex((s) => s.id === json.data.currentStep);
        if (currentStepIndex >= 0) setStep(currentStepIndex);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const onStateChange = useCallback((updates: Partial<SetupState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const completeStep = useCallback(() => {
    const stepId = SETUP_STEPS[step].id;
    setState((prev) => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, stepId])],
    }));
  }, [step]);

  const saveProgress = async (nextStep: number) => {
    const stepId = SETUP_STEPS[step].id;
    const nextStepId = SETUP_STEPS[nextStep]?.id || stepId;

    try {
      await fetch(`/api/v1/projects/${projectId}/setup/complete-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepId, nextStep: nextStepId }),
      });
    } catch {
      // best-effort save
    }
  };

  const next = async () => {
    if (step < SETUP_STEPS.length - 1) {
      completeStep();
      await saveProgress(step + 1);
      setStep(step + 1);
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/setup/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Finalization failed');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  };

  const isLast = step === SETUP_STEPS.length - 1;
  const StepComponent = STEP_COMPONENTS[step];

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[400px]">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Stepper */}
      <div className="flex items-center gap-1 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        {SETUP_STEPS.map((s, i) => {
          const isCompleted = state.completedSteps.includes(s.id) || i < step;
          const isCurrent = i === step;
          return (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => (isCompleted || isCurrent) && setStep(i)}
                disabled={!isCompleted && !isCurrent}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: isCurrent ? 'rgba(232,115,26,0.12)' : isCompleted ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: isCurrent ? 'var(--color-accent)' : isCompleted ? 'var(--color-success)' : 'var(--color-text-muted)',
                  cursor: isCompleted || isCurrent ? 'pointer' : 'not-allowed',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                  style={{
                    background: isCurrent ? 'var(--color-accent)' : isCompleted ? 'var(--color-success)' : 'var(--color-bg-input)',
                    color: isCurrent || isCompleted ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {isCompleted ? <Check size={10} /> : i + 1}
                </div>
                <span className="hidden lg:inline">{s.label}</span>
              </button>
              {i < SETUP_STEPS.length - 1 && (
                <div
                  className="w-4 h-px"
                  style={{ background: isCompleted ? 'var(--color-success)' : 'var(--color-border)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <StepComponent
            projectId={projectId}
            state={state}
            onStateChange={onStateChange}
            onComplete={completeStep}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-lg px-4 py-2.5 text-[12px] font-medium mb-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="border-t px-6 py-3 flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={step === 0 ? () => router.push('/projects') : back}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft size={14} />
            {step === 0 ? 'Back to Projects' : 'Back'}
          </button>

          <div className="flex items-center gap-2">
            {/* Skip button for optional steps */}
            {(step === 1 || step === 2) && (
              <button
                onClick={next}
                className="px-4 py-2.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Skip
              </button>
            )}

            {isLast ? (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
              >
                {finalizing ? (
                  <><Loader2 size={14} className="animate-spin" /> Finalizing...</>
                ) : (
                  <><Rocket size={14} /> Finalize Setup</>
                )}
              </button>
            ) : (
              <button
                onClick={next}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                Next
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
