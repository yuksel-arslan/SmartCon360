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

// Contract-Driven Architecture types
export type DeliveryModel = 'dbb' | 'design_build' | 'cm_at_risk' | 'ipd' | 'epc' | 'kat_karsiligi' | 'hasilat_paylasimi' | 'bot' | 'blt' | 'emanet';
export type CommercialModel = 'unit_price' | 'lump_sum' | 'cost_plus' | 'gmp' | 'build_share' | 'revenue_share';
export type ContractForm = 'fidic_red' | 'fidic_yellow' | 'fidic_silver' | 'fidic_green' | 'nec3' | 'nec4' | 'jct' | 'aia' | 'bespoke';
export type PolicyModule = 'cost_pilot' | 'takt_flow' | 'claim_shield' | 'supply_chain' | 'crew_flow' | 'quality_gate' | 'safe_zone' | 'comm_hub';

export interface ContractProfile {
  id: string;
  projectId: string;
  deliveryModel: DeliveryModel;
  commercialModel: CommercialModel;
  retentionPct: number;
  advancePct: number;
  paymentTermDays: number;
  priceEscalation: boolean;
  escalationIndex?: string;
  contractForm?: ContractForm;
  defectsLiabilityMonths: number;
}

export interface ContractPolicyEntry {
  module: PolicyModule;
  policyKey: string;
  policyValue: string;
  description?: string;
  isOverridden: boolean;
}
