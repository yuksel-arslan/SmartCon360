'use client';

import { useAuthStore } from '@/stores/authStore';
import type { ReactNode } from 'react';

interface PermissionGateProps {
  /** Required permission string (e.g. "quality:write", "project:read") */
  permission?: string;
  /** Required role name (e.g. "admin", "project_manager") */
  role?: string;
  /** Project ID for project-scoped permissions */
  projectId?: string;
  /** Content to show when authorized */
  children: ReactNode;
  /** Optional fallback when unauthorized (defaults to nothing) */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user's role or permission.
 *
 * Usage:
 *   <PermissionGate role="admin">
 *     <AdminPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate permission="quality:write">
 *     <EditButton />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  role,
  projectId,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasRole, hasPermission } = useAuthStore();

  let authorized = false;

  if (role) {
    authorized = hasRole(role, projectId);
  } else if (permission) {
    authorized = hasPermission(permission, projectId);
  }

  return <>{authorized ? children : fallback}</>;
}

/**
 * Hook version for more complex conditional logic.
 *
 * Usage:
 *   const canEdit = usePermission('quality:write');
 *   const isAdmin = usePermission(undefined, 'admin');
 */
export function usePermission(permission?: string, role?: string, projectId?: string): boolean {
  const { hasRole, hasPermission } = useAuthStore();

  if (role) return hasRole(role, projectId);
  if (permission) return hasPermission(permission, projectId);
  return false;
}
