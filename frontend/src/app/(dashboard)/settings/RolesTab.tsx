'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, Badge, EmptyState } from '@/components/ui';
import {
  Shield, Plus, Pencil, Trash2, Check, X, Loader2, Lock, Users,
} from 'lucide-react';

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'var(--color-danger)',
  project_manager: 'var(--color-accent)',
  superintendent: 'var(--color-info)',
  foreman: 'var(--color-success)',
  viewer: 'var(--color-text-muted)',
};

// All available permission modules
const PERMISSION_MODULES = [
  { module: 'project', label: 'Project' },
  { module: 'takt', label: 'Takt Planning' },
  { module: 'constraint', label: 'Constraints' },
  { module: 'progress', label: 'Progress' },
  { module: 'report', label: 'Reports' },
  { module: 'resource', label: 'Resources' },
  { module: 'quality', label: 'Quality' },
  { module: 'safety', label: 'Safety' },
  { module: 'cost', label: 'Cost' },
  { module: 'risk', label: 'Risk' },
  { module: 'supply', label: 'Supply Chain' },
  { module: 'claims', label: 'Claims' },
  { module: 'comm', label: 'Communication' },
  { module: 'stakeholder', label: 'Stakeholders' },
  { module: 'sustainability', label: 'Sustainability' },
  { module: 'vision', label: 'VisionAI' },
];

