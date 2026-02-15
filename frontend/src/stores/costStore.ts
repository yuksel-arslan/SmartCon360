// CostPilot Zustand Store — Full CRUD for all 8 cost entities

import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkItem {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  category: string;
  subcategory?: string;
  tradeId?: string;
  source: string;
  sourceYear?: number;
  isActive: boolean;
  unitPriceAnalyses?: UnitPriceAnalysis[];
}

export interface UnitPriceAnalysis {
  id: string;
  workItemId: string;
  version: number;
  laborCost: string;
  materialCost: string;
  equipmentCost: string;
  subtotal: string;
  overheadPct: string;
  profitPct: string;
  overheadAmount: string;
  profitAmount: string;
  unitPrice: string;
  currency: string;
  source: string;
  isActive: boolean;
  resources?: UnitPriceResource[];
  workItem?: WorkItem;
}

export interface UnitPriceResource {
  id: string;
  analysisId: string;
  resourceType: string;
  code?: string;
  name: string;
  unit: string;
  quantity: string;
  unitRate: string;
  total: string;
}

export interface QuantityTakeoff {
  id: string;
  projectId: string;
  workItemId: string;
  locationId?: string;
  quantity: string;
  unit: string;
  calculationFormula?: string;
  dimensions?: Record<string, number>;
  source?: string;
  drawingRef?: string;
  revision: number;
  notes?: string;
  workItem?: WorkItem;
}

export interface Estimate {
  id: string;
  projectId: string;
  name: string;
  type: string;
  totalAmount: string;
  currency: string;
  vatPct: string;
  vatAmount: string;
  grandTotal: string;
  status: string;
  version: number;
  notes?: string;
  createdAt: string;
  items?: EstimateItem[];
}

export interface EstimateItem {
  id: string;
  estimateId: string;
  workItemId: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  workItem?: WorkItem;
}

export interface Budget {
  id: string;
  projectId: string;
  estimateId?: string;
  name: string;
  totalAmount: string;
  currency: string;
  status: string;
  version: number;
  items?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  workItemId?: string;
  wbsCode?: string;
  description: string;
  tradeId?: string;
  plannedAmount: string;
  committedAmount: string;
  actualAmount: string;
  category: string;
}

export interface PaymentCertificate {
  id: string;
  projectId: string;
  budgetId?: string;
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
  grossAmount: string;
  retentionPct: string;
  retentionAmount: string;
  advanceDeduction: string;
  otherDeductions: string;
  priceEscalation: string;
  vatPct: string;
  vatAmount: string;
  netAmount: string;
  cumulativeAmount: string;
  status: string;
  submittedDate?: string;
  approvedDate?: string;
  paymentDate?: string;
  createdBy: string;
  createdAt: string;
  items?: PaymentItem[];
}

export interface PaymentItem {
  id: string;
  certificateId: string;
  workItemId: string;
  contractQty: string;
  previousQty: string;
  currentQty: string;
  cumulativeQty: string;
  unitPrice: string;
  currentAmount: string;
  cumulativeAmount: string;
  completionPct: string;
  workItem?: WorkItem;
}

export interface EvmSnapshot {
  id: string;
  projectId: string;
  snapshotDate: string;
  pv: string;
  ev: string;
  ac: string;
  cv: string;
  sv: string;
  cpi: string;
  spi: string;
  eac: string;
  etc: string;
  vac: string;
  tcpi: string;
}

export interface CostRecord {
  id: string;
  projectId: string;
  budgetItemId?: string;
  amount: string;
  type: string;
  date: string;
  description?: string;
  invoiceRef?: string;
  vendor?: string;
}

export interface PriceCatalog {
  id: string;
  projectId?: string;
  name: string;
  source: string; // bayindirlik | iller_bankasi | masterformat | uniformat | uniclass | rsmeans | custom | supplier
  standard?: string; // masterformat | uniformat | uniclass | null
  year: number;
  period?: string;
  region?: string; // US_Northeast, UK_London, TR_Istanbul, etc.
  currency: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  itemCount: number;
  isActive: boolean;
  createdAt: string;
  _count?: { items: number };
  items?: PriceCatalogItem[];
}

