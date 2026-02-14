/**
 * SmartCon360 — Centralized Module Registry
 *
 * Single source of truth for all module metadata.
 * Sidebar, page headers, dashboard cards, and any
 * component that references a module should import from here.
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, GitBranch, Grid3x3, AlertTriangle,
  ClipboardCheck, Users, FileText, Bot, Settings,
  ShieldCheck, HardHat, DollarSign, Truck, Radar, Scale,
  Camera, MessageSquare, UserCheck, Leaf, Activity, Play,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────

export type ModuleId =
  | 'dashboard' | 'flowline' | 'takt-editor' | 'constraints' | 'lps'
  | 'quality' | 'safety' | 'vision'
  | 'cost' | 'resources'
  | 'supply' | 'risk' | 'claims'
  | 'communication' | 'stakeholders'
  | 'sustainability'
  | 'ai' | 'reports' | 'simulation'
  | 'settings';

export type ModuleGroupId =
  | 'planning'
  | 'quality-safety'
  | 'cost-resources'
  | 'supply-risk'
  | 'communication'
  | 'sustainability'
  | 'ai-analytics';

export interface ModuleDef {
  /** Unique key used for routing and lookups */
  id: ModuleId;
  /** Route path (without leading slash internally, with leading slash for href) */
  href: string;
  /** Display label shown in sidebar and headers */
  label: string;
  /** Product / brand name of the module */
  brandName: string;
  /** Short description */
  description: string;
  /** Lucide icon component for sidebar & inline usage */
  icon: LucideIcon;
  /** Path to the module SVG logo in /public */
  svgIcon: string;
  /** Primary accent color for this module */
  color: string;
  /** Feature tags shown on placeholder / coming-soon cards */
  features: string[];
  /** KPI definitions for the module dashboard */
  kpis: { label: string; value: string }[];
}

export interface ModuleGroup {
  id: ModuleGroupId;
  label: string;
  modules: ModuleId[];
}

// ── Module Definitions ───────────────────────────────────

