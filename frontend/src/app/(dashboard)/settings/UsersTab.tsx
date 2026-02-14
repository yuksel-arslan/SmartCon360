'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, Badge, EmptyState } from '@/components/ui';
import {
  Search, UserPlus, Shield, X, Check,
  Loader2, ChevronLeft, ChevronRight, MoreVertical, UserX, Users,
} from 'lucide-react';
import api from '@/lib/api';

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
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'var(--color-danger)',
  project_manager: 'var(--color-accent)',
  superintendent: 'var(--color-info)',
  foreman: 'var(--color-success)',
  viewer: 'var(--color-text-muted)',
};

export default function UsersTab() {
  const { getAuthHeader } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [assigningRole, setAssigningRole] = useState<string | null>(null); // userId
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const limit = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const result = await api<UserItem[]>(
        `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
        { token: token || undefined }
      );
      // api() returns json.data, but we also need meta for pagination
      // Let's use fetch directly for this one
      const res = await fetch(`/api/v1/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      const json = await res.json();
      if (json.data) {
        setUsers(json.data);
        setTotal(json.meta?.total || 0);
      }
    } catch {
      // Fallback: empty
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

  const handleAssignRole = async (userId: string) => {
    if (!selectedRoleId) return;
    try {
      await fetch(`/api/v1/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader() as Record<string, string>,
        },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });
      setAssigningRole(null);
      setSelectedRoleId('');
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
                      <div className="flex flex-wrap gap-1 items-center">
                        {user.roles.map((r) => (
                          <span key={r.id} className="inline-flex items-center gap-1">
                            <Badge
                              label={r.roleName.replace('_', ' ')}
                              color={ROLE_COLORS[r.roleName] || 'var(--color-text-muted)'}
                            />
                            <button
                              onClick={() => handleRemoveRole(user.id, r.id)}
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-opacity opacity-0 hover:opacity-100 cursor-pointer"
                              style={{ color: 'var(--color-danger)' }}
                              title="Remove role"
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                            >
                              <X size={8} />
                            </button>
                          </span>
                        ))}

                        {/* Assign role inline */}
                        {assigningRole === user.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={selectedRoleId}
                              onChange={(e) => setSelectedRoleId(e.target.value)}
                              className="text-[10px] px-2 py-1 rounded border"
                              style={{
                                background: 'var(--color-bg-input)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)',
                              }}
                            >
                              <option value="">Select role...</option>
                              {roles
                                .filter((r) => !user.roles.some((ur) => ur.roleId === r.id))
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name.replace('_', ' ')}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleAssignRole(user.id)}
                              disabled={!selectedRoleId}
                              className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
                              style={{ color: 'var(--color-success)', opacity: selectedRoleId ? 1 : 0.3 }}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => { setAssigningRole(null); setSelectedRoleId(''); }}
                              className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigningRole(user.id)}
                            className="w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer"
                            style={{ color: 'var(--color-accent)' }}
                            title="Add role"
                          >
                            <UserPlus size={11} />
                          </button>
                        )}
                      </div>
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
                        color={user.isActive ? 'var(--color-success)' : 'var(--color-danger)'}
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
