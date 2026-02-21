// Contract Policy Store — Shared across all modules
// Fetches contract profile + policies from core-service via /api/v1/projects/:id/contract-profile

import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export interface ContractProfile {
  id: string;
  deliveryModel: string;
  commercialModel: string;
  retentionPct: number;
  advancePct: number;
  paymentTermDays: number;
  priceEscalation: boolean;
  escalationIndex: string | null;
  contractForm: string | null;
  defectsLiabilityMonths: number;
}

export interface ContractPolicyEntry {
  module: string;
  policyKey: string;
  policyValue: string;
  description: string | null;
  isOverridden: boolean;
}

export interface ModulePolicies {
  [key: string]: string;
}

// ============================================================================
// STORE
// ============================================================================

interface PolicyState {
  profile: ContractProfile | null;
  policies: ContractPolicyEntry[];
  hasProfile: boolean;
  loading: boolean;
  initialized: boolean;

  fetchPolicies: (projectId: string) => Promise<void>;
  getModulePolicies: (module: string) => ModulePolicies;
  getPolicyValue: (module: string, key: string, defaultValue?: string) => string;
  reset: () => void;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const usePolicyStore = create<PolicyState>((set, get) => ({
  profile: null,
  policies: [],
  hasProfile: false,
  loading: false,
  initialized: false,

  fetchPolicies: async (projectId: string) => {
    if (!projectId) return;
    set({ loading: true });
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/contract-profile`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (!json.data || !json.meta?.hasProfile) {
        set({ profile: null, policies: [], hasProfile: false, loading: false, initialized: true });
        return;
      }

      set({
        profile: json.data.profile,
        policies: json.data.policies || [],
        hasProfile: true,
        loading: false,
        initialized: true,
      });
    } catch {
      set({ profile: null, policies: [], hasProfile: false, loading: false, initialized: true });
    }
  },

  getModulePolicies: (module: string): ModulePolicies => {
    const { policies } = get();
    const result: ModulePolicies = {};
    for (const p of policies) {
      if (p.module === module) {
        result[p.policyKey] = p.policyValue;
      }
    }
    return result;
  },

  getPolicyValue: (module: string, key: string, defaultValue = ''): string => {
    const { policies } = get();
    const entry = policies.find((p) => p.module === module && p.policyKey === key);
    return entry?.policyValue ?? defaultValue;
  },

  reset: () => {
    set({ profile: null, policies: [], hasProfile: false, loading: false, initialized: false });
  },
}));