export const MODULE_REGISTRY: Record<ModuleId, ModuleDef> = {
  // ── Planning ─────────────────────────────
  dashboard: {
    id: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    brandName: 'SmartCon360',
    description: 'Unified project dashboard with cross-module KPIs',
    icon: LayoutDashboard,
    svgIcon: '/icons/modules/smartcon360.svg',
    color: 'var(--color-accent)',
    features: [],
    kpis: [],
  },
  flowline: {
    id: 'flowline',
    href: '/flowline',
    label: 'Flowline',
    brandName: 'TaktFlow',
    description: 'Flowline visualization and trade progress tracking',
    icon: GitBranch,
    svgIcon: '/icons/modules/taktflow.svg',
    color: 'var(--color-accent)',
    features: ['Flowline Chart', 'Trade Tracking', 'Zone Progress', 'Buffer Analysis'],
    kpis: [],
  },
  'takt-editor': {
    id: 'takt-editor',
    href: '/takt-editor',
    label: 'Takt Editor',
    brandName: 'TaktFlow',
    description: 'Takt plan editor with drag & drop scheduling',
    icon: Grid3x3,
    svgIcon: '/icons/modules/taktflow.svg',
    color: 'var(--color-accent)',
    features: ['Drag & Drop', 'Takt Calculation', 'Template Plans', 'Trade Sequencing'],
    kpis: [],
  },
  constraints: {
    id: 'constraints',
    href: '/constraints',
    label: 'Constraints',
    brandName: 'TaktFlow',
    description: 'Constraint management and removal tracking',
    icon: AlertTriangle,
    svgIcon: '/icons/modules/taktflow.svg',
    color: 'var(--color-warning)',
    features: ['8 Categories', 'Priority Matrix', 'Removal Tracking', 'LPS Integration'],
    kpis: [],
  },
  lps: {
    id: 'lps',
    href: '/lps',
    label: 'Last Planner',
    brandName: 'TaktFlow',
    description: 'Last Planner System — lookahead, weekly plans, PPC',
    icon: ClipboardCheck,
    svgIcon: '/icons/modules/taktflow.svg',
    color: 'var(--color-accent)',
    features: ['Phase Planning', 'Lookahead', 'Weekly Work Plan', 'PPC Tracking'],
    kpis: [],
  },

  // ── Quality & Safety ─────────────────────
  quality: {
    id: 'quality',
    href: '/quality',
    label: 'QualityGate',
    brandName: 'QualityGate',
    description: 'Quality control and inspection management',
    icon: ShieldCheck,
    svgIcon: '/icons/modules/qualitygate.svg',
    color: '#10B981',
    features: ['NCR Management', 'Inspection Checklists', 'ITP Tracking', 'Punch Lists', 'FTR Analytics', 'Photo Documentation'],
    kpis: [
      { label: 'FTR Rate', value: '94.2%' },
      { label: 'Open NCRs', value: '12' },
      { label: 'COPQ', value: '$45,200' },
      { label: 'Inspections Today', value: '8' },
    ],
  },
  safety: {
    id: 'safety',
    href: '/safety',
    label: 'SafeZone',
    brandName: 'SafeZone',
    description: 'Occupational health and safety management',
    icon: HardHat,
    svgIcon: '/icons/modules/safezone.svg',
    color: '#EF4444',
    features: ['Risk Matrix', 'Incident Reporting', 'Permit to Work', 'JSA', 'Toolbox Talks', 'Safety Observations'],
    kpis: [
      { label: 'LTIR', value: '0.42' },
      { label: 'Days Without Incident', value: '28' },
      { label: 'Open PTWs', value: '5' },
      { label: 'Toolbox Talks', value: '142' },
    ],
  },
  vision: {
    id: 'vision',
    href: '/vision',
    label: 'VisionAI',
    brandName: 'VisionAI',
    description: 'AI-powered visual progress tracking',
    icon: Camera,
    svgIcon: '/icons/modules/visionai.svg',
    color: '#8B5CF6',
    features: ['Photo Analysis', 'Progress Detection', 'Defect Identification', 'Time-Lapse', 'AI Comparison', 'Report Generation'],
    kpis: [
      { label: 'Photos Analyzed', value: '1,247' },
      { label: 'Progress Accuracy', value: '96.8%' },
      { label: 'Defects Found', value: '23' },
      { label: 'Active Cameras', value: '12' },
    ],
  },

  // ── Cost & Resources ─────────────────────
  cost: {
    id: 'cost',
    href: '/cost',
    label: 'CostPilot',
    brandName: 'CostPilot',
    description: 'Metraj, birim fiyat analizi, kesif, hakedis ve maliyet kontrolu',
    icon: DollarSign,
    svgIcon: '/icons/modules/costpilot.svg',
    color: '#F59E0B',
    features: ['Work Items', 'Unit Prices', 'Metraj', 'Estimates', 'Budgets', 'Hakedis', 'EVM'],
    kpis: [
      { label: 'CPI', value: '1.03' },
      { label: 'SPI', value: '0.97' },
      { label: 'Budget Variance', value: '-2.1%' },
      { label: 'EAC', value: '48.2M' },
    ],
  },
  resources: {
    id: 'resources',
    href: '/resources',
    label: 'CrewFlow',
    brandName: 'CrewFlow',
    description: 'Resource management — crews, equipment, materials',
    icon: Users,
    svgIcon: '/icons/modules/crewflow.svg',
    color: '#3B82F6',
    features: ['Crew Planning', 'Equipment Tracking', 'Material Management', 'Utilization Reports'],
    kpis: [
      { label: 'Active Crews', value: '24' },
      { label: 'Utilization', value: '87%' },
      { label: 'Equipment', value: '42' },
      { label: 'Headcount', value: '186' },
    ],
  },

  // ── Supply & Risk ────────────────────────
  supply: {
    id: 'supply',
    href: '/supply',
    label: 'SupplyChain',
    brandName: 'SupplyChain AI',
    description: 'Procurement and supply chain management',
    icon: Truck,
    svgIcon: '/icons/modules/supplychain.svg',
    color: '#06B6D4',
    features: ['MRP Engine', 'Procurement', 'JIT Delivery', 'Supplier Management', 'RFQ Tracking', 'Inventory'],
    kpis: [
      { label: 'Open POs', value: '34' },
      { label: 'On-Time Delivery', value: '91%' },
      { label: 'Active Suppliers', value: '28' },
      { label: 'Pending RFQs', value: '7' },
    ],
  },
  risk: {
    id: 'risk',
    href: '/risk',
    label: 'RiskRadar',
    brandName: 'RiskRadar',
    description: 'Risk identification and mitigation tracking',
    icon: Radar,
    svgIcon: '/icons/modules/riskradar.svg',
    color: '#F97316',
    features: ['Risk Register', 'Heat Map', 'Mitigation Plans', 'What-If Analysis', 'Monte Carlo', 'Risk Score'],
    kpis: [
      { label: 'Active Risks', value: '18' },
      { label: 'High Priority', value: '4' },
      { label: 'Mitigated', value: '32' },
      { label: 'Risk Score', value: '6.2' },
    ],
  },
  claims: {
    id: 'claims',
    href: '/claims',
    label: 'ClaimShield',
    brandName: 'ClaimShield',
    description: 'Claims and change order management',
    icon: Scale,
    svgIcon: '/icons/modules/claimshield.svg',
    color: '#EC4899',
    features: ['Change Orders', 'Claims Register', 'Delay Analysis', 'Extension of Time', 'Documentation', 'Approval Workflow'],
    kpis: [
      { label: 'Open Claims', value: '6' },
      { label: 'Change Orders', value: '14' },
      { label: 'Total Value', value: '$2.1M' },
      { label: 'Avg Resolution', value: '18d' },
    ],
  },

  // ── Communication ────────────────────────
  communication: {
    id: 'communication',
    href: '/communication',
    label: 'CommHub',
    brandName: 'CommHub',
    description: 'Project communication and document management',
    icon: MessageSquare,
    svgIcon: '/icons/modules/commhub.svg',
    color: '#6366F1',
    features: ['RFI Management', 'Transmittals', 'Meeting Minutes', 'Escalation Engine', 'Document Control', 'Notifications'],
    kpis: [
      { label: 'Open RFIs', value: '22' },
      { label: 'Pending Transmittals', value: '8' },
      { label: 'Overdue Items', value: '3' },
      { label: 'This Week', value: '47' },
    ],
  },
  stakeholders: {
    id: 'stakeholders',
    href: '/stakeholders',
    label: 'StakeHub',
    brandName: 'StakeHub',
    description: 'Stakeholder engagement and authority management',
    icon: UserCheck,
    svgIcon: '/icons/modules/stakehub.svg',
    color: '#14B8A6',
    features: ['Stakeholder Register', 'Authority Matrix', 'Engagement Plans', 'Communication Log', 'Influence Map', 'Reports'],
    kpis: [
      { label: 'Stakeholders', value: '45' },
      { label: 'High Influence', value: '12' },
      { label: 'Engagement Score', value: '78%' },
      { label: 'Pending Actions', value: '6' },
    ],
  },

  // ── Sustainability ───────────────────────
  sustainability: {
    id: 'sustainability',
    href: '/sustainability',
    label: 'GreenSite',
    brandName: 'GreenSite',
    description: 'Environmental sustainability and ESG tracking',
    icon: Leaf,
    svgIcon: '/icons/modules/greensite.svg',
    color: '#10B981',
    features: ['Carbon Tracking', 'Waste Management', 'LEED/BREEAM', 'Water Usage', 'Energy Monitoring', 'ESG Reports'],
    kpis: [
      { label: 'Carbon (tCO₂)', value: '124.5' },
      { label: 'Waste Diverted', value: '82%' },
      { label: 'LEED Points', value: '62/110' },
      { label: 'Energy (kWh)', value: '45.2K' },
    ],
  },

  // ── AI & Analytics ───────────────────────
  ai: {
    id: 'ai',
    href: '/ai',
    label: 'AI Concierge',
    brandName: 'SmartCon360 AI',
    description: 'Conversational AI assistant for project management',
    icon: Bot,
    svgIcon: '/icons/modules/smartcon360.svg',
    color: 'var(--color-accent)',
    features: ['Natural Language', 'Project Insights', 'Data Queries', 'Report Generation'],
    kpis: [],
  },
  reports: {
    id: 'reports',
    href: '/reports',
    label: 'Reports',
    brandName: 'SmartCon360',
    description: 'Automated report generation and analytics',
    icon: FileText,
    svgIcon: '/icons/modules/smartcon360.svg',
    color: 'var(--color-accent)',
    features: ['Daily Reports', 'Weekly Reports', 'AI Narrative', 'PDF Export'],
    kpis: [],
  },
  simulation: {
    id: 'simulation',
    href: '/simulation',
    label: 'Simulation',
    brandName: 'SmartCon360',
    description: 'What-if simulation and scenario planning',
    icon: Play,
    svgIcon: '/icons/modules/smartcon360.svg',
    color: 'var(--color-accent)',
    features: ['Parameter Sweep', 'Monte Carlo', 'DRL Optimization', 'Scenario Comparison'],
    kpis: [],
  },
  settings: {
    id: 'settings',
    href: '/settings',
    label: 'Settings',
    brandName: 'SmartCon360',
    description: 'Platform settings and preferences',
    icon: Settings,
    svgIcon: '/icons/modules/smartcon360.svg',
    color: 'var(--color-text-muted)',
    features: [],
    kpis: [],
  },
};

