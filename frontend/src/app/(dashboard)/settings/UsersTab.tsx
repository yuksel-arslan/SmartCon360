'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, Badge, EmptyState } from '@/components/ui';
import {
  Search, UserPlus, X, Check, Plus,
  Loader2, ChevronLeft, ChevronRight, MoreVertical, UserX, Users,
  ChevronDown, Shield, Lock,
} from 'lucide-react';

interface UserRole {
  id: string;
  roleId: string;
  roleName: string;
  projectId: string | null;
  grantedBy: string | null;
  createdAt: string;
}

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: UserRole[];
}

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#EF4444',
  project_manager: '#E8731A',
  superintendent: '#3B82F6',
  foreman: '#22C55E',
  viewer: '#9CA3AF',
};

function roleColor(name: string): string {
  return ROLE_COLORS[name] || '#E8731A';
}

function roleLabel(name: string): string {
  return name.replace(/_/g, ' ');
}

// ── Custom Role Dropdown ─────────────────────────────────

interface RoleDropdownProps {
  roles: RoleOption[];
  excludeRoleIds: string[];
  onSelect: (roleId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

function RoleDropdown({ roles, excludeRoleIds, onSelect, onCreateNew, onClose }: RoleDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const available = roles.filter((r) => !excludeRoleIds.includes(r.id));

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-20 rounded-xl border shadow-xl min-w-[260px] overflow-hidden"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Select Role
        </span>
      </div>

      {/* Role list */}
      <div className="max-h-[240px] overflow-y-auto py-1">
        {available.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              All roles already assigned
            </span>
          </div>
        ) : (
          available.map((role) => (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors cursor-pointer"
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Color dot */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${roleColor(role.name)}18` }}
              >
                {role.isSystem
                  ? <Lock size={12} style={{ color: roleColor(role.name) }} />
                  : <Shield size={12} style={{ color: roleColor(role.name) }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[12px] font-semibold capitalize"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {roleLabel(role.name)}
                  </span>
                  {role.isSystem && (
                    <span
                      className="text-[8px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded"
                      style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-input)' }}
                    >
                      System
                    </span>
                  )}
                </div>
                {role.description && (
                  <span className="text-[10px] leading-tight block mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {role.description}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Create New separator + button */}
      <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={onCreateNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-accent-muted)' }}
          >
            <Plus size={13} style={{ color: 'var(--color-accent)' }} />
          </div>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--color-accent)' }}>
            Create New Role
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Inline New Role Creator ──────────────────────────────

interface InlineRoleCreatorProps {
  onCreated: (roleId: string) => void;
  onCancel: () => void;
  getAuthHeader: () => Record<string, string>;
  refreshRoles: () => void;
}

const QUICK_PERMS = [
  { key: 'project', label: 'Project' },
  { key: 'takt', label: 'Takt' },
  { key: 'constraint', label: 'Constraints' },
  { key: 'progress', label: 'Progress' },
  { key: 'quality', label: 'Quality' },
  { key: 'safety', label: 'Safety' },
  { key: 'cost', label: 'Cost' },
  { key: 'resource', label: 'Resources' },
  { key: 'risk', label: 'Risk' },
  { key: 'supply', label: 'Supply' },
  { key: 'claims', label: 'Claims' },
  { key: 'comm', label: 'Comm' },
  { key: 'report', label: 'Reports' },
  { key: 'stakeholder', label: 'Stakeholder' },
  { key: 'sustainability', label: 'ESG' },
  { key: 'vision', label: 'Vision' },
];

function InlineRoleCreator({ onCreated, onCancel, getAuthHeader, refreshRoles }: InlineRoleCreatorProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const togglePerm = (key: string) => {
    setPerms((prev) => {
      const next = new Set(prev);
      // Cycle: none → read → full → none
      if (next.has(`${key}:*`)) {
        next.delete(`${key}:*`);
      } else if (next.has(`${key}:read`)) {
        next.delete(`${key}:read`);
        next.add(`${key}:*`);
      } else {
        next.add(`${key}:read`);
      }
      return next;
    });
  };

  const getLevel = (key: string): 'none' | 'read' | 'full' => {
    if (perms.has(`${key}:*`)) return 'full';
    if (perms.has(`${key}:read`)) return 'read';
    return 'none';
  };

  const handleCreate = async () => {
    if (!name || perms.size === 0) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/v1/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          name,
          description: desc || undefined,
          permissions: Array.from(perms),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'Failed to create role');
        setSaving(false);
        return;
      }
      refreshRoles();
      onCreated(json.data.id);
    } catch {
      setError('Network error');
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-4 mt-2 space-y-3"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-accent)' }}
    >
      <div className="flex items-center gap-2">
        <Plus size={14} style={{ color: 'var(--color-accent)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
          Create New Role
        </span>
      </div>

      {/* Name + Description */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
            placeholder="quality_inspector"
            className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border"
            style={{
              background: 'var(--color-bg-input)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>
        <div>
          <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
            Description
          </label>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Brief description..."
            className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border"
            style={{
              background: 'var(--color-bg-input)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </div>
      </div>

      {/* Quick permission grid */}
      <div>
        <label className="text-[9px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
          Permissions (click to cycle: none → read → full)
        </label>
        <div className="flex flex-wrap gap-1">
          {QUICK_PERMS.map((p) => {
            const level = getLevel(p.key);
            const bg = level === 'full'
              ? 'var(--color-success)'
              : level === 'read'
                ? 'var(--color-info)'
                : 'var(--color-bg-input)';
            const fg = level === 'none' ? 'var(--color-text-muted)' : '#fff';
            return (
              <button
                key={p.key}
                onClick={() => togglePerm(p.key)}
                className="px-2 py-1 rounded-md text-[9px] font-semibold transition-colors cursor-pointer"
                style={{ background: bg, color: fg }}
                title={`${p.label}: ${level}`}
              >
                {p.label}
                {level !== 'none' && (
                  <span className="ml-1 opacity-80">
                    {level === 'read' ? 'R' : 'RW'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[11px] font-medium" style={{ color: 'var(--color-danger)' }}>{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleCreate}
          disabled={!name || perms.size === 0 || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer"
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            opacity: !name || perms.size === 0 || saving ? 0.4 : 1,
          }}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Create & Assign
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main UsersTab ────────────────────────────────────────

export default function UsersTab() {
  const { getAuthHeader } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dropdownUser, setDropdownUser] = useState<string | null>(null);
  const [creatingRoleForUser, setCreatingRoleForUser] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const limit = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      const json = await res.json();
      if (json.data) {
        setUsers(json.data);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }, [page, search, getAuthHeader]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/roles', {
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      const json = await res.json();
      if (json.data) setRoles(json.data);
    } catch {
      // ignore
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await fetch(`/api/v1/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader() as Record<string, string>,
        },
        body: JSON.stringify({ roleId }),
      });
      setDropdownUser(null);
      fetchUsers();
    } catch {
      // ignore
    }
  };

