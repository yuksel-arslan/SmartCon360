/**
 * Constraint Service Types
 */

export type ConstraintCategory =
  | 'design'
  | 'material'
  | 'equipment'
  | 'labor'
  | 'space'
  | 'predecessor'
  | 'permit'
  | 'information';

export type ConstraintStatus = 'open' | 'in_progress' | 'resolved' | 'cancelled';

export type ConstraintPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Constraint {
  id: string;
  projectId: string;
  category: ConstraintCategory;
  title: string;
  description?: string;
  status: ConstraintStatus;
  priority: ConstraintPriority;
  zoneId?: string;
  tradeId?: string;
  activityId?: string;
  raisedBy: string;
  assignedTo?: string;
  dueDate?: Date;
  resolvedDate?: Date;
  resolutionNotes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConstraintStats {
  total: number;
  byCategory: Record<ConstraintCategory, number>;
  byStatus: Record<ConstraintStatus, number>;
  byPriority: Record<ConstraintPriority, number>;
  overdueCount: number;
}

export interface CRRData {
  weekNumber: number;
  weekStartDate: string;
  constraintsIdentified: number;
  constraintsResolved: number;
  crr: number; // Constraint Removal Rate percentage
}
