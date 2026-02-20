// CrewFlow Zustand Store — Crews, Equipment, Materials, Scaffolds

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────

export interface Crew {
  id: string;
  projectId: string;
  tradeId?: string | null;
  name: string;
  code: string;
  foremanName?: string | null;
  workerCount: number;
  status: string;
  company?: string | null;
  skillLevel?: string | null;
  utilization: string;
  dailyRate?: string | null;
  currency: string;
  locationId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentItem {
  id: string;
  projectId: string;
  name: string;
  code: string;
  type: string;
  status: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  capacity?: string | null;
  utilization: string;
  locationId?: string | null;
  operatorName?: string | null;
  dailyRate?: string | null;
  currency: string;
  lastInspection?: string | null;
  nextInspection?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialItem {
  id: string;
  projectId: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  plannedQty: string;
  receivedQty: string;
  consumedQty: string;
  wasteQty: string;
  stockQty: string;
  unitPrice?: string | null;
  currency: string;
  supplier?: string | null;
  status: string;
  reorderLevel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Scaffold {
  id: string;
  projectId: string;
  locationId?: string | null;
  tag: string;
  type: string;
  status: string;
  height?: string | null;
  length?: string | null;
  width?: string | null;
  areaSqm?: string | null;
  loadCapacity?: string | null;
  erectedDate?: string | null;
  lastInspection?: string | null;
  nextInspection?: string | null;
  inspectionInterval: number;
  dismantledDate?: string | null;
  contractor?: string | null;
  permitNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceSummary {
  totalCrews: number;
  activeCrews: number;
  totalWorkers: number;
  activeWorkers: number;
  avgUtilization: string;
  totalEquipment: number;
  operationalEquipment: number;
  underMaintenance: number;
  totalMaterials: number;
  lowStockItems: number;
  totalWasteRate: string;
  activeScaffolds: number;
  inspectionsDue: number;
  totalScaffoldArea: string;
}

// ── Store ──────────────────────────────────────────────

interface ResourceState {
  summary: ResourceSummary | null;
  crews: Crew[];
  equipment: EquipmentItem[];
  materials: MaterialItem[];
  scaffolds: Scaffold[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchSummary: (projectId: string) => Promise<void>;
  fetchCrews: (projectId: string, opts?: { status?: string }) => Promise<void>;
  fetchEquipment: (projectId: string, opts?: { status?: string; type?: string }) => Promise<void>;
  fetchMaterials: (projectId: string, opts?: { status?: string; category?: string }) => Promise<void>;
  fetchScaffolds: (projectId: string, opts?: { status?: string }) => Promise<void>;
  fetchAll: (projectId: string) => Promise<void>;

  createCrew: (data: Partial<Crew>) => Promise<Crew | null>;
  updateCrew: (id: string, data: Partial<Crew>) => Promise<Crew | null>;
  deleteCrew: (id: string) => Promise<boolean>;

  createEquipment: (data: Partial<EquipmentItem>) => Promise<EquipmentItem | null>;
  updateEquipment: (id: string, data: Partial<EquipmentItem>) => Promise<EquipmentItem | null>;
  deleteEquipment: (id: string) => Promise<boolean>;

  createMaterial: (data: Partial<MaterialItem>) => Promise<MaterialItem | null>;
  updateMaterial: (id: string, data: Partial<MaterialItem>) => Promise<MaterialItem | null>;
  deleteMaterial: (id: string) => Promise<boolean>;

  createScaffold: (data: Partial<Scaffold>) => Promise<Scaffold | null>;
  updateScaffold: (id: string, data: Partial<Scaffold>) => Promise<Scaffold | null>;
  deleteScaffold: (id: string) => Promise<boolean>;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

const API = '/api/v1/resources';

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

export const useResourceStore = create<ResourceState>((set, get) => ({
  summary: null,
  crews: [],
  equipment: [],
  materials: [],
  scaffolds: [],
  loading: false,
  error: null,
  initialized: false,

  fetchSummary: async (projectId) => {
    try {
      const data = await apiFetch<ResourceSummary>(`/summary/project/${projectId}`);
      set({ summary: data });
    } catch { set({ summary: null }); }
  },

  fetchCrews: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/crews/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ crews: json.data || [] });
    } catch { set({ crews: [] }); }
  },

  fetchEquipment: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.type) params.set('type', opts.type);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/equipment/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ equipment: json.data || [] });
    } catch { set({ equipment: [] }); }
  },

  fetchMaterials: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      if (opts?.category) params.set('category', opts.category);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/materials/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ materials: json.data || [] });
    } catch { set({ materials: [] }); }
  },

  fetchScaffolds: async (projectId, opts) => {
    try {
      const params = new URLSearchParams();
      if (opts?.status) params.set('status', opts.status);
      const qs = params.toString() ? `?${params}` : '';
      const res = await fetch(`${API}/scaffolds/project/${projectId}${qs}`, { headers: getAuthHeaders() });
      const json = await res.json();
      set({ scaffolds: json.data || [] });
    } catch { set({ scaffolds: [] }); }
  },

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const store = get();
      await Promise.all([
        store.fetchSummary(projectId),
        store.fetchCrews(projectId),
        store.fetchEquipment(projectId),
        store.fetchMaterials(projectId),
        store.fetchScaffolds(projectId),
      ]);
      set({ loading: false, initialized: true });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to fetch resource data', initialized: true });
    }
  },

  createCrew: async (data) => {
    try { return await apiFetch<Crew>('/crews', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  updateCrew: async (id, data) => {
    try { return await apiFetch<Crew>(`/crews/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch { return null; }
  },
  deleteCrew: async (id) => {
    try { await apiFetch(`/crews/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createEquipment: async (data) => {
    try { return await apiFetch<EquipmentItem>('/equipment', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  updateEquipment: async (id, data) => {
    try { return await apiFetch<EquipmentItem>(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch { return null; }
  },
  deleteEquipment: async (id) => {
    try { await apiFetch(`/equipment/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createMaterial: async (data) => {
    try { return await apiFetch<MaterialItem>('/materials', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  updateMaterial: async (id, data) => {
    try { return await apiFetch<MaterialItem>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch { return null; }
  },
  deleteMaterial: async (id) => {
    try { await apiFetch(`/materials/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },

  createScaffold: async (data) => {
    try { return await apiFetch<Scaffold>('/scaffolds', { method: 'POST', body: JSON.stringify(data) }); } catch { return null; }
  },
  updateScaffold: async (id, data) => {
    try { return await apiFetch<Scaffold>(`/scaffolds/${id}`, { method: 'PUT', body: JSON.stringify(data) }); } catch { return null; }
  },
  deleteScaffold: async (id) => {
    try { await apiFetch(`/scaffolds/${id}`, { method: 'DELETE' }); return true; } catch { return false; }
  },
}));