  const handleRemoveRole = async (userId: string, userRoleId: string) => {
    try {
      await fetch(`/api/v1/admin/users/${userId}/roles/${userRoleId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      fetchUsers();
    } catch {
      // ignore
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader() as Record<string, string>,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setActionMenu(null);
      fetchUsers();
    } catch {
      // ignore
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header + Search */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            User Management
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total} registered user{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users..."
            className="pl-8 pr-3 py-2 text-[12px] rounded-lg border w-56"
            style={{
              background: 'var(--color-bg-input)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try a different search term" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['User', 'Roles', 'Last Login', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{
                            background: 'var(--color-accent-muted)',
                            color: 'var(--color-accent)',
                          }}
                        >
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {user.email}
                            {user.company && ` · ${user.company}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Roles */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 items-center relative">
                        {user.roles.map((r) => (
                          <span
                            key={r.id}
                            className="group inline-flex items-center gap-0.5 rounded-md pr-1"
                            style={{ background: `${roleColor(r.roleName)}12` }}
                          >
                            <Badge
                              label={roleLabel(r.roleName)}
                              color={roleColor(r.roleName)}
                            />
                            <button
                              onClick={() => handleRemoveRole(user.id, r.id)}
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
                              style={{ color: roleColor(r.roleName) }}
                              title={`Remove ${roleLabel(r.roleName)}`}
                            >
                              <X size={8} />
                            </button>
                          </span>
                        ))}

                        {/* Add role trigger */}
                        <button
                          onClick={() => {
                            setDropdownUser(dropdownUser === user.id ? null : user.id);
                            setCreatingRoleForUser(null);
                          }}
                          className="w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-dashed"
                          style={{
                            borderColor: dropdownUser === user.id ? 'var(--color-accent)' : 'var(--color-border)',
                            color: dropdownUser === user.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            background: dropdownUser === user.id ? 'var(--color-accent-muted)' : 'transparent',
                          }}
                          title="Add role"
                        >
                          {dropdownUser === user.id ? <ChevronDown size={10} /> : <Plus size={11} />}
                        </button>

                        {/* Custom dropdown */}
                        {dropdownUser === user.id && !creatingRoleForUser && (
                          <RoleDropdown
                            roles={roles}
                            excludeRoleIds={user.roles.map((r) => r.roleId)}
                            onSelect={(roleId) => handleAssignRole(user.id, roleId)}
                            onCreateNew={() => {
                              setDropdownUser(null);
                              setCreatingRoleForUser(user.id);
                            }}
                            onClose={() => setDropdownUser(null)}
                          />
                        )}
                      </div>

                      {/* Inline role creator */}
                      {creatingRoleForUser === user.id && (
                        <InlineRoleCreator
                          getAuthHeader={() => getAuthHeader() as Record<string, string>}
                          refreshRoles={fetchRoles}
                          onCreated={(roleId) => {
                            setCreatingRoleForUser(null);
                            handleAssignRole(user.id, roleId);
                          }}
                          onCancel={() => setCreatingRoleForUser(null)}
                        />
                      )}
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] tabular-nums"
                        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
                      >
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge
                        label={user.isActive ? 'Active' : 'Disabled'}
                        color={user.isActive ? '#22C55E' : '#EF4444'}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <MoreVertical size={14} />
                      </button>
                      {actionMenu === user.id && (
                        <div
                          className="absolute right-4 top-10 z-10 rounded-lg border shadow-lg py-1 min-w-[140px]"
                          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                        >
                          <button
                            onClick={() => handleToggleActive(user.id, user.isActive)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors cursor-pointer"
                            style={{ color: user.isActive ? 'var(--color-danger)' : 'var(--color-success)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <UserX size={12} />
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
                opacity: page === 1 ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
                opacity: page === totalPages ? 0.3 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
