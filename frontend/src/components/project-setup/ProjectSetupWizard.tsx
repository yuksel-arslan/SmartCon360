'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Rocket, AlertTriangle, Save, Pencil } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';

import { SETUP_STEPS, DEFAULT_WORKING_DAYS, BUILDING_TYPES, isStepOptional, getStepValidation, getMissingRequiredSteps } from './types';
import type { SetupState } from './types';

import StepProjectInfo from './steps/StepProjectInfo';
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
  StepProjectInfo,
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
  currentStep: 'info',
  completedSteps: [],
  // Step 0: Project Info
  projectCode: '',
  projectDescription: '',
  plannedStart: '',
  plannedFinish: '',
  projectCity: '',
  projectCountry: '',
  projectAddress: '',
  projectBudget: '',
  // Step 1: Classification
  classificationStandard: 'uniclass',
  buildingType: '',
  projectPhase: '',
  // Step 2: Building Config
  floorCount: 0,
  basementCount: 0,
  zonesPerFloor: 3,
  structuralZonesPerFloor: 1,
  substructureZonesCount: 3,
  typicalFloorArea: 0,
  numberOfBuildings: 1,
  structuralSystem: '',
  mepComplexity: '',
  flowDirection: 'bottom_up',
  deliveryMethod: '',
  contractPricingModel: '',
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
  projectId: string; // UUID for existing project, 'new' for project creation
}

