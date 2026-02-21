import { create } from 'zustand';

const API = process.env.NEXT_PUBLIC_OPS_URL || 'http://localhost:3002';

export interface Supplier {
  id: string;
  projectId: string;
  code: string;
  name: string;
  category: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  rating?: number;
  status: string;
  certifications: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  supplierId?: string;
  poNumber: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority: string;
  totalAmount: number;
  currency: string;
  orderDate?: string;
  requiredDate?: string;
  deliveredDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  supplier?: { name: string; code: string };
}

export interface Delivery {
  id: string;
  projectId: string;
  purchaseOrderId?: string;
  deliveryNumber: string;
  description?: string;
  status: string;
  scheduledDate: string;
  actualDate?: string;
  receivedBy?: string;
  inspectionResult?: string;
  itemCount: number;
  items: unknown[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplySummary {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPOs: number;
  openPOs: number;
  totalPOAmount: number;
  totalDeliveries: number;
  pendingDeliveries: number;
  overdueDeliveries: number;
  procurementResponsibility: string;
  mrpEnabled: boolean;
}

interface SupplyState {
  summary: SupplySummary | null;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;

  fetchAll: (projectId: string) => Promise<void>;

  createSupplier: (data: Partial<Supplier>) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  createPO: (data: Partial<PurchaseOrder>) => Promise<void>;
  updatePO: (id: string, data: Partial<PurchaseOrder>) => Promise<void>;
  deletePO: (id: string) => Promise<void>;

  createDelivery: (data: Partial<Delivery>) => Promise<void>;
  updateDelivery: (id: string, data: Partial<Delivery>) => Promise<void>;
  deleteDelivery: (id: string) => Promise<void>;
}

function getHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const useSupplyStore = create<SupplyState>((set) => ({
  summary: null,
  suppliers: [],
  purchaseOrders: [],
  deliveries: [],
  loading: false,
  error: null,

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const h = getHeaders();
      const [sumRes, supRes, poRes, delRes] = await Promise.all([
        fetch(`${API}/supply-chain/summary/project/${projectId}`, { headers: h }),
        fetch(`${API}/supply-chain/suppliers/project/${projectId}`, { headers: h }),
        fetch(`${API}/supply-chain/purchase-orders/project/${projectId}`, { headers: h }),
        fetch(`${API}/supply-chain/deliveries/project/${projectId}`, { headers: h }),
      ]);

      const [sumJson, supJson, poJson, delJson] = await Promise.all([
        sumRes.json(), supRes.json(), poRes.json(), delRes.json(),
      ]);

      set({
        summary: sumJson.data,
        suppliers: supJson.data || [],
        purchaseOrders: poJson.data || [],
        deliveries: delJson.data || [],
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  // ── Supplier CRUD ──
  createSupplier: async (data) => {
    const res = await fetch(`${API}/supply-chain/suppliers`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ suppliers: [json.data, ...s.suppliers] }));
  },
  updateSupplier: async (id, data) => {
    const res = await fetch(`${API}/supply-chain/suppliers/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? json.data : x)) }));
  },
  deleteSupplier: async (id) => {
    await fetch(`${API}/supply-chain/suppliers/${id}`, { method: 'DELETE', headers: getHeaders() });
    set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) }));
  },

  // ── PO CRUD ──
  createPO: async (data) => {
    const res = await fetch(`${API}/supply-chain/purchase-orders`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ purchaseOrders: [json.data, ...s.purchaseOrders] }));
  },
  updatePO: async (id, data) => {
    const res = await fetch(`${API}/supply-chain/purchase-orders/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ purchaseOrders: s.purchaseOrders.map((x) => (x.id === id ? json.data : x)) }));
  },
  deletePO: async (id) => {
    await fetch(`${API}/supply-chain/purchase-orders/${id}`, { method: 'DELETE', headers: getHeaders() });
    set((s) => ({ purchaseOrders: s.purchaseOrders.filter((x) => x.id !== id) }));
  },

  // ── Delivery CRUD ──
  createDelivery: async (data) => {
    const res = await fetch(`${API}/supply-chain/deliveries`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ deliveries: [json.data, ...s.deliveries] }));
  },
  updateDelivery: async (id, data) => {
    const res = await fetch(`${API}/supply-chain/deliveries/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ deliveries: s.deliveries.map((x) => (x.id === id ? json.data : x)) }));
  },
  deleteDelivery: async (id) => {
    await fetch(`${API}/supply-chain/deliveries/${id}`, { method: 'DELETE', headers: getHeaders() });
    set((s) => ({ deliveries: s.deliveries.filter((x) => x.id !== id) }));
  },
}));
