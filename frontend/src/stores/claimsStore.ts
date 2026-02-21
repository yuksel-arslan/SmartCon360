import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────

export interface ChangeOrder {
  id: string;
  projectId: string;
  coNumber: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  initiatedBy: string;
  costImpact: number;
  timeImpactDays: number;
  currency: string;
  contractClause?: string;
  submittedDate?: string;
  reviewedDate?: string;
  approvedDate?: string;
  approvedAmount?: number;
  approvedDays?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  projectId: string;
  claimNumber: string;
  title: string;
  description?: string;
  type: string;
  basis: string;
  status: string;
  priority: string;
  claimedBy: string;
  amountClaimed: number;
  amountAwarded?: number;
  daysClaimed: number;
  daysAwarded?: number;
  currency: string;
  contractClause?: string;
  notifiedDate?: string;
  submittedDate?: string;
  resolvedDate?: string;
  resolution?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DelayEvent {
  id: string;
  projectId: string;
  eventNumber: string;
  title: string;
  description?: string;
  category: string;
  responsibleParty: string;
  status: string;
  delayDays: number;
  startDate: string;
  endDate?: string;
  isCriticalPath: boolean;
  mitigationAction?: string;
  claimId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimsSummary {
  totalChangeOrders: number;
  pendingChangeOrders: number;
  approvedChangeOrders: number;
  totalClaims: number;
  openClaims: number;
  resolvedClaims: number;
  totalDelayEvents: number;
  criticalPathDelays: number;
  approvedCostImpact: number;
  totalAmountClaimed: number;
  totalAmountAwarded: number;
  totalDelayDays: number;
  changeOrderType: string;
  claimBasis: string;
  disputeProcedure: string;
  defectsLiabilityMonths: number;
}

// ── Store ──────────────────────────────────────────────

interface ClaimsState {
  summary: ClaimsSummary | null;
  changeOrders: ChangeOrder[];
  claims: Claim[];
  delayEvents: DelayEvent[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchAll: (projectId: string) => Promise<void>;
  createChangeOrder: (data: Partial<ChangeOrder>) => Promise<ChangeOrder | null>;
  updateChangeOrder: (id: string, data: Partial<ChangeOrder>) => Promise<void>;
  deleteChangeOrder: (id: string) => Promise<void>;
  createClaim: (data: Partial<Claim>) => Promise<Claim | null>;
  updateClaim: (id: string, data: Partial<Claim>) => Promise<void>;
  deleteClaim: (id: string) => Promise<void>;
  createDelayEvent: (data: Partial<DelayEvent>) => Promise<DelayEvent | null>;
  updateDelayEvent: (id: string, data: Partial<DelayEvent>) => Promise<void>;
  deleteDelayEvent: (id: string) => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const useClaimsStore = create<ClaimsState>((set, get) => ({
  summary: null,
  changeOrders: [],
  claims: [],
  delayEvents: [],
  loading: false,
  error: null,
  initialized: false,

  fetchAll: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const [summaryRes, coRes, claimsRes, delayRes] = await Promise.all([
        fetch(`${API}/claims/summary/project/${projectId}`, { headers: getHeaders() }),
        fetch(`${API}/claims/change-orders/project/${projectId}`, { headers: getHeaders() }),
        fetch(`${API}/claims/register/project/${projectId}`, { headers: getHeaders() }),
        fetch(`${API}/claims/delay-events/project/${projectId}`, { headers: getHeaders() }),
      ]);

      const [summaryData, coData, claimsData, delayData] = await Promise.all([
        summaryRes.ok ? summaryRes.json() : null,
        coRes.ok ? coRes.json() : null,
        claimsRes.ok ? claimsRes.json() : null,
        delayRes.ok ? delayRes.json() : null,
      ]);

      set({
        summary: summaryData?.data || null,
        changeOrders: coData?.data || [],
        claims: claimsData?.data || [],
        delayEvents: delayData?.data || [],
        loading: false,
        initialized: true,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false, initialized: true });
    }
  },

  createChangeOrder: async (data) => {
    try {
      const res = await fetch(`${API}/claims/change-orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create change order');
      const json = await res.json();
      set((s) => ({ changeOrders: [json.data, ...s.changeOrders] }));
      return json.data;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  updateChangeOrder: async (id, data) => {
    try {
      const res = await fetch(`${API}/claims/change-orders/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update change order');
      const json = await res.json();
      set((s) => ({
        changeOrders: s.changeOrders.map((co) => (co.id === id ? json.data : co)),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteChangeOrder: async (id) => {
    try {
      await fetch(`${API}/claims/change-orders/${id}`, { method: 'DELETE', headers: getHeaders() });
      set((s) => ({ changeOrders: s.changeOrders.filter((co) => co.id !== id) }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  createClaim: async (data) => {
    try {
      const res = await fetch(`${API}/claims/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create claim');
      const json = await res.json();
      set((s) => ({ claims: [json.data, ...s.claims] }));
      return json.data;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  updateClaim: async (id, data) => {
    try {
      const res = await fetch(`${API}/claims/register/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update claim');
      const json = await res.json();
      set((s) => ({
        claims: s.claims.map((c) => (c.id === id ? json.data : c)),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteClaim: async (id) => {
    try {
      await fetch(`${API}/claims/register/${id}`, { method: 'DELETE', headers: getHeaders() });
      set((s) => ({ claims: s.claims.filter((c) => c.id !== id) }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  createDelayEvent: async (data) => {
    try {
      const res = await fetch(`${API}/claims/delay-events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create delay event');
      const json = await res.json();
      set((s) => ({ delayEvents: [json.data, ...s.delayEvents] }));
      return json.data;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  updateDelayEvent: async (id, data) => {
    try {
      const res = await fetch(`${API}/claims/delay-events/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update delay event');
      const json = await res.json();
      set((s) => ({
        delayEvents: s.delayEvents.map((de) => (de.id === id ? json.data : de)),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteDelayEvent: async (id) => {
    try {
      await fetch(`${API}/claims/delay-events/${id}`, { method: 'DELETE', headers: getHeaders() });
      set((s) => ({ delayEvents: s.delayEvents.filter((de) => de.id !== id) }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));
