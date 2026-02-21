/**
 * Shared Takt Plan Store (Zustand)
 *
 * Provides a centralized cache for the active project's takt plan data.
 * All TaktFlow pages (takt-editor, flowline, LPS, dashboard) read from
 * this store instead of fetching independently.
 *
 * When the plan is modified (via takt-editor or progress updates),
 * call invalidate() to refetch.
 */

import { create } from 'zustand';
import {
  listPlans,
  getPlan,
  generatePlan,
  getFlowlineData,
  type TaktPlanSummary,
  type TaktPlanDetail,
} from '@/lib/stores/takt-plans';

// ── Types ──

export interface FlowlineWagonData {
  id: string;
  tradeName: string;
  tradeCode: string;
  tradeColor: string;
  durationDays: number;
  bufferAfter: number;
  segments: {
    zoneId: string;
    zoneName: string;
    zoneSequence: number;
    zoneIndex: number;
    periodNumber: number;
    plannedStart: string;
    plannedEnd: string;
    actualStart: string | null;
    actualEnd: string | null;
    y: number;
    status: string;
    progressPct: number;
  }[];
}

export interface FlowlineZoneData {
  id: string;
  name: string;
  code: string;
  sequence: number;
  y_index: number;
}

export interface FlowlineApiData {
  planId: string;
  planName: string;
  taktTime: number;
  startDate: string;
  endDate: string | null;
  totalPeriods: number;
  zones: FlowlineZoneData[];
  wagons: FlowlineWagonData[];
  todayX: number;
}

interface TaktPlanState {
  // ── Cached data ──
  projectId: string | null;
  plans: TaktPlanSummary[];
  activePlan: TaktPlanDetail | null;
  flowlineData: FlowlineApiData | null;

  // ── Status ──
  loading: boolean;
  error: string | null;

  // ── Actions ──

  /** Load plans for a project. If projectId changed, refetches. */
  loadPlans: (projectId: string) => Promise<TaktPlanSummary[]>;

  /** Load the active plan detail (first plan or specified planId). */
  loadActivePlan: (projectId: string, planId?: string) => Promise<TaktPlanDetail | null>;

  /** Load flowline visualization data for the active plan. */
  loadFlowlineData: (projectId: string, planId?: string) => Promise<FlowlineApiData | null>;

  /** Generate a new plan for the project and cache it. */
  generateAndCachePlan: (projectId: string) => Promise<TaktPlanDetail | null>;

  /** Invalidate cache and refetch everything for the current project. */
  invalidate: () => Promise<void>;

  /** Clear all cached data (e.g. on project switch or logout). */
  clear: () => void;
}

// ── Store ──

export const useTaktPlanStore = create<TaktPlanState>((set, get) => ({
  projectId: null,
  plans: [],
  activePlan: null,
  flowlineData: null,
  loading: false,
  error: null,

  loadPlans: async (projectId) => {
    // Return cached if same project
    const state = get();
    if (state.projectId === projectId && state.plans.length > 0) {
      return state.plans;
    }

    set({ loading: true, error: null });
    try {
      const plans = await listPlans(projectId);
      set({ projectId, plans, loading: false });
      return plans;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load plans';
      set({ error: msg, loading: false });
      return [];
    }
  },

  loadActivePlan: async (projectId, planId?) => {
    const state = get();

    // Return cached if same project and plan
    if (
      state.projectId === projectId &&
      state.activePlan &&
      (!planId || state.activePlan.id === planId)
    ) {
      return state.activePlan;
    }

    set({ loading: true, error: null });
    try {
      // Ensure plans are loaded
      let plans = state.plans;
      if (state.projectId !== projectId || plans.length === 0) {
        plans = await listPlans(projectId);
        set({ projectId, plans });
      }

      if (plans.length === 0) {
        set({ activePlan: null, loading: false });
        return null;
      }

      const targetPlanId = planId || plans[0].id;
      const plan = await getPlan(projectId, targetPlanId);
      set({ activePlan: plan, loading: false });
      return plan;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load plan';
      set({ error: msg, loading: false });
      return null;
    }
  },

  loadFlowlineData: async (projectId, planId?) => {
    const state = get();

    // Return cached if same project and plan
    if (
      state.projectId === projectId &&
      state.flowlineData &&
      (!planId || state.flowlineData.planId === planId)
    ) {
      return state.flowlineData;
    }

    set({ loading: true, error: null });
    try {
      // Ensure plans are loaded
      let plans = state.plans;
      if (state.projectId !== projectId || plans.length === 0) {
        plans = await listPlans(projectId);
        set({ projectId, plans });
      }

      if (plans.length === 0) {
        set({ flowlineData: null, loading: false });
        return null;
      }

      const targetPlanId = planId || plans[0].id;
      const raw = await getFlowlineData(projectId, targetPlanId);

      if (raw && Array.isArray((raw as Record<string, unknown>).wagons)) {
        const flowlineData = raw as unknown as FlowlineApiData;
        set({ flowlineData, loading: false });
        return flowlineData;
      }

      set({ flowlineData: null, loading: false });
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load flowline data';
      set({ error: msg, loading: false });
      return null;
    }
  },

  generateAndCachePlan: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const plan = await generatePlan(projectId);
      const plans = await listPlans(projectId);
      set({
        projectId,
        plans,
        activePlan: plan,
        flowlineData: null, // Invalidate flowline data — will be refetched on demand
        loading: false,
      });
      return plan;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate plan';
      set({ error: msg, loading: false });
      return null;
    }
  },

  invalidate: async () => {
    const { projectId } = get();
    if (!projectId) return;

    set({ loading: true, error: null });
    try {
      const plans = await listPlans(projectId);
      let activePlan: TaktPlanDetail | null = null;
      let flowlineData: FlowlineApiData | null = null;

      if (plans.length > 0) {
        const planId = plans[0].id;
        activePlan = await getPlan(projectId, planId);

        const raw = await getFlowlineData(projectId, planId);
        if (raw && Array.isArray((raw as Record<string, unknown>).wagons)) {
          flowlineData = raw as unknown as FlowlineApiData;
        }
      }

      set({ plans, activePlan, flowlineData, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh data';
      set({ error: msg, loading: false });
    }
  },

  clear: () => {
    set({
      projectId: null,
      plans: [],
      activePlan: null,
      flowlineData: null,
      loading: false,
      error: null,
    });
  },
}));
