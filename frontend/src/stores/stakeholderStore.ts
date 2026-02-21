import { create } from 'zustand';

const API = process.env.NEXT_PUBLIC_OPS_URL || 'http://localhost:3002';

export interface Stakeholder {
  id: string;
  projectId: string;
  code: string;
  name: string;
  organization?: string;
  role: string;
  category: string;
  influence: number;
  interest: number;
  engagement: string;
  contactEmail?: string;
  contactPhone?: string;
  status: string;
  expectations?: string;
  concerns?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementAction {
  id: string;
  projectId: string;
  stakeholderId?: string;
  actionNumber: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string;
  completedDate?: string;
  outcome?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StakeholderSummary {
  totalStakeholders: number;
  activeStakeholders: number;
  totalActions: number;
  pendingActions: number;
  overdueActions: number;
  highInfluenceHighInterest: number;
  engagementDistribution: Record<string, number>;
  reportingFrequency: string;
  engagementLevel: string;
}

interface StakeholderState {
  summary: StakeholderSummary | null;
  stakeholders: Stakeholder[];
  actions: EngagementAction[];
  loading: boolean;
  error: string | null;

  fetchAll: (projectId: string) => Promise<void>;

  createStakeholder: (data: Partial<Stakeholder>) => Promise<void>;
  updateStakeholder: (id: string, data: Partial<Stakeholder>) => Promise<void>;
  deleteStakeholder: (id: string) => Promise<void>;

  createAction: (data: Partial<EngagementAction>) => Promise<void>;
  updateAction: (id: string, data: Partial<EngagementAction>) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}

function getHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const useStakeholderStore = create<StakeholderState>((set) => ({
  summary: null,
  stakeholders: [],
  actions: [],
  loading: false,
  error: null,

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const h = getHeaders();
      const [sumRes, regRes, actRes] = await Promise.all([
        fetch(`${API}/stakeholder/summary/project/${projectId}`, { headers: h }),
        fetch(`${API}/stakeholder/register/project/${projectId}`, { headers: h }),
        fetch(`${API}/stakeholder/actions/project/${projectId}`, { headers: h }),
      ]);
      const [sumJson, regJson, actJson] = await Promise.all([sumRes.json(), regRes.json(), actRes.json()]);
      set({ summary: sumJson.data, stakeholders: regJson.data || [], actions: actJson.data || [], loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createStakeholder: async (data) => {
    const res = await fetch(`${API}/stakeholder/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ stakeholders: [json.data, ...s.stakeholders] }));
  },
  updateStakeholder: async (id, data) => {
    const res = await fetch(`${API}/stakeholder/register/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ stakeholders: s.stakeholders.map((x) => (x.id === id ? json.data : x)) }));
  },
  deleteStakeholder: async (id) => {
    await fetch(`${API}/stakeholder/register/${id}`, { method: 'DELETE', headers: getHeaders() });
    set((s) => ({ stakeholders: s.stakeholders.filter((x) => x.id !== id) }));
  },

  createAction: async (data) => {
    const res = await fetch(`${API}/stakeholder/actions`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ actions: [json.data, ...s.actions] }));
  },
  updateAction: async (id, data) => {
    const res = await fetch(`${API}/stakeholder/actions/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ actions: s.actions.map((x) => (x.id === id ? json.data : x)) }));
  },
  deleteAction: async (id) => {
    await fetch(`${API}/stakeholder/actions/${id}`, { method: 'DELETE', headers: getHeaders() });
    set((s) => ({ actions: s.actions.filter((x) => x.id !== id) }));
  },
}));
