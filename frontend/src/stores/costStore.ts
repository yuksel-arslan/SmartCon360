// CostPilot Zustand Store — Work Items, Estimates, Payments, EVM

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
  unitPriceAnalyses?: { unitPrice: string }[];
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
  createdAt: string;
}

export interface PaymentCertificate {
  id: string;
  projectId: string;
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
  grossAmount: string;
  netAmount: string;
  cumulativeAmount: string;
  status: string;
  retentionPct: string;
  vatPct: string;
  createdAt: string;
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

export interface CostOverviewKpis {
  cpi: number;
  spi: number;
  budgetVariancePct: number;
  eac: number;
  cumulativeHakedis: number;
  workItemCount: number;
  metrajCompletionPct: number;
  copq: number;
}

// ============================================================================
// DEMO DATA (fallback when API is unavailable)
// ============================================================================

const demoWorkItems: WorkItem[] = [
  { id: '1', projectId: 'p1', code: '04.606/2A', name: '250 dozlu beton dökümü', unit: 'm3', category: 'insaat', source: 'bayindirlik', isActive: true, unitPriceAnalyses: [{ unitPrice: '2450.00' }] },
  { id: '2', projectId: 'p1', code: '04.743/1', name: 'Demir işleri (nervürlü)', unit: 'ton', category: 'insaat', source: 'bayindirlik', isActive: true, unitPriceAnalyses: [{ unitPrice: '18200.00' }] },
  { id: '3', projectId: 'p1', code: 'IMO-015', name: 'Soğutma tesisatı montajı', unit: 'mt', category: 'mekanik', source: 'custom', isActive: true, unitPriceAnalyses: [{ unitPrice: '345.00' }] },
  { id: '4', projectId: 'p1', code: 'ELK-042', name: 'Kablo çekilmesi (3x2.5mm)', unit: 'mt', category: 'elektrik', source: 'custom', isActive: true, unitPriceAnalyses: [{ unitPrice: '85.50' }] },
  { id: '5', projectId: 'p1', code: '27.581/1', name: 'Alçıpan duvar yapılması', unit: 'm2', category: 'insaat', source: 'bayindirlik', isActive: true, unitPriceAnalyses: [{ unitPrice: '520.00' }] },
  { id: '6', projectId: 'p1', code: '23.015', name: 'Çelik konstrüksiyon montajı', unit: 'ton', category: 'insaat', source: 'custom', isActive: true, unitPriceAnalyses: [{ unitPrice: '24500.00' }] },
  { id: '7', projectId: 'p1', code: 'MKN-008', name: 'Havalandırma kanalı', unit: 'mt', category: 'mekanik', source: 'custom', isActive: true, unitPriceAnalyses: [{ unitPrice: '275.00' }] },
  { id: '8', projectId: 'p1', code: 'ELK-101', name: 'Pano montajı', unit: 'adet', category: 'elektrik', source: 'custom', isActive: true, unitPriceAnalyses: [{ unitPrice: '12500.00' }] },
];

const demoEstimates: Estimate[] = [
  { id: '1', projectId: 'p1', name: 'Yaklaşık Maliyet v1', type: 'yaklasik_maliyet', totalAmount: '42000000', currency: 'TRY', vatPct: '20', vatAmount: '8400000', grandTotal: '50400000', status: 'superseded', version: 1, createdAt: '2026-01-10T10:00:00Z' },
  { id: '2', projectId: 'p1', name: 'Yaklaşık Maliyet v2', type: 'yaklasik_maliyet', totalAmount: '44500000', currency: 'TRY', vatPct: '20', vatAmount: '8900000', grandTotal: '53400000', status: 'superseded', version: 2, createdAt: '2026-01-20T10:00:00Z' },
  { id: '3', projectId: 'p1', name: 'Yaklaşık Maliyet v3', type: 'yaklasik_maliyet', totalAmount: '46800000', currency: 'TRY', vatPct: '20', vatAmount: '9360000', grandTotal: '56160000', status: 'approved', version: 3, createdAt: '2026-02-01T10:00:00Z' },
];

const demoPayments: PaymentCertificate[] = [
  { id: '1', projectId: 'p1', periodNumber: 1, periodStart: '2026-01-01', periodEnd: '2026-01-31', grossAmount: '3200000', netAmount: '3456000', cumulativeAmount: '3456000', status: 'paid', retentionPct: '5', vatPct: '20', createdAt: '2026-02-05T10:00:00Z' },
  { id: '2', projectId: 'p1', periodNumber: 2, periodStart: '2026-02-01', periodEnd: '2026-02-28', grossAmount: '4100000', netAmount: '4428000', cumulativeAmount: '7884000', status: 'paid', retentionPct: '5', vatPct: '20', createdAt: '2026-03-05T10:00:00Z' },
  { id: '3', projectId: 'p1', periodNumber: 3, periodStart: '2026-03-01', periodEnd: '2026-03-31', grossAmount: '3800000', netAmount: '4104000', cumulativeAmount: '11988000', status: 'approved', retentionPct: '5', vatPct: '20', createdAt: '2026-04-05T10:00:00Z' },
  { id: '4', projectId: 'p1', periodNumber: 4, periodStart: '2026-04-01', periodEnd: '2026-04-30', grossAmount: '2900000', netAmount: '3132000', cumulativeAmount: '15120000', status: 'approved', retentionPct: '5', vatPct: '20', createdAt: '2026-05-05T10:00:00Z' },
  { id: '5', projectId: 'p1', periodNumber: 5, periodStart: '2026-05-01', periodEnd: '2026-05-31', grossAmount: '3500000', netAmount: '3780000', cumulativeAmount: '18900000', status: 'submitted', retentionPct: '5', vatPct: '20', createdAt: '2026-06-05T10:00:00Z' },
  { id: '6', projectId: 'p1', periodNumber: 6, periodStart: '2026-06-01', periodEnd: '2026-06-30', grossAmount: '0', netAmount: '0', cumulativeAmount: '18900000', status: 'draft', retentionPct: '5', vatPct: '20', createdAt: '2026-07-01T10:00:00Z' },
];

const demoEvmSnapshots: EvmSnapshot[] = [
  { id: '1', projectId: 'p1', snapshotDate: '2026-01-31', pv: '4000000', ev: '3200000', ac: '3100000', cv: '100000', sv: '-800000', cpi: '1.0323', spi: '0.8000', eac: '45330000', etc: '42230000', vac: '1470000', tcpi: '1.0041' },
  { id: '2', projectId: 'p1', snapshotDate: '2026-02-28', pv: '8500000', ev: '7300000', ac: '7100000', cv: '200000', sv: '-1200000', cpi: '1.0282', spi: '0.8588', eac: '45520000', etc: '38420000', vac: '1280000', tcpi: '1.0030' },
  { id: '3', projectId: 'p1', snapshotDate: '2026-03-31', pv: '13000000', ev: '11100000', ac: '10800000', cv: '300000', sv: '-1900000', cpi: '1.0278', spi: '0.8538', eac: '45530000', etc: '34730000', vac: '1270000', tcpi: '1.0024' },
  { id: '4', projectId: 'p1', snapshotDate: '2026-04-30', pv: '17500000', ev: '14000000', ac: '13600000', cv: '400000', sv: '-3500000', cpi: '1.0294', spi: '0.8000', eac: '45460000', etc: '31860000', vac: '1340000', tcpi: '1.0018' },
  { id: '5', projectId: 'p1', snapshotDate: '2026-05-31', pv: '22000000', ev: '18400000', ac: '17900000', cv: '500000', sv: '-3600000', cpi: '1.0279', spi: '0.8364', eac: '45510000', etc: '27610000', vac: '1290000', tcpi: '1.0012' },
];

const demoKpis: CostOverviewKpis = {
  cpi: 1.03,
  spi: 0.84,
  budgetVariancePct: -2.1,
  eac: 45510000,
  cumulativeHakedis: 18900000,
  workItemCount: 342,
  metrajCompletionPct: 78,
  copq: 245000,
};

// ============================================================================
// STORE
// ============================================================================

interface CostState {
  // Data
  workItems: WorkItem[];
  estimates: Estimate[];
  payments: PaymentCertificate[];
  evmSnapshots: EvmSnapshot[];
  kpis: CostOverviewKpis;

