'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { Card, Badge, EmptyState } from '@/components/ui';
import {
  UserPlus, Users, Loader2, Trash2, FolderKanban,
} from 'lucide-react';

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  trade: string | null;
  status: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const ROLE_OPTIONS = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_COLORS: Record<string, string> = {
  project_manager: 'var(--color-accent)',
  superintendent: 'var(--color-info)',
  foreman: 'var(--color-success)',
  viewer: 'var(--color-text-muted)',
};

export default function ProjectTeamTab() {
  const { getAuthHeader } = useAuthStore();
  const { activeProjectId, projects } = useProjectStore();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [newTrade, setNewTrade] = useState('');

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const [error, setError] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!activeProjectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/projects/${activeProjectId}/members`, {
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMembers(json.data);
      } else {
        setError(json.error?.message || 'Failed to load members');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [activeProjectId, getAuthHeader]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const [addError, setAddError] = useState('');

  const handleAddMember = async () => {
    if (!activeProjectId || !newEmail) return;
    setAddError('');
    try {
      const res = await fetch(`/api/v1/projects/${activeProjectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader() as Record<string, string>,
        },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
          trade: newTrade || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error?.message || 'Failed to add member');
        return;
      }
      setAdding(false);
      setNewEmail('');
      setNewRole('viewer');
      setNewTrade('');
      setAddError('');
      fetchMembers();
    } catch {
      setAddError('Network error');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeProjectId) return;
    setError('');
    try {
      const res = await fetch(`/api/v1/projects/${activeProjectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() as Record<string, string> },
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to remove member');
        return;
      }
      fetchMembers();
    } catch {
      setError('Network error');
    }
  };

  if (!activeProjectId) {
    return (
      <div className="max-w-md">
        <EmptyState
          icon={FolderKanban}
          title="No project selected"
          description="Select a project from the sidebar to manage team members"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Project Team
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {activeProject?.name || 'Current project'} — {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <UserPlus size={12} />
            Add Member
          </button>
        )}
      </div>

      {/* Add member form */}
      {adding && (
        <Card>
          <div className="space-y-3">
            <h4 className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
              Add Team Member
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Email
                </label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full px-3 py-2 text-[12px] rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1 block"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Trade (optional)
                </label>
                <input
                  value={newTrade}
                  onChange={(e) => setNewTrade(e.target.value)}
                  placeholder="e.g. MEP, Concrete"
                  className="w-full px-3 py-2 text-[12px] rounded-lg border"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>
            {addError && (
              <p className="text-[11px] font-medium" style={{ color: 'var(--color-danger)' }}>{addError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddMember}
                disabled={!newEmail}
                className="px-3 py-2 rounded-lg text-[11px] font-semibold cursor-pointer"
                style={{
                  background: 'var(--color-accent)',
                  color: '#fff',
                  opacity: !newEmail ? 0.4 : 1,
                }}
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setAddError(''); }}
                className="px-3 py-2 rounded-lg text-[11px] font-medium cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
              >
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

      {/* Members list */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members"
            description="Add team members to manage project roles"
          />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{
                      background: 'var(--color-accent-muted)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {member.user
                      ? `${member.user.firstName[0]}${member.user.lastName[0]}`
                      : member.userId.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                      {member.user
                        ? `${member.user.firstName} ${member.user.lastName}`
                        : member.userId}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {member.user?.email || ''}
                      {member.trade && ` · ${member.trade}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    label={member.role.replace('_', ' ')}
                    color={ROLE_COLORS[member.role] || 'var(--color-text-muted)'}
                  />
                  <Badge
                    label={member.status}
                    color={member.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)'}
                  />
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-danger)';
                      e.currentTarget.style.background = 'var(--color-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Remove member"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