export default function RolesTab() {
  const { getAuthHeader } = useAuthStore();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/roles', {
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      const json = await res.json();
      if (json.data) setRoles(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const startEditing = (role: RoleItem) => {
    setEditingRole(role.id);
    setEditPermissions(Array.isArray(role.permissions) ? [...role.permissions] : []);
    setEditDescription(role.description || '');
  };

  const saveEdit = async (roleId: string) => {
    setError('');
    try {
      const res = await fetch(`/api/v1/admin/roles/${roleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader() as Record<string, string>,
        },
        body: JSON.stringify({
          description: editDescription,
          permissions: editPermissions,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to save role');
        return;
      }
      setEditingRole(null);
      fetchRoles();
    } catch {
      setError('Network error');
    }
  };

  const createRole = async () => {
    if (!newRoleName || newRolePerms.length === 0) return;
    setCreateError('');
    try {
      const res = await fetch('/api/v1/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader() as Record<string, string>,
        },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDesc,
          permissions: newRolePerms,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setCreateError(json.error?.message || 'Failed to create role');
        return;
      }
      setCreating(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRolePerms([]);
      setCreateError('');
      fetchRoles();
    } catch {
      setCreateError('Network error');
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm('Delete this role? All users with this role will lose it.')) return;
    setError('');
    try {
      const res = await fetch(`/api/v1/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      if (!res.ok && res.status !== 204) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to delete role');
        return;
      }
      fetchRoles();
    } catch {
      setError('Network error');
    }
  };

  const togglePermission = (perms: string[], setPerms: (p: string[]) => void, perm: string) => {
    if (perms.includes(perm)) {
      setPerms(perms.filter((p) => p !== perm));
    } else {
      setPerms([...perms, perm]);
    }
  };

  /** Get permission level for a module from a permissions array */
  const getPermLevel = (perms: string[], mod: string): 'none' | 'read' | 'write' | 'full' => {
    if (perms.includes('*')) return 'full';
    if (perms.includes(`${mod}:*`)) return 'full';
    if (perms.includes(`${mod}:write`)) return 'write';
    if (perms.includes(`${mod}:read`)) return 'read';
    return 'none';
  };

  const cyclePermission = (perms: string[], setPerms: (p: string[]) => void, mod: string) => {
    const current = getPermLevel(perms, mod);
    // Remove existing module permissions
    const filtered = perms.filter(
      (p) => p !== `${mod}:*` && p !== `${mod}:read` && p !== `${mod}:write`
    );
    if (current === 'none') setPerms([...filtered, `${mod}:read`]);
    else if (current === 'read') setPerms([...filtered, `${mod}:write`, `${mod}:read`]);
    else if (current === 'write') setPerms([...filtered, `${mod}:*`]);
    else setPerms(filtered); // full → none
  };

  const PermLevelBadge = ({ level }: { level: string }) => {
    const colors: Record<string, string> = {
      none: 'var(--color-text-muted)',
      read: 'var(--color-info)',
      write: 'var(--color-warning)',
      full: 'var(--color-success)',
    };
    return <Badge label={level} color={colors[level] || 'var(--color-text-muted)'} />;
  };

  const PermissionGrid = ({
    perms,
    editable,
    onCycle,
  }: {
    perms: string[];
    editable: boolean;
    onCycle?: (mod: string) => void;
  }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 mt-2">
      {PERMISSION_MODULES.map((pm) => {
        const level = getPermLevel(perms, pm.module);
        return (
          <button
            key={pm.module}
            onClick={() => editable && onCycle?.(pm.module)}
            disabled={!editable}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] transition-colors"
            style={{
              background: level !== 'none' ? `var(--color-bg-hover)` : 'transparent',
              cursor: editable ? 'pointer' : 'default',
              opacity: level === 'none' ? 0.4 : 1,
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{pm.label}</span>
            <PermLevelBadge level={level} />
          </button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Roles & Permissions
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {roles.length} role{roles.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Plus size={12} />
            New Role
          </button>
        )}
      </div>

      {/* Create new role */}
      {creating && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: 'var(--color-accent)' }} />
              <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
                Create New Role
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                  Role Name
                </label>
                <input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
                  placeholder="e.g. quality_inspector"
                  className="w-full px-3 py-2 text-[12px] rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                  Description
                </label>
                <input
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 text-[12px] rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                Permissions (click to cycle: none → read → write → full)
              </label>
              <PermissionGrid
                perms={newRolePerms}
                editable
                onCycle={(mod) => cyclePermission(newRolePerms, setNewRolePerms, mod)}
              />
            </div>
            {createError && (
              <p className="text-[11px] font-medium" style={{ color: 'var(--color-danger)' }}>{createError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={createRole}
                disabled={!newRoleName || newRolePerms.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold cursor-pointer"
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  opacity: !newRoleName || newRolePerms.length === 0 ? 0.4 : 1,
                }}
              >
                <Check size={12} />
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewRoleName(''); setNewRoleDesc(''); setNewRolePerms([]); setCreateError(''); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg text-[11px] font-medium" style={{ background: 'var(--color-danger-muted, #fef2f2)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Role List */}
      {roles.length === 0 ? (
        <EmptyState icon={Shield} title="No roles defined" description="Create your first role to get started" />
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const isEditing = editingRole === role.id;
            const color = ROLE_COLORS[role.name] || 'var(--color-accent)';
            const perms = Array.isArray(role.permissions) ? role.permissions : [];

            return (
              <Card key={role.id}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      {role.isSystem ? (
                        <Lock size={16} style={{ color }} />
                      ) : (
                        <Shield size={16} style={{ color }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[13px] font-semibold truncate"
                          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
                        >
                          {role.name}
                        </span>
                        {role.isSystem && (
                          <Badge label="System" color="var(--color-text-muted)" />
                        )}
                      </div>
                      {isEditing ? (
                        <input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="mt-1 w-full px-2 py-1 text-[11px] rounded border"
                          style={{
                            background: 'var(--color-bg-input)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text)',
                          }}
                        />
                      ) : (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {role.description || 'No description'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-12 sm:pl-0 flex-shrink-0">
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      <Users size={11} />
                      {role.userCount}
                    </div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(role.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ color: 'var(--color-success)' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditing(role)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          style={{ color: 'var(--color-text-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => deleteRole(role.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                            style={{ color: 'var(--color-danger)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions */}
                <PermissionGrid
                  perms={isEditing ? editPermissions : perms}
                  editable={isEditing}
                  onCycle={isEditing ? (mod) => cyclePermission(editPermissions, setEditPermissions, mod) : undefined}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