  // State
  loading: boolean;
  error: string | null;
  initialized: boolean;
  usingApi: boolean;

  // Actions — fetch
  fetchWorkItems: (projectId: string) => Promise<void>;
  fetchEstimates: (projectId: string) => Promise<void>;
  fetchPayments: (projectId: string) => Promise<void>;
  fetchEvmSnapshots: (projectId: string) => Promise<void>;
  fetchAll: (projectId: string) => Promise<void>;

  // Actions — CRUD
  addWorkItem: (projectId: string, item: Omit<WorkItem, 'id' | 'projectId' | 'isActive' | 'unitPriceAnalyses'>) => Promise<WorkItem | null>;
  deleteWorkItem: (id: string) => Promise<boolean>;
  createEstimate: (projectId: string, data: { name: string; type: string }) => Promise<Estimate | null>;
  createPayment: (projectId: string, data: { periodStart: string; periodEnd: string }) => Promise<PaymentCertificate | null>;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const useCostStore = create<CostState>((set, get) => ({
  workItems: [],
  estimates: [],
  payments: [],
  evmSnapshots: [],
  kpis: demoKpis,

  loading: false,
  error: null,
  initialized: false,
  usingApi: false,

  fetchWorkItems: async (projectId: string) => {
    try {
      const res = await fetch(`/api/v1/cost/work-items/project/${projectId}?limit=100`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ workItems: json.data || [], usingApi: true });
    } catch {
      set({ workItems: demoWorkItems, usingApi: false });
    }
  },

  fetchEstimates: async (projectId: string) => {
    try {
      const res = await fetch(`/api/v1/cost/estimates/project/${projectId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ estimates: json.data || [] });
    } catch {
      set({ estimates: demoEstimates });
    }
  },

  fetchPayments: async (projectId: string) => {
    try {
      const res = await fetch(`/api/v1/cost/payments/project/${projectId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ payments: json.data || [] });
    } catch {
      set({ payments: demoPayments });
    }
  },

  fetchEvmSnapshots: async (projectId: string) => {
    try {
      const res = await fetch(`/api/v1/cost/evm/project/${projectId}/history`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      set({ evmSnapshots: json.data || [] });
    } catch {
      set({ evmSnapshots: demoEvmSnapshots });
    }
  },

  fetchAll: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      await Promise.all([
        state.fetchWorkItems(projectId),
        state.fetchEstimates(projectId),
        state.fetchPayments(projectId),
        state.fetchEvmSnapshots(projectId),
      ]);

      // Calculate KPIs from fetched data
      const { evmSnapshots, payments, workItems } = get();
      const latestEvm = evmSnapshots[evmSnapshots.length - 1];
      const latestPayment = payments[payments.length - 1];

      if (latestEvm) {
        set({
          kpis: {
            cpi: parseFloat(latestEvm.cpi) || demoKpis.cpi,
            spi: parseFloat(latestEvm.spi) || demoKpis.spi,
            budgetVariancePct: demoKpis.budgetVariancePct,
            eac: parseFloat(latestEvm.eac) || demoKpis.eac,
            cumulativeHakedis: latestPayment ? parseFloat(latestPayment.cumulativeAmount) : demoKpis.cumulativeHakedis,
            workItemCount: workItems.length || demoKpis.workItemCount,
            metrajCompletionPct: demoKpis.metrajCompletionPct,
            copq: demoKpis.copq,
          },
        });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load cost data' });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  // ── CRUD: Work Items ──

  addWorkItem: async (projectId, item) => {
    try {
      const res = await fetch('/api/v1/cost/work-items', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...item, projectId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const created = json.data as WorkItem;
      set((s) => ({ workItems: [...s.workItems, created] }));
      return created;
    } catch {
      // Offline/demo mode: add locally with temp id
      const created: WorkItem = {
        ...item,
        id: `local-${Date.now()}`,
        projectId,
        isActive: true,
        unitPriceAnalyses: [],
      };
      set((s) => ({ workItems: [...s.workItems, created] }));
      return created;
    }
  },

  deleteWorkItem: async (id) => {
    try {
      const res = await fetch(`/api/v1/cost/work-items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // continue with local delete
    }
    set((s) => ({ workItems: s.workItems.filter((w) => w.id !== id) }));
    return true;
  },

  // ── CRUD: Estimates ──

  createEstimate: async (projectId, data) => {
    try {
      const res = await fetch('/api/v1/cost/estimates', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...data, projectId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const created = json.data as Estimate;
      set((s) => ({ estimates: [...s.estimates, created] }));
      return created;
    } catch {
      const { estimates } = get();
      const created: Estimate = {
        id: `local-${Date.now()}`,
        projectId,
        name: data.name,
        type: data.type,
        totalAmount: '0',
        currency: 'TRY',
        vatPct: '20',
        vatAmount: '0',
        grandTotal: '0',
        status: 'draft',
        version: estimates.length + 1,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ estimates: [...s.estimates, created] }));
      return created;
    }
  },

  // ── CRUD: Payments ──

  createPayment: async (projectId, data) => {
    try {
      const res = await fetch('/api/v1/cost/payments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...data, projectId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const created = json.data as PaymentCertificate;
      set((s) => ({ payments: [...s.payments, created] }));
      return created;
    } catch {
      const { payments } = get();
      const lastCumulative = payments.length > 0 ? parseFloat(payments[payments.length - 1].cumulativeAmount) : 0;
      const created: PaymentCertificate = {
        id: `local-${Date.now()}`,
        projectId,
        periodNumber: payments.length + 1,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        grossAmount: '0',
        netAmount: '0',
        cumulativeAmount: String(lastCumulative),
        status: 'draft',
        retentionPct: '5',
        vatPct: '20',
        createdAt: new Date().toISOString(),
      };
      set((s) => ({ payments: [...s.payments, created] }));
      return created;
    }
  },
}));
