// SafeZone Zustand Store — Incidents, PTW, Observations, Toolbox Talks

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────

export interface Incident {
  id: string;
  projectId: string;
  locationId?: string | null;
  incidentNumber: string;
  title: string;
  description?: string | null;
  type: string;
  severity: string;
  status: string;
  occurredAt: string;
  reportedBy: string;
  injuredPerson?: string | null;
  bodyPart?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  lostDays: number;
  closedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermitToWork {
  id: string;
  projectId: string;
  locationId?: string | null;
  permitNumber: string;
  title: string;
  type: string;
  status: string;
  hazards: unknown[];
  precautions: unknown[];
  requestedBy: string;
  approvedBy?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  closedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyObservation {
  id: string;
  projectId: string;
  locationId?: string | null;
  title: string;
  description?: string | null;
  type: string;
  category: string;
  severity?: string | null;
  status: string;
  observedBy: string;
  assignedTo?: string | null;
  resolvedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToolboxTalk {
  id: string;
  projectId: string;
  title: string;
  topic: string;
  conductedBy: string;
  conductedAt: string;
  attendeeCount: number;
  duration: number;
  notes?: string | null;
  createdAt: string;
}

export interface SafetySummary {
  totalIncidents: number;
  openIncidents: number;
  nearMisses: number;
  lostTimeDays: number;
  daysSinceLastIncident: number;
  activePtws: number;
  openObservations: number;
  toolboxTalksThisMonth: number;
  ltir: number;
  reportingLevel: 'detailed' | 'summary';
  ptwStrictness: 'strict' | 'standard';
  toolboxFrequency: 'daily' | 'weekly';
}

// ── Store ──────────────────────────────────────────────

interface SafetyState {
  summary: SafetySummary | null;
  incidents: Incident[];
  permits: PermitToWork[];
  observations: SafetyObservation[];
  toolboxTalks: ToolboxTalk[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchSummary: (projectId: string) => Promise<void>;
  fetchIncidents: (projectId: string, opts?: { status?: string; type?: string }) => Promise<void>;
  fetchPermits: (projectId: string, opts?: { status?: string; type?: string }) => Promise<void>;
  fetchObservations: (projectId: string, opts?: { status?: string; type?: string }) => Promise<void>;
  fetchToolboxTalks: (projectId: string) => Promise<void>;
  fetchAll: (projectId: string) => Promise<void>;

  createIncident: (data: Partial<Incident>) => Promise<Incident | null>;
  updateIncident: (id: string, data: Partial<Incident>) => Promise<Incident | null>;
  deleteIncident: (id: string) => Promise<boolean>;

  createPermit: (data: Partial<PermitToWork>) => Promise<PermitToWork | null>;
  updatePermit: (id: string, data: Partial<PermitToWork>) => Promise<PermitToWork | null>;
  deletePermit: (id: string) => Promise<boolean>;

  createObservation: (data: Partial<SafetyObservation>) => Promise<SafetyObservation | null>;
  updateObservation: (id: string, data: Partial<SafetyObservation>) => Promise<SafetyObservation | null>;
  deleteObservation: (id: string) => Promise<boolean>;

  createToolboxTalk: (data: Partial<ToolboxTalk>) => Promise<ToolboxTalk | null>;
  deleteToolboxTalk: (id: string) => Promise<boolean>;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

const API = '/api/v1/safety';

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

export const useSafetyStore = create<SafetyState>((set, get) => ({
  summary: null,
  incidents: [],
  permits: [],
  observations: [],
  toolboxTalks: [],
  loading: false,
  error: null,
  initialized: false,

  fetchSummary: async (projectId) => {
    try {
      const data = await apiFetch<SafetySummary>(`/summary/project/${projectId}`);
      set({ summary: data });
    } catch { set({ summary: null }); }
  },

  fetchIncidents: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.type) params.set('type', opts.type);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/incidents/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ incidents: json.data || [] });
    } catch { set({ incidents: [] }); }
  },

  fetchPermits: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.type) params.set('type', opts.type);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/ptw/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ permits: json.data || [] });
    } catch { set({ permits: [] }); }
  },

  fetchObservations: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.type) params.set('type', opts.type);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/observations/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ observations: json.data || [] });
    } catch { set({ observations: [] }); }
  },

  fetchToolboxTalks: async (projectId) => {
    try {
      const res = await fetch(`${API}/toolbox-talks/project/${projectId}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ toolboxTalks: json.data || [] });
    } catch { set({ toolboxTalks: [] }); }
  },

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const store = get();
      await Promise.all([
        store.fetchSummary(projectId),
        store.fetchIncidents(projectId),
        store.fetchPermits(projectId),
        store.fetchObservations(projectId),
        store.fetchToolboxTalks(projectId),
      ]);
      set({ loading: false, initialized: true });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to fetch safety data', initialized: true });
    }
  },

  createIncident: async (data) => {
    try { return await apiFetch<Incident>('/incidents', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  updateIncident: async (id, data) => {
    try { return await apiFetch<Incident>(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch { return null; }
  },
  deleteIncident: async (id) => {
    try { await apiFetch(`/incidents/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createPermit: async (data) => {
    try { return await apiFetch<PermitToWork>('/ptw', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  updatePermit: async (id, data) => {
    try { return await apiFetch<PermitToWork>(`/ptw/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch { return null; }
  },
  deletePermit: async (id) => {
    try { await apiFetch(`/ptw/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createObservation: async (data) => {
    try { return await apiFetch<SafetyObservation>('/observations', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  updateObservation: async (id, data) => {
    try { return await apiFetch<SafetyObservation>(`/observations/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch { return null; }
  },
  deleteObservation: async (id) => {
    try { await apiFetch(`/observations/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createToolboxTalk: async (data) => {
    try { return await apiFetch<ToolboxTalk>('/toolbox-talks', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  deleteToolboxTalk: async (id) => {
    try { await apiFetch(`/toolbox-talks/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },
}));
