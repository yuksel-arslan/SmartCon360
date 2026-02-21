// Hub Store — SmartCon360 Hub Orchestrator
// Cross-module data aggregation, Project Health Score

import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────

export interface HealthComponent {
  score: number;
  label: string;
  details: string;
}

export interface ProjectHealth {
  projectId: string;
  overallScore: number;
  components: {
    schedule: HealthComponent;
    quality: HealthComponent;
    safety: HealthComponent;
    cost: HealthComponent;
    resource: HealthComponent;
    constraint: HealthComponent;
    risk: HealthComponent;
  };
  recommendations: string[];
  calculatedAt: string;
}

export interface DashboardSummary {
  quality: { openNcrs: number; ftrRate: number; totalInspections: number };
  safety: { openIncidents: number; activePermits: number };
  cost: { cpi: number | null; spi: number | null; budgetVariance: number | null };
  resources: { activeCrews: number; totalWorkers: number };
  supply: { openPOs: number; overdueDeliveries: number };
  risk: { activeRisks: number; highRisks: number };
  claims: { openClaims: number; pendingChangeOrders: number };
  communication: { openRfis: number };
  constraints: { open: number; critical: number };
  sustainability: { certifications: number };
}

export interface ModuleStatus {
  id: string;
  name: string;
  active: boolean;
  records: number;
}

interface HubState {
  health: ProjectHealth | null;
  dashboard: DashboardSummary | null;
  modules: ModuleStatus[];
  loading: boolean;
  error: string | null;

  fetchHealth: (projectId: string) => Promise<void>;
  fetchDashboard: (projectId: string) => Promise<void>;
  fetchModules: (projectId: string) => Promise<void>;
  fetchAll: (projectId: string) => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

const API = '/api/v1/hub';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

// ── Store ────────────────────────────────────────────────

export const useHubStore = create<HubState>((set) => ({
  health: null,
  dashboard: null,
  modules: [],
  loading: false,
  error: null,

  fetchHealth: async (projectId) => {
    try {
      const data = await apiFetch<ProjectHealth>(`/project-health/${projectId}`);
      set({ health: data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchDashboard: async (projectId) => {
    try {
      const data = await apiFetch<DashboardSummary>(`/dashboard/${projectId}`);
      set({ dashboard: data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchModules: async (projectId) => {
    try {
      const data = await apiFetch<ModuleStatus[]>(`/modules/${projectId}`);
      set({ modules: data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const [health, dashboard, modules] = await Promise.allSettled([
        apiFetch<ProjectHealth>(`/project-health/${projectId}`),
        apiFetch<DashboardSummary>(`/dashboard/${projectId}`),
        apiFetch<ModuleStatus[]>(`/modules/${projectId}`),
      ]);
      set({
        health: health.status === 'fulfilled' ? health.value : null,
        dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
        modules: modules.status === 'fulfilled' ? modules.value : [],
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },
}));