export default function ProjectSetupWizard({ projectId: initialProjectId }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { getAuthHeader, refreshAccessToken } = useAuthStore();
  const { updateProjectStatus, fetchProjects, projects } = useProjectStore();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SetupState>(initialState);
  const [loading, setLoading] = useState(initialProjectId !== 'new');
  const [finalizing, setFinalizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  // For new projects, projectId starts as 'new' and becomes a real UUID after creation
  const [projectId, setProjectId] = useState(initialProjectId);
  const isNewProject = projectId === 'new';

  // Detect edit mode: project is already active (finalized)
  const project = projects.find((p) => p.id === projectId);
  const isEditMode = !isNewProject && project?.status === 'active';

  // For existing projects: skip the 'info' step (project already created)
  // The info step index in SETUP_STEPS
  const infoStepIndex = SETUP_STEPS.findIndex((s) => s.id === 'info');

  // Stable auth headers — only changes when token changes (prevents infinite re-renders)
  const authHeaders = useMemo(
    (): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  // Fetch wrapper that auto-refreshes JWT on 401
  const authFetch = useCallback(
    async (url: string, opts?: RequestInit): Promise<Response> => {
      const buildHeaders = (): Record<string, string> => ({
        ...(opts?.headers as Record<string, string> | undefined),
        ...getAuthHeader() as Record<string, string>,
      });

      const res = await fetch(url, { ...opts, headers: buildHeaders() });
      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetch(url, { ...opts, headers: buildHeaders() });
        }
      }
      return res;
    },
    [getAuthHeader, refreshAccessToken],
  );

  // Fetch setup state from server (only for existing projects)
  const fetchState = useCallback(async () => {
    if (isNewProject) return;
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/setup`);
      if (res.ok) {
        const json = await res.json();
        setState((prev) => {
          const merged = { ...prev, ...json.data };

          // Sync buildingType from projectType if buildingType is empty
          if (!merged.buildingType && merged.projectType) {
            merged.buildingType = merged.projectType;
            const bt = BUILDING_TYPES.find((b) => b.value === merged.projectType);
            if (bt) {
              merged.floorCount = merged.floorCount || bt.defaultFloors;
              merged.basementCount = merged.basementCount || bt.defaultBasements;
              merged.zonesPerFloor = merged.zonesPerFloor || bt.defaultZonesPerFloor;
              merged.substructureZonesCount = merged.substructureZonesCount || bt.defaultSubstructureZones;
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

          // Mark info step as completed for existing projects (already have name/code)
          if (merged.projectName) {
            merged.completedSteps = [...new Set([...merged.completedSteps, 'info'])];
          }

          return merged;
        });

        // For existing projects, find the right starting step
        const currentStepIndex = SETUP_STEPS.findIndex((s) => s.id === json.data.currentStep);
        if (currentStepIndex >= 0) {
          setStep(currentStepIndex);
        } else {
          // Default to classification step for existing projects
          const classStep = SETUP_STEPS.findIndex((s) => s.id === 'classification');
          setStep(classStep >= 0 ? classStep : 0);
        }
      }
    } catch {
      // ignore — initial state used
    } finally {
      setLoading(false);
    }
  }, [projectId, authFetch, isNewProject]);

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
    setValidationError('');
  }, []);

  // Create project via API (called after info step for new projects)
  const createProject = async (): Promise<string | null> => {
    try {
      const buildHeaders = (): HeadersInit => ({
        'Content-Type': 'application/json',
        ...getAuthHeader() as Record<string, string>,
      });

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

      const res = await authFetch('/api/v1/projects', {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          name: state.projectName,
          code: state.projectCode,
          projectType: state.buildingType || 'commercial',
          description: state.projectDescription || undefined,
          plannedStart: state.plannedStart || undefined,
          plannedFinish: state.plannedFinish || undefined,
          address: state.projectAddress || undefined,
          city: state.projectCity || undefined,
          country: state.projectCountry || undefined,
          budget: state.projectBudget ? Number(state.projectBudget) : undefined,
          currency: state.currency,
          classificationStandard: state.classificationStandard || 'uniclass',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = typeof err.error === 'object' ? err.error.message : err.error;
        throw new Error(message || `Failed to create project (${res.status})`);
      }

      const { data: project } = await res.json();
      await fetchProjects();

      // Update URL to the real project ID without full page reload
      window.history.replaceState(null, '', `/projects/${project.id}/setup`);
      setProjectId(project.id);

      return project.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      return null;
    }
  };

  // Persist setup config to server
  const persistSetupConfig = async (pid: string) => {
    try {
      await fetch(`/api/v1/projects/${pid}/setup`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          buildingType: state.buildingType,
          projectPhase: state.projectPhase,
          floorCount: state.floorCount,
          basementCount: state.basementCount,
          zonesPerFloor: state.zonesPerFloor,
          structuralZonesPerFloor: state.structuralZonesPerFloor,
          substructureZonesCount: state.substructureZonesCount,
          typicalFloorArea: state.typicalFloorArea,
          numberOfBuildings: state.numberOfBuildings,
          structuralSystem: state.structuralSystem,
          mepComplexity: state.mepComplexity,
          flowDirection: state.flowDirection,
          deliveryMethod: state.deliveryMethod,
          contractPricingModel: state.contractPricingModel,
          siteCondition: state.siteCondition,
          foundationType: state.foundationType,
          groundCondition: state.groundCondition,
          groundImprovement: state.groundImprovement,
        }),
      });
    } catch {
      // best-effort
    }
  };

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

      // For the info step on new projects: create the project first
      if (stepDef.id === 'info' && isNewProject) {
        const newProjectId = await createProject();
        if (!newProjectId) return false;
        return true;
      }

      // For other steps: persist to server (best-effort)
      if (!isNewProject) {
        const nextStepId = SETUP_STEPS[stepIndex + 1]?.id || stepDef.id;
        try {
          await Promise.all([
            authFetch(`/api/v1/projects/${projectId}/setup/complete-step`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ step: stepDef.id, nextStep: nextStepId }),
            }),
            persistSetupConfig(projectId),
          ]);
        } catch {
          // best-effort
        }
      }

      return true;
    },
    [state, projectId, authFetch, isNewProject],
  );

  const next = async () => {
    if (step >= SETUP_STEPS.length - 1) return;

    const canProceed = await validateAndComplete(step);
    if (!canProceed) return;

    setStep(step + 1);
  };

  const back = () => {
    // Don't allow going back to info step for existing projects
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Navigate to a specific step
  const goToStep = (index: number) => {
    if (index === step) return;
    if (isEditMode) {
      setStep(index);
      return;
    }
    const stepDef = SETUP_STEPS[index];
    const isCompleted = state.completedSteps.includes(stepDef.id) || index < step;
    if (isCompleted || index === step) {
      setStep(index);
    }
  };

  // Save changes (edit mode) — persist full setup config without re-finalization
  const handleSaveChanges = async () => {
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      // Also update project info fields if changed
      await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          name: state.projectName || undefined,
          description: state.projectDescription || undefined,
          plannedStart: state.plannedStart || undefined,
          plannedFinish: state.plannedFinish || undefined,
          address: state.projectAddress || undefined,
          city: state.projectCity || undefined,
          country: state.projectCountry || undefined,
          budget: state.projectBudget ? Number(state.projectBudget) : undefined,
          currency: state.currency || undefined,
        }),
      });

      await fetch(`/api/v1/projects/${projectId}/setup`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          currentStep: SETUP_STEPS[step].id,
          completedSteps: state.completedSteps,
          classificationStandard: state.classificationStandard,
          taktPlanGenerated: state.taktPlanGenerated,
          buildingType: state.buildingType,
          projectPhase: state.projectPhase,
          floorCount: state.floorCount,
          basementCount: state.basementCount,
          zonesPerFloor: state.zonesPerFloor,
          structuralZonesPerFloor: state.structuralZonesPerFloor,
          substructureZonesCount: state.substructureZonesCount,
          typicalFloorArea: state.typicalFloorArea,
          numberOfBuildings: state.numberOfBuildings,
          structuralSystem: state.structuralSystem,
          mepComplexity: state.mepComplexity,
          flowDirection: state.flowDirection,
          deliveryMethod: state.deliveryMethod,
          contractPricingModel: state.contractPricingModel,
          siteCondition: state.siteCondition,
          foundationType: state.foundationType,
          groundCondition: state.groundCondition,
          groundImprovement: state.groundImprovement,
        }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    const missing = getMissingRequiredSteps(state);
    if (missing.length > 0) {
      setError(`Cannot finalize — missing required steps: ${missing.join(', ')}`);
      return;
    }

    setFinalizing(true);
    setError('');

    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/setup/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      {/* Edit mode banner */}
      {isEditMode && (
        <div
          className="flex items-center gap-2 px-6 py-2 text-[12px] font-medium border-b"
          style={{
            background: 'rgba(99,102,241,0.08)',
            color: '#6366F1',
            borderColor: 'var(--color-border)',
          }}
        >
          <Pencil size={13} />
          Edit Mode — Changes apply to phases not yet started. Navigate freely between steps.
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-1 px-6 py-3 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
        {SETUP_STEPS.map((s, i) => {
          const isCompleted = state.completedSteps.includes(s.id) && i < step;
          const isCurrent = i === step;
          const stepValid = getStepValidation(s.id, state).valid;
          const optional = isStepOptional(s.id);
          const showDone = (isCompleted || (stepValid && i < step)) && !isCurrent;
          const isClickable = isEditMode || showDone || isCurrent;
          return (
            <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => goToStep(i)}
                disabled={!isClickable}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: isCurrent
                    ? 'rgba(232,115,26,0.12)'
                    : showDone
                      ? 'rgba(16,185,129,0.1)'
                      : isEditMode
                        ? 'rgba(99,102,241,0.04)'
                        : 'transparent',
                  color: isCurrent
                    ? 'var(--color-accent)'
                    : showDone
                      ? 'var(--color-success)'
                      : isEditMode
                        ? 'var(--color-text)'
                        : 'var(--color-text-muted)',
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  opacity: isClickable ? 1 : 0.5,
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
              const stepId = SETUP_STEPS[step].id;
              setState((prev) => ({
                ...prev,
                completedSteps: [...new Set([...prev.completedSteps, stepId])],
              }));
            }}
            authHeaders={authHeaders}
            authFetch={authFetch}
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
            onClick={step === 0
              ? () => router.push(isEditMode ? '/dashboard' : '/projects')
              : back}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft size={14} />
            {step === 0 ? (isEditMode ? 'Back to Dashboard' : 'Cancel') : 'Back'}
          </button>

          <div className="flex items-center gap-2">
            {/* Edit mode: Save Changes button (always visible) */}
            {isEditMode && (
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: saved ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                  color: saved ? 'var(--color-success)' : '#6366F1',
                }}
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving...</>
                ) : saved ? (
                  <><Check size={14} /> Saved</>
                ) : (
                  <><Save size={14} /> Save Changes</>
                )}
              </button>
            )}

            {/* Skip button for optional steps */}
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
              isEditMode ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
                >
                  <Check size={14} /> Done
                </button>
              ) : (
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
              )
            ) : (
              <button
                onClick={next}
                disabled={!isEditMode && !canProceed && !isCurrentOptional}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{
                  background: (isEditMode || canProceed)
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
