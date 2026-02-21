// QualityGate Zustand Store — Inspections, NCRs, Punch Items

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────

export interface Inspection {
  id: string;
  projectId: string;
  locationId?: string | null;
  tradeId?: string | null;
  title: string;
  type: string;
  status: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  inspectorId?: string | null;
  result?: string | null;
  score?: string | null;
  notes?: string | null;
  checklistData: unknown[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ncr {
  id: string;
  projectId: string;
  inspectionId?: string | null;
  locationId?: string | null;
  tradeId?: string | null;
  ncrNumber: string;
  title: string;
  description?: string | null;
  severity: string;
  category: string;
  status: string;
  assignedTo?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  reworkCost?: string | null;
  dueDate?: string | null;
  closedDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PunchItem {
  id: string;
  projectId: string;
  locationId?: string | null;
  tradeId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  closedDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QualitySummary {
  ftrRate: number;
  ftrThreshold: number;
  ftrMeetsTarget: boolean;
  openNcrs: number;
  closedNcrs: number;
  totalInspections: number;
  passedInspections: number;
  copq: number | null;
  copqEnabled: boolean;
  openPunchItems: number;
  inspectionsThisWeek: number;
  inspectionFrequency: 'per_activity' | 'per_milestone';
  ncrApproval: 'engineer_approval' | 'self_certification';
}

// ── Store ──────────────────────────────────────────────

interface QualityState {
  summary: QualitySummary | null;
  inspections: Inspection[];
  ncrs: Ncr[];
  punchItems: PunchItem[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchSummary: (projectId: string) => Promise<void>;
  fetchInspections: (projectId: string, opts?: { status?: string; type?: string }) => Promise<void>;
  fetchNcrs: (projectId: string, opts?: { status?: string; severity?: string }) => Promise<void>;
  fetchPunchItems: (projectId: string, opts?: { status?: string; priority?: string }) => Promise<void>;
  fetchAll: (projectId: string) => Promise<void>;

  createInspection: (data: Partial<Inspection>) => Promise<Inspection | null>;
  updateInspection: (id: string, data: Partial<Inspection>) => Promise<Inspection | null>;
  deleteInspection: (id: string) => Promise<boolean>;

  createNcr: (data: Partial<Ncr>) => Promise<Ncr | null>;
  updateNcr: (id: string, data: Partial<Ncr>) => Promise<Ncr | null>;
  deleteNcr: (id: string) => Promise<boolean>;

  createPunchItem: (data: Partial<PunchItem>) => Promise<PunchItem | null>;
  updatePunchItem: (id: string, data: Partial<PunchItem>) => Promise<PunchItem | null>;
  deletePunchItem: (id: string) => Promise<boolean>;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

const API = '/api/v1/quality';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...getAuthHeaders(), ...init?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return json.data ?? json;
}

export const useQualityStore = create<QualityState>((set, get) => ({
  summary: null,
  inspections: [],
  ncrs: [],
  punchItems: [],
  loading: false,
  error: null,
  initialized: false,

  fetchSummary: async (projectId) => {
    try {
      const data = await apiFetch<QualitySummary>(`/summary/project/${projectId}`);
      set({ summary: data });
    } catch { set({ summary: null }); }
  },

  fetchInspections: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.type) params.set('type', opts.type);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/inspections/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ inspections: json.data || [] });
    } catch { set({ inspections: [] }); }
  },

  fetchNcrs: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.severity) params.set('severity', opts.severity);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/ncrs/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ ncrs: json.data || [] });
    } catch { set({ ncrs: [] }); }
  },

  fetchPunchItems: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.priority) params.set('priority', opts.priority);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/punch-items/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ punchItems: json.data || [] });
    } catch { set({ punchItems: [] }); }
  },

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const store = get();
      await Promise.all([
        store.fetchSummary(projectId),
        store.fetchInspections(projectId),
        store.fetchNcrs(projectId),
        store.fetchPunchItems(projectId),
      ]);
      set({ loading: false, initialized: true });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to fetch quality data', initialized: true });
    }
  },

  createInspection: async (data) => {
    try {
      return await apiFetch<Inspection>('/inspections', { method: 'POST', body: JSON.stringify(data) });
    } catch { return null; }
  },
  updateInspection: async (id, data) => {
    try {
      return await apiFetch<Inspection>(`/inspections/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch { return null; }
  },
  deleteInspection: async (id) => {
    try { await apiFetch(`/inspections/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createNcr: async (data) => {
    try {
      return await apiFetch<Ncr>('/ncrs', { method: 'POST', body: JSON.stringify(data) });
    } catch { return null; }
  },
  updateNcr: async (id, data) => {
    try {
      return await apiFetch<Ncr>(`/ncrs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch { return null; }
  },
  deleteNcr: async (id) => {
    try { await apiFetch(`/ncrs/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createPunchItem: async (data) => {
    try {
      return await apiFetch<PunchItem>('/punch-items', { method: 'POST', body: JSON.stringify(data) });
    } catch { return null; }
  },
  updatePunchItem: async (id, data) => {
    try {
      return await apiFetch<PunchItem>(`/punch-items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } catch { return null; }
  },
  deletePunchItem: async (id) => {
    try { await apiFetch(`/punch-items/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },
}));
