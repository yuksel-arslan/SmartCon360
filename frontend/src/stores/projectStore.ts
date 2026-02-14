import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  projectType: string;
  status: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  plannedStart?: string | null;
  plannedFinish?: string | null;
  actualStart?: string | null;
  actualFinish?: string | null;
  defaultTaktTime: number;
  budget?: number | string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    locations: number;
    trades: number;
    members: number;
  };
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  /** Fetch all projects from the API */
  fetchProjects: () => Promise<void>;

  /** Set the active project by ID */
  setActiveProject: (projectId: string) => void;

  /** Get the currently active project */
  getActiveProject: () => Project | null;

  /** Add a project to the local list (after creation) */
  addProject: (project: Project) => void;

  /** Clear project state (on logout) */
  clear: () => void;
}

// ── Store ──────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  loading: false,
  error: null,
  initialized: false,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/projects?limit=100', { headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch projects (${res.status})`);
      }

      const json = await res.json();
      const projects: Project[] = json.data || [];

      // Restore active project from localStorage, fallback to first project
      const savedActiveId = typeof window !== 'undefined'
        ? localStorage.getItem('activeProjectId')
        : null;
      const activeProjectId = projects.some((p) => p.id === savedActiveId)
        ? savedActiveId
        : projects.length > 0
          ? projects[0].id
          : null;

      if (activeProjectId && typeof window !== 'undefined') {
        localStorage.setItem('activeProjectId', activeProjectId);
      }

      set({ projects, activeProjectId, loading: false, initialized: true });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch projects',
        loading: false,
        initialized: true,
      });
    }
  },

  setActiveProject: (projectId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProjectId', projectId);
    }
    set({ activeProjectId: projectId });
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId) || null;
  },

  addProject: (project) => {
    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: project.id,
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeProjectId', project.id);
    }
  },

  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeProjectId');
    }
    set({ projects: [], activeProjectId: null, initialized: false, error: null });
  },
}));