export interface PriceCatalogItem {
  id: string;
  catalogId: string;
  code: string;
  name: string;
  unit: string;
  unitPrice: string;
  category?: string;
  subcategory?: string;
  // Cost breakdown
  laborCost?: string;
  materialCost?: string;
  equipmentCost?: string;
  // International classification codes
  csiCode?: string;
  divisionCode?: string;
  divisionName?: string;
  uniformatCode?: string;
  uniclassCode?: string;
  // RSMeans specific
  locationFactor?: string;
  location?: string;
  crewCode?: string;
  productivity?: string;
  assemblyType?: string;
  notes?: string;
  catalog?: { name: string; source: string; standard?: string; year: number; region?: string };
}

// ============================================================================
// STORE
// ============================================================================

interface CostState {
  // Data
  workItems: WorkItem[];
  workItemsMeta: { total: number; page: number; pages: number };
  unitPriceAnalyses: UnitPriceAnalysis[];
  quantityTakeoffs: QuantityTakeoff[];
  estimates: Estimate[];
  budgets: Budget[];
  selectedBudget: Budget | null;
  payments: PaymentCertificate[];
  costRecords: CostRecord[];
  evmSnapshots: EvmSnapshot[];

  // Catalog
  catalogs: PriceCatalog[];
  catalogItems: PriceCatalogItem[];
  catalogItemsMeta: { total: number; page: number; pages: number };

  // Uniclass live search
  uniclassResults: Array<{ code: string; title: string; description?: string }>;
  uniclassLoading: boolean;

  // Division/Element filters
  catalogDivisions: Array<{ code: string; name: string }>;
  catalogCategories: string[];

  // State
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions — fetch
  fetchWorkItems: (projectId: string, opts?: { category?: string; search?: string }) => Promise<void>;
  fetchUnitPrices: (workItemId: string) => Promise<void>;
  fetchQuantityTakeoffs: (projectId: string) => Promise<void>;
  fetchEstimates: (projectId: string) => Promise<void>;
  fetchBudgets: (projectId: string) => Promise<void>;
  fetchBudgetDetail: (budgetId: string) => Promise<void>;
  fetchPayments: (projectId: string) => Promise<void>;
  fetchCostRecords: (projectId: string) => Promise<void>;
  fetchEvmSnapshots: (projectId: string) => Promise<void>;
  fetchAll: (projectId: string) => Promise<void>;

  // Actions — CRUD Work Items
  addWorkItem: (data: { projectId: string; code: string; name: string; unit: string; category: string; description?: string; subcategory?: string; source?: string; sourceYear?: number }) => Promise<WorkItem | null>;
  updateWorkItem: (id: string, data: Partial<WorkItem>) => Promise<WorkItem | null>;
  deleteWorkItem: (id: string) => Promise<boolean>;

  // Actions — CRUD Unit Prices
  createUnitPriceAnalysis: (data: { workItemId: string; overheadPct?: number; profitPct?: number; resources: Array<{ resourceType: string; name: string; unit: string; quantity: number; unitRate: number }> }) => Promise<UnitPriceAnalysis | null>;

  // Actions — CRUD Quantity Takeoffs
  addQuantityTakeoff: (data: { projectId: string; workItemId: string; quantity: number; unit: string; drawingRef?: string; notes?: string }) => Promise<QuantityTakeoff | null>;
  updateQuantityTakeoff: (id: string, data: Partial<QuantityTakeoff>) => Promise<QuantityTakeoff | null>;
  deleteQuantityTakeoff: (id: string) => Promise<boolean>;

  // Actions — CRUD Estimates
  createEstimate: (data: { projectId: string; name: string; type: string; createdBy: string }) => Promise<Estimate | null>;
  deleteEstimate: (id: string) => Promise<boolean>;

  // Actions — CRUD Budgets
  createBudget: (data: { projectId: string; name: string; totalAmount: number }) => Promise<Budget | null>;

  // Actions — CRUD Payments
  createPayment: (data: { projectId: string; periodNumber: number; periodStart: string; periodEnd: string; createdBy: string; retentionPct?: number }) => Promise<PaymentCertificate | null>;
  submitPayment: (id: string) => Promise<boolean>;
  approvePayment: (id: string, approvedBy: string) => Promise<boolean>;

  // Actions — CRUD Cost Records
  addCostRecord: (data: { projectId: string; amount: number; type: string; date: string; description?: string; vendor?: string; invoiceRef?: string }) => Promise<CostRecord | null>;

