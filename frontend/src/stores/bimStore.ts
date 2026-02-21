// BIM Intelligence Engine Zustand Store — IFC upload, processing, results

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────

export interface BIMProjectInfo {
  name: string | null;
  description: string | null;
  phase: string | null;
  author: string | null;
  organization: string | null;
  schema_version: string | null;
  application: string | null;
}

export interface BIMSummary {
  total_elements: number;
  elements_by_type: Record<string, number>;
  elements_by_storey: Record<string, number>;
  classified_elements: number;
  classification_coverage_pct: number;
  elements_with_quantities: number;
  quantity_coverage_pct: number;
  total_relationships: number;
  total_zones: number;
  total_cost_items: number;
  storeys: string[];
  spaces: string[];
}

export interface BIMElement {
  element_id: string;
  global_id: string;
  ifc_class: string;
  name: string | null;
  storey: string | null;
  material: string | null;
  system: string;
  quantities: Record<string, unknown>[];
  classifications: Record<string, unknown>[];
}

export interface BIMWbsNode {
  code: string;
  name: string;
  level: number;
  parent_code: string | null;
  element_count: number;
  children?: BIMWbsNode[];
}

export interface BIMLbsNode {
  code: string;
  name: string;
  level: number;
  type: string;
  element_count: number;
  children?: BIMLbsNode[];
}

export interface BIMZone {
  zone_id: string;
  name: string;
  zone_type: string;
  storey: string | null;
  element_count: number;
  total_volume: number;
  total_area: number;
  work_density: number;
  sequence_order: number;
  trade_sequence: string[];
  estimated_takt_days: number;
}

export interface BIMCostItem {
  cost_item_id: string;
  element_id: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  total_cost: number;
  currency: string;
}

export interface BIMProcessResult {
  project_id: string;
  source_file: string;
  processed_at: string;
  project_info: BIMProjectInfo;
  status: string;
  summary: BIMSummary;
  elements: BIMElement[];
  wbs_hierarchy: BIMWbsNode[];
  wbs_flat: BIMWbsNode[];
  lbs_hierarchy: BIMLbsNode | null;
  lbs_flat: BIMLbsNode[];
  zones: BIMZone[];
  cost_items: BIMCostItem[];
  relationships: Record<string, unknown>[];
  processing_time_seconds: number;
}

export interface BIMUploadResult {
  project_id: string;
  file_name: string;
  file_size_mb: number;
  message: string;
}

export interface BIMProjectListItem {
  project_id: string;
  source_file: string;
  status: string;
  element_count: number;
  created_at: string;
}

// ── API Helpers ────────────────────────────────────────

const BIM_API_URL = process.env.NEXT_PUBLIC_BIM_API_URL || '/api/v1/bim';

async function bimApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BIM_API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || body.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Store ──────────────────────────────────────────────

interface BIMState {
  // Upload state
  uploading: boolean;
  uploadResult: BIMUploadResult | null;
  uploadError: string | null;

  // Processing state
  processing: boolean;
  processError: string | null;

  // Results
  currentResult: BIMProcessResult | null;
  projects: BIMProjectListItem[];
  loadingProjects: boolean;

  // Actions
  uploadFile: (file: File) => Promise<BIMUploadResult | null>;
  processProject: (projectId: string) => Promise<BIMProcessResult | null>;
  loadResult: (projectId: string) => Promise<BIMProcessResult | null>;
  reset: () => void;
}

export const useBIMStore = create<BIMState>((set, get) => ({
  uploading: false,
  uploadResult: null,
  uploadError: null,
  processing: false,
  processError: null,
  currentResult: null,
  projects: [],
  loadingProjects: false,

  uploadFile: async (file: File) => {
    set({ uploading: true, uploadError: null, uploadResult: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await bimApi<BIMUploadResult>('/upload', {
        method: 'POST',
        body: formData,
      });
      set({ uploading: false, uploadResult: result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      set({ uploading: false, uploadError: msg });
      return null;
    }
  },

  processProject: async (projectId: string) => {
    set({ processing: true, processError: null });
    try {
      const result = await bimApi<BIMProcessResult>('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      set({ processing: false, currentResult: result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      set({ processing: false, processError: msg });
      return null;
    }
  },

  loadResult: async (projectId: string) => {
    try {
      const result = await bimApi<BIMProcessResult>(`/${projectId}`);
      set({ currentResult: result });
      return result;
    } catch {
      return null;
    }
  },

  reset: () => {
    set({
      uploading: false,
      uploadResult: null,
      uploadError: null,
      processing: false,
      processError: null,
      currentResult: null,
    });
  },
}));
