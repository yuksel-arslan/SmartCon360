import { create } from 'zustand';

export interface Risk {
  id: string;
  projectId: string;
  riskNumber: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  probability: number;
  impact: number;
  riskScore: number;
  owner?: string;
  trigger?: string;
  response: string;
  mitigationPlan?: string;
  contingencyPlan?: string;
  costImpact: number;
  timeImpactDays: number;
  residualProb?: number;
  residualImpact?: number;
  identifiedDate: string;
  reviewDate?: string;
  closedDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskAction {
  id: string;
  riskId: string;
  projectId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  status: string;
  completedDate?: string;
  createdAt: string;
}

export interface RiskSummary {
  totalRisks: number;
  openRisks: number;
  highRisks: number;
  criticalRisks: number;
  mitigatingRisks: number;
  closedRisks: number;
  totalCostExposure: number;
  pendingActions: number;
  overdueActions: number;
  heatMap: Record<string, number>;
  allocationModel: string;
  contingencyDefaultPct: number;
}

interface RiskState {
  summary: RiskSummary | null;
  risks: Risk[];
  actions: RiskAction[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchAll: (projectId: string) => Promise<void>;
  createRisk: (data: Partial<Risk>) => Promise<Risk | null>;
  updateRisk: (id: string, data: Partial<Risk>) => Promise<void>;
  deleteRisk: (id: string) => Promise<void>;
  createAction: (data: Partial<RiskAction>) => Promise<RiskAction | null>;
  updateAction: (id: string, data: Partial<RiskAction>) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const useRiskStore = create<RiskState>((set) => ({
  summary: null,
  risks: [],
  actions: [],
  loading: false,
  error: null,
  initialized: false,

  fetchAll: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const [summaryRes, risksRes, actionsRes] = await Promise.all([
        fetch(`${API}/risk/summary/project/${projectId}`, { headers: getHeaders() }),
        fetch(`${API}/risk/register/project/${projectId}`, { headers: getHeaders() }),
        fetch(`${API}/risk/actions/project/${projectId}`, { headers: getHeaders() }),
      ]);

      const [summaryData, risksData, actionsData] = await Promise.all([
        summaryRes.ok ? summaryRes.json() : null,
        risksRes.ok ? risksRes.json() : null,
        actionsRes.ok ? actionsRes.json() : null,
      ]);

      set({
        summary: summaryData?.data || null,
        risks: risksData?.data || [],
        actions: actionsData?.data || [],
        loading: false,
        initialized: true,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false, initialized: true });
    }
  },

  createRisk: async (data) => {
    try {
      const res = await fetch(`${API}/risk/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create risk');
      const json = await res.json();
      set((s) => ({ risks: [json.data, ...s.risks] }));
      return json.data;
    } catch (err) { set({ error: (err as Error).message }); return null; }
  },

  updateRisk: async (id, data) => {
    try {
      const res = await fetch(`${API}/risk/register/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update risk');
      const json = await res.json();
      set((s) => ({ risks: s.risks.map((r) => (r.id === id ? json.data : r)) }));
    } catch (err) { set({ error: (err as Error).message }); }
  },

  deleteRisk: async (id) => {
    try {
      await fetch(`${API}/risk/register/${id}`, { method: 'DELETE', headers: getHeaders() });
      set((s) => ({ risks: s.risks.filter((r) => r.id !== id) }));
    } catch (err) { set({ error: (err as Error).message }); }
  },

  createAction: async (data) => {
    try {
      const res = await fetch(`${API}/risk/actions`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to create action');
      const json = await res.json();
      set((s) => ({ actions: [json.data, ...s.actions] }));
      return json.data;
    } catch (err) { set({ error: (err as Error).message }); return null; }
  },

  updateAction: async (id, data) => {
    try {
      const res = await fetch(`${API}/risk/actions/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error('Failed to update action');
      const json = await res.json();
      set((s) => ({ actions: s.actions.map((a) => (a.id === id ? json.data : a)) }));
    } catch (err) { set({ error: (err as Error).message }); }
  },

  deleteAction: async (id) => {
    try {
      await fetch(`${API}/risk/actions/${id}`, { method: 'DELETE', headers: getHeaders() });
      set((s) => ({ actions: s.actions.filter((a) => a.id !== id) }));
    } catch (err) { set({ error: (err as Error).message }); }
  },
}));