  // Actions — EVM
  createEvmSnapshot: (data: { projectId: string; snapshotDate: string; pv: number; ev: number; ac: number; bac: number }) => Promise<EvmSnapshot | null>;

  // Actions — Catalog
  fetchCatalogs: (opts?: { source?: string; year?: number; projectId?: string }) => Promise<void>;
  createCatalog: (data: { name: string; source: string; year: number; period?: string; region?: string; description?: string; projectId?: string }) => Promise<PriceCatalog | null>;
  deleteCatalog: (id: string) => Promise<boolean>;
  uploadCatalogFile: (catalogId: string, file: File) => Promise<{ imported: number; errors: number; errorDetails: string[] } | null>;
  searchCatalogItems: (opts: { catalogId?: string; search?: string; category?: string; divisionCode?: string; uniformatCode?: string; page?: number; limit?: number }) => Promise<void>;
  copyToProject: (catalogId: string, itemIds: string[], projectId: string) => Promise<{ created: number; skipped: number } | null>;

  // Actions — Uniclass Live Search
  searchUniclass: (query: string, table?: string) => Promise<void>;

  // Actions — Division/Category Filters
  fetchCatalogDivisions: (catalogId: string) => Promise<void>;
  fetchCatalogCategories: (catalogId: string) => Promise<void>;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

const API = '/api/v1/cost';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return json.data ?? json;
}

