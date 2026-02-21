'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Rocket, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';

import { SETUP_STEPS, DEFAULT_WORKING_DAYS, BUILDING_TYPES, isStepOptional, getStepValidation, getMissingRequiredSteps } from './types';
import type { SetupState } from './types';

import StepClassification from './steps/StepClassification';
import StepBuildingConfig from './steps/StepBuildingConfig';
import StepDrawings from './steps/StepDrawings';
import StepBoq from './steps/StepBoq';
import StepWbs from './steps/StepWbs';
import StepCbs from './steps/StepCbs';
import StepLBS from './steps/StepLBS';
import StepTrades from './steps/StepTrades';
import StepTaktConfig from './steps/StepTaktConfig';
import StepReview from './steps/StepReview';

const STEP_COMPONENTS = [
  StepClassification,
  StepBuildingConfig,
  StepDrawings,
  StepBoq,
  StepWbs,
  StepCbs,
  StepLBS,
  StepTrades,
  StepTaktConfig,
  StepReview,
];

const initialState: SetupState = {
  currentStep: 'classification',
  completedSteps: [],
  // Step 1: Classification
  classificationStandard: 'uniclass',
  buildingType: '',
  projectPhase: '',
  // Step 2: Building Config
  floorCount: 0,
  basementCount: 0,
  zonesPerFloor: 3,
  structuralZonesPerFloor: 1,
  typicalFloorArea: 0,
  numberOfBuildings: 1,
  structuralSystem: '',
  mepComplexity: '',
  flowDirection: 'bottom_up',
  deliveryMethod: '',
  siteCondition: '',
  foundationType: '',
  groundCondition: '',
  groundImprovement: [],
  // Documents
  boqUploaded: false,
  boqFileName: null,
  boqItemCount: 0,
  drawingCount: 0,
  // WBS & CBS
  wbsGenerated: false,
  wbsNodeCount: 0,
  cbsGenerated: false,
  cbsNodeCount: 0,
  // LBS
  locationCount: 0,
  zoneCount: 0,
  lbsConfigured: false,
  // Takt Config
  defaultTaktTime: 5,
  bufferSize: 1,
  workingDays: [...DEFAULT_WORKING_DAYS],
  tradeCount: 0,
  taktPlanGenerated: false,
  // Legacy
  projectType: '',
  currency: 'USD',
  projectName: '',
};

interface Props {
  projectId: string;
}

