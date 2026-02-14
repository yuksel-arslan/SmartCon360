import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────

export type LicenseTier = 'starter' | 'professional' | 'enterprise' | 'ultimate';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  avatarUrl?: string;
  roles: { role: string; projectId?: string | null }[];
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  initialized: boolean;
  loading: boolean;

  /** Initialize from localStorage on app mount */
  initialize: () => void;

  /** Set auth data after login/register */
  setAuth: (token: string, user: AuthUser, refreshToken?: string) => void;

  /** Clear auth state on logout */
  logout: () => void;

  /** Update user profile in state */
  updateUser: (updates: Partial<AuthUser>) => void;

  /** Check if user has a specific role (global or project-scoped) */
  hasRole: (role: string, projectId?: string) => boolean;

  /** Check if user has any of the given permissions based on role */
  hasPermission: (permission: string, projectId?: string) => boolean;

  /** Get Authorization header value */
  getAuthHeader: () => { Authorization?: string };

  /** Refresh the access token using the stored refresh token */
  refreshAccessToken: () => Promise<boolean>;
}

// ── Role → Permission Map ──────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  project_manager: ['project:*', 'takt:*', 'constraint:*', 'progress:*', 'report:*', 'resource:*', 'quality:*', 'safety:*', 'cost:*', 'risk:*', 'supply:*', 'claims:*', 'comm:*', 'stakeholder:*', 'sustainability:*'],
  superintendent: ['project:read', 'takt:read', 'constraint:*', 'progress:*', 'resource:read', 'quality:write', 'safety:write'],
  foreman: ['project:read', 'takt:read', 'constraint:read', 'progress:write', 'quality:read', 'safety:read'],
  viewer: ['project:read', 'takt:read', 'constraint:read', 'progress:read', 'report:read'],
};

// ── Licensing Tier → Modules ──────────────────────────

export const TIER_MODULES: Record<LicenseTier, string[]> = {
  starter: ['taktflow', 'dashboard', 'flowline', 'takt-editor', 'constraints', 'lps', 'communication', 'ai', 'reports', 'simulation', 'settings'],
  professional: ['quality', 'safety', 'cost', 'vision'],
  enterprise: ['resources', 'workmanship', 'material', 'equipment', 'scaffoldings', 'supply', 'risk', 'claims'],
  ultimate: ['stakeholders', 'sustainability'],
};

/** Get all modules accessible for a given tier (cumulative) */
export function getModulesForTier(tier: LicenseTier): string[] {
  const tiers: LicenseTier[] = ['starter', 'professional', 'enterprise', 'ultimate'];
  const tierIndex = tiers.indexOf(tier);
  const modules: string[] = [];
  for (let i = 0; i <= tierIndex; i++) {
    modules.push(...TIER_MODULES[tiers[i]]);
  }
  return modules;
}

// ── Store ──────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  initialized: false,
  loading: false,

  initialize: () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        set({ token, refreshToken, user, initialized: true });
      } catch (_e) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ token: null, refreshToken: null, user: null, initialized: true });
      }
    } else {
      set({ initialized: true });
    }
  },

  setAuth: (token, user, refreshToken) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      set({ token, user, refreshToken });
    } else {
      set({ token, user });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ token: null, refreshToken: null, user: null });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    localStorage.setItem('user', JSON.stringify(updated));
    set({ user: updated });
  },

  hasRole: (role, projectId) => {
    const user = get().user;
    if (!user?.roles) return false;
    return user.roles.some(
      (r) => r.role === role && (projectId ? r.projectId === projectId : true)
    );
  },

  hasPermission: (permission, projectId) => {
    const user = get().user;
    if (!user?.roles) return false;

    for (const userRole of user.roles) {
      if (projectId && userRole.projectId && userRole.projectId !== projectId) continue;

      const perms = ROLE_PERMISSIONS[userRole.role] || [];
      if (perms.includes('*')) return true;
      if (perms.includes(permission)) return true;

      // Wildcard match: "project:*" matches "project:read"
      const moduleName = permission.split(':')[0];
      if (perms.includes(`${moduleName}:*`)) return true;
    }

    return false;
  },

  getAuthHeader: () => {
    const t = get().token;
    if (!t) return {};
    return { Authorization: `Bearer ${t}` };
  },

  refreshAccessToken: async () => {
    const rt = get().refreshToken || localStorage.getItem('refreshToken');
    if (!rt) return false;

    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        // Refresh token is expired/invalid — force logout
        get().logout();
        return false;
      }

      const json = await res.json();
      const { accessToken, refreshToken: newRefreshToken } = json.data;

      // Update token in store and localStorage
      localStorage.setItem('token', accessToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
      set({ token: accessToken, refreshToken: newRefreshToken || rt });
      return true;
    } catch {
      return false;
    }
  },
}));