export const useCostStore = create<CostState>((set, get) => ({
  workItems: [],
  workItemsMeta: { total: 0, page: 1, pages: 1 },
  unitPriceAnalyses: [],
  quantityTakeoffs: [],
  estimates: [],
  budgets: [],
  selectedBudget: null,
  payments: [],
  costRecords: [],
  evmSnapshots: [],

  catalogs: [],
  catalogItems: [],
  catalogItemsMeta: { total: 0, page: 1, pages: 1 },
  uniclassResults: [],
  uniclassLoading: false,
  catalogDivisions: [],
  catalogCategories: [],

  loading: false,
  error: null,
  initialized: false,

  // ── FETCH ──

  fetchWorkItems: async (projectId, opts) => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (opts?.category) params.set('category', opts.category);
      if (opts?.search) params.set('search', opts.search);
      const res = await fetch(`${API}/work-items/project/${projectId}?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ workItems: json.data || [], workItemsMeta: json.meta || { total: 0, page: 1, pages: 1 } });
    } catch (e) {
      console.error('fetchWorkItems failed:', e);
      set({ workItems: [] });
    }
  },

  fetchUnitPrices: async (workItemId) => {
    try {
      const data = await apiFetch<UnitPriceAnalysis[]>(`/unit-prices/work-item/${workItemId}`);
      set({ unitPriceAnalyses: data });
    } catch {
      set({ unitPriceAnalyses: [] });
    }
  },

  fetchQuantityTakeoffs: async (projectId) => {
    try {
      const data = await apiFetch<QuantityTakeoff[]>(`/quantity-takeoffs/project/${projectId}`);
      set({ quantityTakeoffs: data });
    } catch {
      set({ quantityTakeoffs: [] });
    }
  },

  fetchEstimates: async (projectId) => {
    try {
      const data = await apiFetch<Estimate[]>(`/estimates/project/${projectId}`);
      set({ estimates: data });
    } catch {
      set({ estimates: [] });
    }
  },

  fetchBudgets: async (projectId) => {
    try {
      const data = await apiFetch<Budget[]>(`/budgets/project/${projectId}`);
      set({ budgets: data });
    } catch {
      set({ budgets: [] });
    }
  },

  fetchBudgetDetail: async (budgetId) => {
    try {
      const data = await apiFetch<Budget>(`/budgets/${budgetId}`);
      set({ selectedBudget: data });
    } catch {
      set({ selectedBudget: null });
    }
  },

  fetchPayments: async (projectId) => {
    try {
      const data = await apiFetch<PaymentCertificate[]>(`/payments/project/${projectId}`);
      set({ payments: data });
    } catch {
      set({ payments: [] });
    }
  },

  fetchCostRecords: async (projectId) => {
    try {
      const data = await apiFetch<CostRecord[]>(`/cost-records/project/${projectId}`);
      set({ costRecords: data });
    } catch {
      set({ costRecords: [] });
    }
  },

  fetchEvmSnapshots: async (projectId) => {
    try {
      const data = await apiFetch<EvmSnapshot[]>(`/evm/project/${projectId}/history`);
      set({ evmSnapshots: data });
    } catch {
      set({ evmSnapshots: [] });
    }
  },

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const s = get();
      await Promise.all([
        s.fetchWorkItems(projectId),
        s.fetchEstimates(projectId),
        s.fetchBudgets(projectId),
        s.fetchPayments(projectId),
        s.fetchEvmSnapshots(projectId),
        s.fetchQuantityTakeoffs(projectId),
        s.fetchCostRecords(projectId),
      ]);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load data' });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  // ── CRUD: Work Items ──

  addWorkItem: async (data) => {
    try {
      const created = await apiFetch<WorkItem>('/work-items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s) => ({ workItems: [...s.workItems, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  updateWorkItem: async (id, data) => {
    try {
      const updated = await apiFetch<WorkItem>(`/work-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      set((s) => ({ workItems: s.workItems.map((w) => (w.id === id ? { ...w, ...updated } : w)) }));
      return updated;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  deleteWorkItem: async (id) => {
    try {
      await apiFetch(`/work-items/${id}`, { method: 'DELETE' });
      set((s) => ({ workItems: s.workItems.filter((w) => w.id !== id) }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  // ── CRUD: Unit Prices ──

  createUnitPriceAnalysis: async (data: { workItemId: string; overheadPct?: number; profitPct?: number; resources: Array<{ resourceType: string; name: string; unit: string; quantity: number; unitRate: number }> }) => {
    try {
      const created = await apiFetch<UnitPriceAnalysis>('/unit-prices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ unitPriceAnalyses: [...s.unitPriceAnalyses, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  // ── CRUD: Quantity Takeoffs ──

  addQuantityTakeoff: async (data: { projectId: string; workItemId: string; quantity: number; unit: string; drawingRef?: string; notes?: string }) => {
    try {
      const created = await apiFetch<QuantityTakeoff>('/quantity-takeoffs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ quantityTakeoffs: [...s.quantityTakeoffs, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  updateQuantityTakeoff: async (id: string, data: Partial<QuantityTakeoff>) => {
    try {
      const updated = await apiFetch<QuantityTakeoff>(`/quantity-takeoffs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ quantityTakeoffs: s.quantityTakeoffs.map((q: QuantityTakeoff) => (q.id === id ? { ...q, ...updated } : q)) }));
      return updated;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  deleteQuantityTakeoff: async (id: string) => {
    try {
      await apiFetch(`/quantity-takeoffs/${id}`, { method: 'DELETE' });
      set((s: CostState) => ({ quantityTakeoffs: s.quantityTakeoffs.filter((q: QuantityTakeoff) => q.id !== id) }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  // ── CRUD: Estimates ──

  createEstimate: async (data: { projectId: string; name: string; type: string; createdBy: string }) => {
    try {
      const created = await apiFetch<Estimate>('/estimates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ estimates: [...s.estimates, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  deleteEstimate: async (id: string) => {
    try {
      await apiFetch(`/estimates/${id}`, { method: 'DELETE' });
      set((s: CostState) => ({ estimates: s.estimates.filter((e: Estimate) => e.id !== id) }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  // ── CRUD: Budgets ──

  createBudget: async (data: { projectId: string; name: string; totalAmount: number }) => {
    try {
      const created = await apiFetch<Budget>('/budgets', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ budgets: [...s.budgets, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  // ── CRUD: Payments ──

  createPayment: async (data: { projectId: string; periodNumber: number; periodStart: string; periodEnd: string; createdBy: string; retentionPct?: number }) => {
    try {
      const created = await apiFetch<PaymentCertificate>('/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ payments: [...s.payments, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  submitPayment: async (id: string) => {
    try {
      await apiFetch(`/payments/${id}/submit`, { method: 'POST' });
      set((s: CostState) => ({ payments: s.payments.map((p: PaymentCertificate) => (p.id === id ? { ...p, status: 'submitted' } : p)) }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  approvePayment: async (id: string, approvedBy: string) => {
    try {
      await apiFetch(`/payments/${id}/approve`, { method: 'POST', body: JSON.stringify({ approvedBy }) });
      set((s: CostState) => ({ payments: s.payments.map((p: PaymentCertificate) => (p.id === id ? { ...p, status: 'approved' } : p)) }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  // ── CRUD: Cost Records ──

  addCostRecord: async (data: { projectId: string; amount: number; type: string; date: string; description?: string; vendor?: string; invoiceRef?: string }) => {
    try {
      const created = await apiFetch<CostRecord>('/cost-records', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ costRecords: [...s.costRecords, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  // ── EVM ──

  createEvmSnapshot: async (data: { projectId: string; snapshotDate: string; pv: number; ev: number; ac: number; bac: number }) => {
    try {
      const created = await apiFetch<EvmSnapshot>('/evm/snapshot', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ evmSnapshots: [...s.evmSnapshots, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  // ── Catalog ──

  fetchCatalogs: async (opts?: { source?: string; year?: number; projectId?: string }) => {
    try {
      const params = new URLSearchParams();
      if (opts?.source) params.set('source', opts.source);
      if (opts?.year) params.set('year', String(opts.year));
      if (opts?.projectId) params.set('projectId', opts.projectId);
      const data = await apiFetch<PriceCatalog[]>(`/catalog?${params}`);
      set({ catalogs: data });
    } catch {
      set({ catalogs: [] });
    }
  },

  createCatalog: async (data: { name: string; source: string; year: number; period?: string; region?: string; description?: string; projectId?: string }) => {
    try {
      const created = await apiFetch<PriceCatalog>('/catalog', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((s: CostState) => ({ catalogs: [...s.catalogs, created] }));
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  deleteCatalog: async (id: string) => {
    try {
      await apiFetch(`/catalog/${id}`, { method: 'DELETE' });
      set((s: CostState) => ({ catalogs: s.catalogs.filter((c: PriceCatalog) => c.id !== id) }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  uploadCatalogFile: async (catalogId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/catalog/${catalogId}/import`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      // Refresh catalogs after import
      const store = get();
      await store.fetchCatalogs();
      return json.data;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  searchCatalogItems: async (opts: { catalogId?: string; search?: string; category?: string; divisionCode?: string; uniformatCode?: string; page?: number; limit?: number }) => {
    try {
      const params = new URLSearchParams();
      if (opts.catalogId) params.set('catalogId', opts.catalogId);
      if (opts.search) params.set('search', opts.search);
      if (opts.category) params.set('category', opts.category);
      if (opts.divisionCode) params.set('divisionCode', opts.divisionCode);
      if (opts.uniformatCode) params.set('uniformatCode', opts.uniformatCode);
      if (opts.page) params.set('page', String(opts.page));
      if (opts.limit) params.set('limit', String(opts.limit));
      const res = await fetch(`${API}/catalog/items/search?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ catalogItems: json.data || [], catalogItemsMeta: json.meta || { total: 0, page: 1, pages: 1 } });
    } catch {
      set({ catalogItems: [], catalogItemsMeta: { total: 0, page: 1, pages: 1 } });
    }
  },

  copyToProject: async (catalogId: string, itemIds: string[], projectId: string) => {
    try {
      const result = await apiFetch<{ created: number; skipped: number }>(`/catalog/${catalogId}/copy-to-project`, {
        method: 'POST',
        body: JSON.stringify({ itemIds, projectId }),
      });
      // Refresh work items after copy
      const store = get();
      await store.fetchWorkItems(projectId);
      return result;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  // ── Uniclass Live Search ──

  searchUniclass: async (query: string, table?: string) => {
    if (!query.trim()) {
      set({ uniclassResults: [] });
      return;
    }
    set({ uniclassLoading: true });
    try {
      const params = new URLSearchParams({ q: query });
      if (table) params.set('table', table);
      const res = await fetch(`${API}/catalog/uniclass/search?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ uniclassResults: json.data || [], uniclassLoading: false });
    } catch {
      set({ uniclassResults: [], uniclassLoading: false });
    }
  },

  // ── Division/Category Filters ──

  fetchCatalogDivisions: async (catalogId: string) => {
    try {
      const res = await fetch(`${API}/catalog/${catalogId}/divisions`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ catalogDivisions: json.data || [] });
    } catch {
      set({ catalogDivisions: [] });
    }
  },

  fetchCatalogCategories: async (catalogId: string) => {
    try {
      const res = await fetch(`${API}/catalog/${catalogId}/categories`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ catalogCategories: json.data || [] });
    } catch {
      set({ catalogCategories: [] });
    }
  },
}));