export default function ProjectSetupWizard({ projectId }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const updateProjectStatus = useProjectStore((s) => s.updateProjectStatus);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SetupState>(initialState);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  // Stable auth headers — only changes when token changes (prevents infinite re-renders)
  const authHeaders = useMemo(
    (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  // Fetch setup state from server
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/setup`, {
        headers: { ...authHeaders },
      });
      if (res.ok) {
        const json = await res.json();
        setState((prev) => {
          const merged = { ...prev, ...json.data };

          // Sync buildingType from projectType if buildingType is empty
          // (projectType is stored in DB but buildingType is client-only state)
          if (!merged.buildingType && merged.projectType) {
            merged.buildingType = merged.projectType;
            const bt = BUILDING_TYPES.find((b) => b.value === merged.projectType);
            if (bt) {
              merged.floorCount = merged.floorCount || bt.defaultFloors;
              merged.basementCount = merged.basementCount || bt.defaultBasements;
              merged.zonesPerFloor = merged.zonesPerFloor || bt.defaultZonesPerFloor;
              merged.typicalFloorArea = merged.typicalFloorArea || bt.defaultFloorArea;
              merged.structuralSystem = merged.structuralSystem || bt.defaultStructural;
              merged.mepComplexity = merged.mepComplexity || bt.defaultMep;
              merged.flowDirection = merged.flowDirection || bt.defaultFlowDirection;
            }
          }
          // Default projectPhase if not set
          if (!merged.projectPhase && merged.buildingType) {
            merged.projectPhase = 'new_build';
          }

          return merged;
        });

        const currentStepIndex = SETUP_STEPS.findIndex((s) => s.id === json.data.currentStep);
        if (currentStepIndex >= 0) setStep(currentStepIndex);
      }
    } catch {
      // ignore — initial state used
    } finally {
      setLoading(false);
    }
  }, [projectId, authHeaders]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Clear validation error when step changes
  useEffect(() => {
    setValidationError('');
    setError('');
  }, [step]);

  const onStateChange = useCallback((updates: Partial<SetupState>) => {
    setState((prev) => ({ ...prev, ...updates }));
    // Clear validation error when user makes changes within a step
    setValidationError('');
  }, []);

  // Validate current step, mark completed if valid, persist to server
  const validateAndComplete = useCallback(
    async (stepIndex: number): Promise<boolean> => {
      const stepDef = SETUP_STEPS[stepIndex];
      const optional = isStepOptional(stepDef.id);
      const { valid, message } = getStepValidation(stepDef.id, state);

      // Optional steps can always proceed
      if (!optional && !valid) {
        setValidationError(message);
        return false;
      }

      // Mark step as completed in local state
      setState((prev) => ({
        ...prev,
        completedSteps: [...new Set([...prev.completedSteps, stepDef.id])],
      }));

      // Persist to server (best-effort)
      const nextStepId = SETUP_STEPS[stepIndex + 1]?.id || stepDef.id;
      try {
        await fetch(`/api/v1/projects/${projectId}/setup/complete-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ step: stepDef.id, nextStep: nextStepId }),
        });
      } catch {
        // best-effort
      }

      return true;
    },
    [state, projectId, authHeaders],
  );

  const next = async () => {
    if (step >= SETUP_STEPS.length - 1) return;

    const canProceed = await validateAndComplete(step);
    if (!canProceed) return;

    setStep(step + 1);
  };

  const back = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Navigate to a specific step (only allowed for completed or current steps)
  const goToStep = (index: number) => {
    if (index === step) return;
    // Can only go back to already-completed steps, or forward to the next step
    const stepDef = SETUP_STEPS[index];
    const isCompleted = state.completedSteps.includes(stepDef.id) || index < step;
    if (isCompleted || index === step) {
      setStep(index);
    }
  };

  const handleFinalize = async () => {
    // Client-side validation: check all required steps
    const missing = getMissingRequiredSteps(state);
    if (missing.length > 0) {
      setError(`Cannot finalize — missing required steps: ${missing.join(', ')}`);
      return;
    }

    setFinalizing(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/setup/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.error || 'Finalization failed');
      }

      updateProjectStatus(projectId, 'active');
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setFinalizing(false);
    }
  };

  // Check if current step is valid (for button state)
  const currentStepDef = SETUP_STEPS[step];
  const currentValidation = getStepValidation(currentStepDef.id, state);
  const isCurrentOptional = isStepOptional(currentStepDef.id);
  const canProceed = isCurrentOptional || currentValidation.valid;

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
      <div className="flex items-center gap-1 px-6 py-3 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
        {SETUP_STEPS.map((s, i) => {
          const isCompleted = state.completedSteps.includes(s.id) && i < step;
          const isCurrent = i === step;
          const stepValid = getStepValidation(s.id, state).valid;
          const optional = isStepOptional(s.id);
          const showDone = (isCompleted || (stepValid && i < step)) && !isCurrent;
          return (
            <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => goToStep(i)}
                disabled={!showDone && !isCurrent}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: isCurrent
                    ? 'rgba(232,115,26,0.12)'
                    : showDone
                      ? 'rgba(16,185,129,0.1)'
                      : 'transparent',
                  color: isCurrent
                    ? 'var(--color-accent)'
                    : showDone
                      ? 'var(--color-success)'
                      : 'var(--color-text-muted)',
                  cursor: showDone || isCurrent ? 'pointer' : 'not-allowed',
                  opacity: !showDone && !isCurrent ? 0.5 : 1,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                  style={{
                    background: isCurrent
                      ? 'var(--color-accent)'
                      : showDone
                        ? 'var(--color-success)'
                        : 'var(--color-bg-input)',
                    color: isCurrent || showDone ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {showDone ? <Check size={10} /> : i + 1}
                </div>
                <span className="hidden xl:inline whitespace-nowrap">
                  {s.label}
                  {optional && !showDone && (
                    <span className="text-[9px] opacity-50 ml-1">(opt)</span>
                  )}
                </span>
              </button>
              {i < SETUP_STEPS.length - 1 && (
                <div
                  className="w-3 h-px flex-shrink-0"
                  style={{ background: showDone ? 'var(--color-success)' : 'var(--color-border)' }}
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
            onComplete={() => {
              // Step component signals completion — update state
              const stepId = SETUP_STEPS[step].id;
              setState((prev) => ({
                ...prev,
                completedSteps: [...new Set([...prev.completedSteps, stepId])],
              }));
            }}
            authHeaders={authHeaders}
          />
        </div>
      </div>

      {/* Validation warning */}
      {validationError && (
        <div className="px-6">
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-medium mb-2"
              style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}
            >
              <AlertTriangle size={14} className="flex-shrink-0" />
              {validationError}
            </div>
          </div>
        </div>
      )}

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
            {/* Skip button for optional steps — only when step not completed */}
            {isCurrentOptional && !currentValidation.valid && (
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
                disabled={!canProceed && !isCurrentOptional}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{
                  background: canProceed
                    ? 'var(--color-accent)'
                    : 'var(--color-text-muted)',
                }}
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
