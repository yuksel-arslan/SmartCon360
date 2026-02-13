export interface User {
  id: string; email: string; firstName: string; lastName: string;
  company?: string; locale: string; timezone: string; avatarUrl?: string;
  roles: { role: string; projectId?: string }[];
}
export interface AuthTokens { accessToken: string; refreshToken: string; }
export type ProjectType = 'hotel' | 'hospital' | 'residential' | 'commercial' | 'industrial' | 'infrastructure';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type LocationType = 'site' | 'building' | 'floor' | 'zone' | 'room' | 'area';
export type TaktPlanStatus = 'draft' | 'active' | 'superseded' | 'archived';
export type AssignmentStatus = 'planned' | 'in_progress' | 'completed' | 'delayed' | 'blocked';
export type ConstraintCategory = 'design' | 'material' | 'equipment' | 'labor' | 'space' | 'predecessor' | 'permit' | 'information';
export type ConstraintStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export interface ApiResponse<T> { data: T; meta?: { page: number; limit: number; total: number }; error?: { code: string; message: string; details?: Record<string, unknown> } | null; }
