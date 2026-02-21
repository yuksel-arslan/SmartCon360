import { create } from 'zustand';

const API = process.env.NEXT_PUBLIC_OPS_URL || 'http://localhost:3002';

export interface CarbonRecord {
  id: string;
  projectId: string;
  date: string;
  source: string;
  category: string;
  description?: string;
  quantity: number;
  unit: string;
  emissionFactor?: number;
  co2eTonnes: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WasteRecord {
  id: string;
  projectId: string;
  date: string;
  wasteType: string;
  source: string;
  quantityTonnes: number;
  disposition: string;
  recyclingPct?: number;
  destination?: string;
  manifestNumber?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certification {
  id: string;
  projectId: string;
  scheme: string;
  targetLevel: string;
  currentStatus: string;
  registrationDate?: string;
  submissionDate?: string;
  certificationDate?: string;
  totalCredits?: number;
  earnedCredits?: number;
  pendingCredits?: number;
  assessorName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SustainabilitySummary {
  totalCarbonTonnes: number;
  totalWasteTonnes: number;
  recycledWasteTonnes: number;
  landfillWasteTonnes: number;
  diversionRate: number;
  diversionTarget: number;
  meetsDiversionTarget: boolean;
  totalCertifications: number;
  achievedCertifications: number;
  carbonTracking: string;
  wasteDiversionTarget: number;
}

interface SustainabilityState {
  summary: SustainabilitySummary | null;
  carbonRecords: CarbonRecord[];
  wasteRecords: WasteRecord[];
  certifications: Certification[];
  loading: boolean;
  error: string | null;

  fetchAll: (projectId: string) => Promise<void>;

  createCarbon: (data: Partial<CarbonRecord>) => Promise<void>;
  updateCarbon: (id: string, data: Partial<CarbonRecord>) => Promise<void>;
  deleteCarbon: (id: string) => Promise<void>;

  createWaste: (data: Partial<WasteRecord>) => Promise<void>;
  updateWaste: (id: string, data: Partial<WasteRecord>) => Promise<void>;
  deleteWaste: (id: string) => Promise<void>;

  createCertification: (data: Partial<Certification>) => Promise<void>;
  updateCertification: (id: string, data: Partial<Certification>) => Promise<void>;
  deleteCertification: (id: string) => Promise<void>;
}

function getHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const useSustainabilityStore = create<SustainabilityState>((set) => ({
  summary: null,
  carbonRecords: [],
  wasteRecords: [],
  certifications: [],
  loading: false,
  error: null,

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const h = getHeaders();
      const [sumRes, cRes, wRes, certRes] = await Promise.all([
        fetch(`${API}/sustainability/summary/project/${projectId}`, { headers: h }),
        fetch(`${API}/sustainability/carbon/project/${projectId}`, { headers: h }),
        fetch(`${API}/sustainability/waste/project/${projectId}`, { headers: h }),
        fetch(`${API}/sustainability/certifications/project/${projectId}`, { headers: h }),
      ]);
      const [sumJson, cJson, wJson, certJson] = await Promise.all([sumRes.json(), cRes.json(), wRes.json(), certRes.json()]);
      set({ summary: sumJson.data, carbonRecords: cJson.data || [], wasteRecords: wJson.data || [], certifications: certJson.data || [], loading: false });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createCarbon: async (data) => { const res = await fetch(`${API}/sustainability/carbon`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }); const json = await res.json(); set((s) => ({ carbonRecords: [json.data, ...s.carbonRecords] })); },
  updateCarbon: async (id, data) => { const res = await fetch(`${API}/sustainability/carbon/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }); const json = await res.json(); set((s) => ({ carbonRecords: s.carbonRecords.map((x) => (x.id === id ? json.data : x)) })); },
  deleteCarbon: async (id) => { await fetch(`${API}/sustainability/carbon/${id}`, { method: 'DELETE', headers: getHeaders() }); set((s) => ({ carbonRecords: s.carbonRecords.filter((x) => x.id !== id) })); },

  createWaste: async (data) => { const res = await fetch(`${API}/sustainability/waste`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }); const json = await res.json(); set((s) => ({ wasteRecords: [json.data, ...s.wasteRecords] })); },
  updateWaste: async (id, data) => { const res = await fetch(`${API}/sustainability/waste/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }); const json = await res.json(); set((s) => ({ wasteRecords: s.wasteRecords.map((x) => (x.id === id ? json.data : x)) })); },
  deleteWaste: async (id) => { await fetch(`${API}/sustainability/waste/${id}`, { method: 'DELETE', headers: getHeaders() }); set((s) => ({ wasteRecords: s.wasteRecords.filter((x) => x.id !== id) })); },

  createCertification: async (data) => { const res = await fetch(`${API}/sustainability/certifications`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }); const json = await res.json(); set((s) => ({ certifications: [json.data, ...s.certifications] })); },
  updateCertification: async (id, data) => { const res = await fetch(`${API}/sustainability/certifications/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }); const json = await res.json(); set((s) => ({ certifications: s.certifications.map((x) => (x.id === id ? json.data : x)) })); },
  deleteCertification: async (id) => { await fetch(`${API}/sustainability/certifications/${id}`, { method: 'DELETE', headers: getHeaders() }); set((s) => ({ certifications: s.certifications.filter((x) => x.id !== id) })); },
}));