// ── Navigation Groups ────────────────────────────────────

export const NAV_GROUPS: ModuleGroup[] = [
  {
    id: 'planning',
    label: 'Planning',
    modules: ['dashboard', 'flowline', 'takt-editor', 'constraints', 'lps'],
  },
  {
    id: 'quality-safety',
    label: 'Quality & Safety',
    modules: ['quality', 'safety', 'vision'],
  },
  {
    id: 'cost-resources',
    label: 'Cost & Resources',
    modules: ['cost', 'resources'],
  },
  {
    id: 'supply-risk',
    label: 'Supply & Risk',
    modules: ['supply', 'risk', 'claims'],
  },
  {
    id: 'communication',
    label: 'Communication',
    modules: ['communication', 'stakeholders'],
  },
  {
    id: 'sustainability',
    label: 'Sustainability',
    modules: ['sustainability'],
  },
  {
    id: 'ai-analytics',
    label: 'AI & Analytics',
    modules: ['ai', 'reports', 'simulation'],
  },
];

// ── Helpers ──────────────────────────────────────────────

/** Get a module definition by its ID */
export function getModule(id: ModuleId): ModuleDef {
  return MODULE_REGISTRY[id];
}

/** Get a module definition by its route path */
export function getModuleByPath(path: string): ModuleDef | undefined {
  return Object.values(MODULE_REGISTRY).find((m) => m.href === path);
}

/** Get all modules in a navigation group */
export function getGroupModules(groupId: ModuleGroupId): ModuleDef[] {
  const group = NAV_GROUPS.find((g) => g.id === groupId);
  if (!group) return [];
  return group.modules.map((id) => MODULE_REGISTRY[id]);
}

/** SmartCon360 brand assets */
export const BRAND = {
  name: 'SmartCon360',
  tagline: 'One Platform, Full Construction Management',
  logo: '/icons/modules/smartcon360.svg',
  logoLight: '/taktflow-logo.svg',
  logoDark: '/taktflow-logo-dark.svg',
  icon: '/taktflow-icon.svg',
  accentColor: '#E8731A',
  accentGradient: 'linear-gradient(135deg, #E8731A, #F59E3F)',
} as const;
