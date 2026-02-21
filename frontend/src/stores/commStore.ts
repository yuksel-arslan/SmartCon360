import { create } from 'zustand';

const API = process.env.NEXT_PUBLIC_OPS_URL || 'http://localhost:3002';

export interface Rfi {
  id: string;
  projectId: string;
  rfiNumber: string;
  subject: string;
  description?: string;
  discipline: string;
  priority: string;
  status: string;
  assignedTo?: string;
  responseDue?: string;
  respondedDate?: string;
  response?: string;
  costImpact: boolean;
  scheduleImpact: boolean;
  drawingRef?: string;
  specRef?: string;
  createdBy: string;
  closedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transmittal {
  id: string;
  projectId: string;
  transmittalNumber: string;
  subject: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  fromCompany: string;
  toCompany: string;
  sentDate?: string;
  receivedDate?: string;
  dueDate?: string;
  documentCount: number;
  documentRefs: string[];
  reviewStatus?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingMinute {
  id: string;
  projectId: string;
  meetingNumber: string;
  title: string;
  type: string;
  status: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  attendees: string[];
  absentees: string[];
  agendaItems: string[];
  actionItems: string[];
  decisions: string[];
  nextMeetingDate?: string;
  distributionList: string[];
  notes?: string;
  conductedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommSummary {
  totalRfis: number;
  openRfis: number;
  overdueRfis: number;
  avgResponseDays: number | null;
  totalTransmittals: number;
  pendingTransmittals: number;
  totalMeetings: number;
  meetingsThisMonth: number;
  rfiResponseDays: number;
  escalationModel: string;
}

interface CommState {
  summary: CommSummary | null;
  rfis: Rfi[];
  transmittals: Transmittal[];
  meetings: MeetingMinute[];
  loading: boolean;
  error: string | null;

  fetchAll: (projectId: string) => Promise<void>;

  createRfi: (data: Partial<Rfi>) => Promise<void>;
  updateRfi: (id: string, data: Partial<Rfi>) => Promise<void>;
  deleteRfi: (id: string) => Promise<void>;

  createTransmittal: (data: Partial<Transmittal>) => Promise<void>;
  updateTransmittal: (id: string, data: Partial<Transmittal>) => Promise<void>;
  deleteTransmittal: (id: string) => Promise<void>;

  createMeeting: (data: Partial<MeetingMinute>) => Promise<void>;
  updateMeeting: (id: string, data: Partial<MeetingMinute>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
}

export const useCommStore = create<CommState>((set, get) => ({
  summary: null,
  rfis: [],
  transmittals: [],
  meetings: [],
  loading: false,
  error: null,

  fetchAll: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [sumRes, rfiRes, trnRes, mtgRes] = await Promise.all([
        fetch(`${API}/comm/summary/project/${projectId}`, { headers }),
        fetch(`${API}/comm/rfis/project/${projectId}`, { headers }),
        fetch(`${API}/comm/transmittals/project/${projectId}`, { headers }),
        fetch(`${API}/comm/meetings/project/${projectId}`, { headers }),
      ]);

      const [sumJson, rfiJson, trnJson, mtgJson] = await Promise.all([
        sumRes.json(),
        rfiRes.json(),
        trnRes.json(),
        mtgRes.json(),
      ]);

      set({
        summary: sumJson.data,
        rfis: rfiJson.data || [],
        transmittals: trnJson.data || [],
        meetings: mtgJson.data || [],
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  // ── RFI CRUD ──
  createRfi: async (data) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}/comm/rfis`, { method: 'POST', headers, body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ rfis: [json.data, ...s.rfis] }));
  },
  updateRfi: async (id, data) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}/comm/rfis/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ rfis: s.rfis.map((r) => (r.id === id ? json.data : r)) }));
  },
  deleteRfi: async (id) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${API}/comm/rfis/${id}`, { method: 'DELETE', headers });
    set((s) => ({ rfis: s.rfis.filter((r) => r.id !== id) }));
  },

  // ── Transmittal CRUD ──
  createTransmittal: async (data) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}/comm/transmittals`, { method: 'POST', headers, body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ transmittals: [json.data, ...s.transmittals] }));
  },
  updateTransmittal: async (id, data) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}/comm/transmittals/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ transmittals: s.transmittals.map((t) => (t.id === id ? json.data : t)) }));
  },
  deleteTransmittal: async (id) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${API}/comm/transmittals/${id}`, { method: 'DELETE', headers });
    set((s) => ({ transmittals: s.transmittals.filter((t) => t.id !== id) }));
  },

  // ── Meeting CRUD ──
  createMeeting: async (data) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}/comm/meetings`, { method: 'POST', headers, body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ meetings: [json.data, ...s.meetings] }));
  },
  updateMeeting: async (id, data) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}/comm/meetings/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    const json = await res.json();
    set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? json.data : m)) }));
  },
  deleteMeeting: async (id) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${API}/comm/meetings/${id}`, { method: 'DELETE', headers });
    set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) }));
  },
}));
