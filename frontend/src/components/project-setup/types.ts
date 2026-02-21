// ══════════════════════════════════════════════════════════════════════════════
// SmartCon360 — Project Setup Types & Constants
// Construction Management parameters derived from 44 years of mega-project
// experience, LBMS methodology, Takt Time Planning, and Last Planner System.
// ══════════════════════════════════════════════════════════════════════════════

// ── SetupState: central state for the 10-step Project Setup wizard ──

export interface SetupState {
  // Navigation & progress
  currentStep: string;
  completedSteps: string[];

  // Step 0: Project Info (for new project creation)
  projectCode: string;
  projectDescription: string;
  plannedStart: string;
  plannedFinish: string;
  projectCity: string;
  projectCountry: string;
  projectAddress: string;
  projectBudget: string;

  // Step 1: Classification
  classificationStandard: string;   // 'uniclass' | 'omniclass' | 'custom'
  buildingType: string;             // building type key from BUILDING_TYPES
  projectPhase: string;             // 'new_build' | 'renovation' | 'fit_out' | 'expansion'

  // Step 2: Building Configuration (Scope)
  floorCount: number;               // above-ground floors (incl. ground)
  basementCount: number;            // basement levels
  zonesPerFloor: number;            // fit-out zones per typical floor (OmniClass 21-03)
  structuralZonesPerFloor: number;  // shell & core zones per typical floor (OmniClass 21-02)
  substructureZonesCount: number;   // substructure sectors/grid zones (OmniClass 21-01)
  typicalFloorArea: number;         // m² per typical floor
  numberOfBuildings: number;        // multi-building projects
  structuralSystem: string;         // 'rc_frame' | 'steel_frame' | 'precast' | 'hybrid' | 'timber' | 'masonry'
  mepComplexity: string;            // 'low' | 'medium' | 'high' | 'critical'
  flowDirection: string;            // 'bottom_up' | 'top_down'
  deliveryMethod: string;           // 'dbb' | 'design_build' | 'cm_at_risk' | 'ipd' | 'epc' | 'kat_karsiligi' | ...
  contractPricingModel: string;     // 'unit_price' | 'lump_sum' | 'cost_plus' | 'gmp' | 'build_share' | 'revenue_share'
  siteCondition: string;            // 'urban' | 'suburban' | 'rural' | 'remote'
  foundationType: string;           // 'raft' | 'piled' | 'strip' | 'pad' | 'combined' | 'caisson'
  groundCondition: string;          // 'normal' | 'high_water_table' | 'soft_soil' | 'rock' | 'contaminated'
  groundImprovement: string[];      // ['dewatering', 'soil_stabilization', 'piling', 'ground_anchors', 'sheet_piling']

  // Documents (optional steps)
  boqUploaded: boolean;
  boqFileName: string | null;
  boqItemCount: number;
  drawingCount: number;

  // WBS & CBS
  wbsGenerated: boolean;
  wbsNodeCount: number;
  cbsGenerated: boolean;
  cbsNodeCount: number;

  // LBS
  locationCount: number;
  zoneCount: number;
  lbsConfigured: boolean;

  // Takt Config
  defaultTaktTime: number;
  bufferSize: number;
  workingDays: string[];
  tradeCount: number;
  taktPlanGenerated: boolean;

  // Legacy / project metadata
  projectType: string;
  currency: string;
  projectName: string;
}

// ── Step definitions ──

export interface SetupStepDef {
  id: string;
  label: string;
  description: string;
}

export interface SetupStepProps {
  projectId: string;
  state: SetupState;
  onStateChange: (updates: Partial<SetupState>) => void;
  onComplete: () => void;
  authHeaders: Record<string, string>;
}

export interface WbsStandard {
  value: string;
  label: string;
  description: string;
  region: string;
}

export interface DrawingFile {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  discipline: string;
  drawingNo?: string;
  title?: string;
  revision?: string;
  status: string;
  createdAt: string;
}

export interface BoqItem {
  rowIndex: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  wbsCode?: string;
  isValid: boolean;
  errors: string[];
}

export type ContractType = 'labor_only' | 'supply_and_fix' | 'supply_install';

export interface SubTradeTemplate {
  name: string;
  code: string;
  color: string;
  discipline: string;
  defaultCrewSize: number;
  durationMultiplier: number;
  predecessorCodes: string[];
  sortOrder: number;
  defaultContractType: ContractType;
}

export const CONTRACT_TYPES: { value: ContractType; label: string; shortLabel: string; description: string; color: string }[] = [
  { value: 'labor_only', label: 'Labor Only', shortLabel: 'Labor', description: 'Subcontractor provides labor only — main contractor procures materials', color: '#F59E0B' },
  { value: 'supply_and_fix', label: 'Supply & Fix', shortLabel: 'S&F', description: 'Subcontractor provides both materials and labor', color: '#3B82F6' },
  { value: 'supply_install', label: 'Supply, Install & Commission', shortLabel: 'S&I', description: 'Full turnkey — supply, install and commissioning', color: '#10B981' },
];

// ══════════════════════════════════════════════════════════════════════════════
// 10-Step Wizard Flow
// ══════════════════════════════════════════════════════════════════════════════

export const SETUP_STEPS: SetupStepDef[] = [
  { id: 'info',           label: 'Project Info',     description: 'Name, code, dates & budget' },
  { id: 'classification', label: 'Classification',   description: 'Standard, building type & project phase' },
  { id: 'scope',          label: 'Building Config',  description: 'Floors, structural, MEP & site' },
  { id: 'drawings',       label: 'Drawings',         description: 'Upload project drawings' },
  { id: 'boq',            label: 'BOQ',              description: 'Bill of Quantities' },
  { id: 'wbs',            label: 'WBS',              description: 'Work Breakdown Structure' },
  { id: 'cbs',            label: 'CBS',              description: 'Cost Breakdown Structure' },
  { id: 'lbs',            label: 'LBS',              description: 'Location Breakdown Structure' },
  { id: 'trades',         label: 'Trades',           description: 'Discipline trades' },
  { id: 'takt',           label: 'Takt Config',      description: 'Takt time & schedule rhythm' },
  { id: 'review',         label: 'Review',           description: 'Finalize setup' },
];

const OPTIONAL_STEPS = new Set(['drawings', 'boq']);

export function isStepOptional(stepId: string): boolean {
  return OPTIONAL_STEPS.has(stepId);
}

// ══════════════════════════════════════════════════════════════════════════════
// Building Types — 9 construction typologies with takt-specific defaults
// ══════════════════════════════════════════════════════════════════════════════

export interface BuildingTypeOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  // Defaults auto-populated when selected
  defaultFloors: number;
  defaultBasements: number;
  defaultZonesPerFloor: number;              // fit-out zones (OmniClass 21-03 Interiors)
  defaultStructuralZonesPerFloor: number;    // shell & core zones (OmniClass 21-02 Shell) — typically 1 (full floor)
  defaultSubstructureZones: number;          // substructure sectors (OmniClass 21-01 Substructure) — 2-6
  defaultFloorArea: number;                  // m² per typical floor
  defaultStructural: string;                 // structural system key
  defaultMep: string;                        // MEP complexity key
  defaultFlowDirection: string;              // flow direction key
}

export const BUILDING_TYPES: BuildingTypeOption[] = [
  {
    value: 'hotel', label: 'Hotel / Resort', icon: '🏨',
    description: 'Guest rooms, lobbies, restaurants, back-of-house',
    defaultFloors: 10, defaultBasements: 1, defaultZonesPerFloor: 3, defaultStructuralZonesPerFloor: 1, defaultSubstructureZones: 4,
    defaultFloorArea: 1200, defaultStructural: 'rc_frame', defaultMep: 'medium', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'hospital', label: 'Hospital / Healthcare', icon: '🏥',
    description: 'Patient rooms, OR suites, emergency, diagnostics',
    defaultFloors: 6, defaultBasements: 1, defaultZonesPerFloor: 4, defaultStructuralZonesPerFloor: 1, defaultSubstructureZones: 4,
    defaultFloorArea: 3000, defaultStructural: 'rc_frame', defaultMep: 'high', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'residential', label: 'Residential Tower', icon: '🏢',
    description: 'Apartments, condos, residential complexes',
    defaultFloors: 20, defaultBasements: 1, defaultZonesPerFloor: 3, defaultStructuralZonesPerFloor: 1, defaultSubstructureZones: 3,
    defaultFloorArea: 1000, defaultStructural: 'rc_frame', defaultMep: 'low', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'commercial', label: 'Commercial Office', icon: '🏛️',
    description: 'Office towers, business parks, co-working spaces',
    defaultFloors: 15, defaultBasements: 1, defaultZonesPerFloor: 4, defaultStructuralZonesPerFloor: 1, defaultSubstructureZones: 4,
    defaultFloorArea: 1500, defaultStructural: 'steel_frame', defaultMep: 'medium', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'industrial', label: 'Industrial / Factory', icon: '🏭',
    description: 'Factories, warehouses, logistics centers',
    defaultFloors: 1, defaultBasements: 0, defaultZonesPerFloor: 4, defaultStructuralZonesPerFloor: 2, defaultSubstructureZones: 4,
    defaultFloorArea: 5000, defaultStructural: 'steel_frame', defaultMep: 'low', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'infrastructure', label: 'Infrastructure', icon: '🌉',
    description: 'Roads, bridges, tunnels, utilities',
    defaultFloors: 0, defaultBasements: 0, defaultZonesPerFloor: 3, defaultStructuralZonesPerFloor: 1, defaultSubstructureZones: 3,
    defaultFloorArea: 0, defaultStructural: 'rc_frame', defaultMep: 'low', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'educational', label: 'Educational', icon: '🎓',
    description: 'Schools, universities, training facilities',
    defaultFloors: 4, defaultBasements: 1, defaultZonesPerFloor: 3, defaultStructuralZonesPerFloor: 1, defaultSubstructureZones: 3,
    defaultFloorArea: 2000, defaultStructural: 'rc_frame', defaultMep: 'medium', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'mixed_use', label: 'Mixed Use', icon: '🏙️',
    description: 'Mixed residential, retail, and office',
    defaultFloors: 25, defaultBasements: 2, defaultZonesPerFloor: 4, defaultStructuralZonesPerFloor: 1, defaultSubstructureZones: 4,
    defaultFloorArea: 1500, defaultStructural: 'rc_frame', defaultMep: 'medium', defaultFlowDirection: 'bottom_up',
  },
  {
    value: 'data_center', label: 'Data Center', icon: '🖥️',
    description: 'Server halls, power rooms, cooling systems',
    defaultFloors: 2, defaultBasements: 0, defaultZonesPerFloor: 4, defaultStructuralZonesPerFloor: 2, defaultSubstructureZones: 4,
    defaultFloorArea: 3000, defaultStructural: 'steel_frame', defaultMep: 'critical', defaultFlowDirection: 'bottom_up',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// Project Phases — fundamentally changes takt approach
// ══════════════════════════════════════════════════════════════════════════════

export interface ProjectPhaseOption {
  value: string;
  label: string;
  icon: string;
  description: string;
}

export const PROJECT_PHASES: ProjectPhaseOption[] = [
  { value: 'new_build', label: 'New Build', icon: '🏗️', description: 'New construction from foundations — full takt train' },
  { value: 'renovation', label: 'Renovation', icon: '🔨', description: 'Major renovation of existing structure — phased takt with occupancy constraints' },
  { value: 'fit_out', label: 'Interior Fit-out', icon: '🎨', description: 'Interior finishing of shell & core — shorter trade sequence, faster takt' },
  { value: 'expansion', label: 'Expansion', icon: '📐', description: 'Addition to existing structure — interface management critical' },
];

// ══════════════════════════════════════════════════════════════════════════════
// Structural Systems — determines trade sequence and structural takt time
// ══════════════════════════════════════════════════════════════════════════════

export interface StructuralSystemOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  taktMultiplier: number; // relative to RC frame baseline
}

export const STRUCTURAL_SYSTEMS: StructuralSystemOption[] = [
  { value: 'rc_frame', label: 'RC Frame', icon: '🏗️', description: 'Reinforced concrete columns, beams & slabs — most common', taktMultiplier: 1.0 },
  { value: 'steel_frame', label: 'Steel Frame', icon: '⚙️', description: 'Structural steel with metal deck — faster erection, MEP-friendly', taktMultiplier: 0.8 },
  { value: 'precast', label: 'Precast Concrete', icon: '🧱', description: 'Factory-produced elements assembled on-site — fast, consistent', taktMultiplier: 0.7 },
  { value: 'hybrid', label: 'Hybrid', icon: '🔀', description: 'Mixed systems (e.g., RC core + steel floors) — flexible', taktMultiplier: 0.9 },
  { value: 'timber', label: 'Mass Timber / CLT', icon: '🪵', description: 'Cross-laminated timber — lightweight, sustainable, fast', taktMultiplier: 0.75 },
  { value: 'masonry', label: 'Load-bearing Masonry', icon: '🧱', description: 'Brick/block bearing walls — traditional, slower cycle', taktMultiplier: 1.1 },
];

// ══════════════════════════════════════════════════════════════════════════════
// MEP Complexity — the biggest takt time multiplier after zone area
// ══════════════════════════════════════════════════════════════════════════════

export interface MepComplexityOption {
  value: string;
  label: string;
  description: string;
  color: string;
  taktMultiplier: number;
}

export const MEP_COMPLEXITY_LEVELS: MepComplexityOption[] = [
  { value: 'low', label: 'Low', description: 'Residential, basic HVAC, standard electrical', color: '#10B981', taktMultiplier: 0.8 },
  { value: 'medium', label: 'Medium', description: 'Office/hotel — moderate HVAC, fire protection, BMS', color: '#3B82F6', taktMultiplier: 1.0 },
  { value: 'high', label: 'High', description: 'Hospital/lab — complex MEP, medical gas, clean rooms', color: '#F59E0B', taktMultiplier: 1.3 },
  { value: 'critical', label: 'Critical', description: 'Data center/semiconductor — extreme cooling, redundant power', color: '#EF4444', taktMultiplier: 1.5 },
];

// ══════════════════════════════════════════════════════════════════════════════
// Flow Direction — critical for takt train scheduling strategy
// ══════════════════════════════════════════════════════════════════════════════

export interface FlowDirectionOption {
  value: string;
  label: string;
  description: string;
}

export const FLOW_DIRECTIONS: FlowDirectionOption[] = [
  { value: 'bottom_up', label: 'Bottom → Up', description: 'Start from lower floors, work upward (standard for new build)' },
  { value: 'top_down', label: 'Top → Down', description: 'Start from top, work downward (curtain wall, renovation, weather-driven)' },
];

// ══════════════════════════════════════════════════════════════════════════════
// Delivery Method — project organizational structure and risk allocation
// International + Local (Turkish) models
// ══════════════════════════════════════════════════════════════════════════════

export interface DeliveryMethodOption {
  value: string;
  label: string;
  labelTR?: string;       // Turkish label for local models
  description: string;
  icon: string;
  category: 'international' | 'local';
}

export const DELIVERY_METHODS: DeliveryMethodOption[] = [
  // International models
  { value: 'dbb', label: 'Design-Bid-Build (DBB)', icon: '📋', category: 'international',
    description: 'Traditional — separate design and construction contracts. Client manages design, then bids construction.' },
  { value: 'design_build', label: 'Design-Build (DB)', icon: '🏗️', category: 'international',
    description: 'Single entity responsible for both design and construction. Single point of accountability.' },
  { value: 'cm_at_risk', label: 'CM at Risk (CMAR)', icon: '🤝', category: 'international',
    description: 'Construction Manager provides GMP, manages subcontractors. Early involvement in design.' },
  { value: 'ipd', label: 'Integrated Project Delivery (IPD)', icon: '🔗', category: 'international',
    description: 'Multi-party agreement — shared risk/reward, collaborative decision-making, BIM-centric.' },
  { value: 'epc', label: 'EPC / Turnkey', icon: '🔑', category: 'international',
    description: 'Engineering, Procurement, Construction — full turnkey. Contractor handles everything.' },
  // Local / Turkish models
  { value: 'kat_karsiligi', label: 'Build-Share (Kat Karşılığı)', labelTR: 'Kat Karşılığı', icon: '🏘️', category: 'local',
    description: 'Land-for-flats exchange — landowner provides land, contractor builds and shares units. No cash payment.' },
  { value: 'hasilat_paylasimi', label: 'Revenue Sharing (Hasılat Paylaşımı)', labelTR: 'Hasılat Paylaşımı', icon: '💰', category: 'local',
    description: 'Revenue split model — contractor builds, units are sold, revenue is divided by agreed percentage.' },
  { value: 'bot', label: 'Build-Operate-Transfer (BOT)', labelTR: 'Yap-İşlet-Devret', icon: '🔄', category: 'local',
    description: 'Contractor builds and operates for concession period, then transfers to the public authority.' },
  { value: 'blt', label: 'Build-Lease-Transfer (BLT)', labelTR: 'Yap-Kirala-Devret', icon: '📑', category: 'local',
    description: 'Contractor builds, leases to authority for agreed period, then transfers ownership.' },
  { value: 'emanet', label: 'Cost Plus (Emanet)', labelTR: 'Emanet Usulü', icon: '📊', category: 'local',
    description: 'Client reimburses actual costs plus management fee. Client bears full cost risk, maximum transparency.' },
];

// ══════════════════════════════════════════════════════════════════════════════
// Contract Pricing Model — how the contractor gets paid
// Separate from delivery method: a DBB project can use unit price or lump sum
// ══════════════════════════════════════════════════════════════════════════════

export interface ContractPricingModelOption {
  value: string;
  label: string;
  labelTR?: string;
  description: string;
  icon: string;
  // Module behavior implications
  progressMeasurement: 'quantity' | 'milestone' | 'unit_completion' | 'revenue';
  costTracking: 'boq_measured' | 'fixed_budget' | 'actual_cost' | 'unit_based' | 'revenue_based';
  paymentStructure: 'hakedis' | 'milestone' | 'cost_plus_fee' | 'unit_handover' | 'revenue_split';
}

export const CONTRACT_PRICING_MODELS: ContractPricingModelOption[] = [
  {
    value: 'unit_price', label: 'Unit Price (Birim Fiyat)', labelTR: 'Birim Fiyat', icon: '📐',
    description: 'Pay per measured quantity (m², m³, kg, ml). BOQ-based measurement. Monthly progress certificates (hakediş).',
    progressMeasurement: 'quantity', costTracking: 'boq_measured', paymentStructure: 'hakedis',
  },
  {
    value: 'lump_sum', label: 'Lump Sum (Götürü Bedel)', labelTR: 'Götürü Bedel', icon: '💎',
    description: 'Fixed total price for defined scope. Contractor bears quantity risk. Payment by milestones or % completion.',
    progressMeasurement: 'milestone', costTracking: 'fixed_budget', paymentStructure: 'milestone',
  },
  {
    value: 'cost_plus', label: 'Cost Plus (Maliyet + Kar)', labelTR: 'Maliyet + Kar', icon: '📊',
    description: 'Reimburse actual costs + agreed fee/percentage. Maximum transparency, client bears cost risk.',
    progressMeasurement: 'quantity', costTracking: 'actual_cost', paymentStructure: 'cost_plus_fee',
  },
  {
    value: 'gmp', label: 'Guaranteed Maximum Price (GMP)', icon: '🎯',
    description: 'Cost-plus with a ceiling. Savings shared between contractor and client. Common with CM at Risk.',
    progressMeasurement: 'quantity', costTracking: 'actual_cost', paymentStructure: 'cost_plus_fee',
  },
  {
    value: 'build_share', label: 'Unit Exchange (Kat Karşılığı)', labelTR: 'Kat Karşılığı', icon: '🏘️',
    description: 'No cash payment — contractor receives agreed number of units (apartments). Cost tracked per unit built.',
    progressMeasurement: 'unit_completion', costTracking: 'unit_based', paymentStructure: 'unit_handover',
  },
  {
    value: 'revenue_share', label: 'Revenue Share (Hasılat Paylaşımı)', labelTR: 'Hasılat Paylaşımı', icon: '💰',
    description: 'Revenue from sales divided by agreed percentage. Construction pace may follow sales velocity.',
    progressMeasurement: 'revenue', costTracking: 'revenue_based', paymentStructure: 'revenue_split',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// Site Conditions — affects logistics, buffers, and constraint categories
// ══════════════════════════════════════════════════════════════════════════════

export interface SiteConditionOption {
  value: string;
  label: string;
  description: string;
  bufferMultiplier: number; // affects recommended buffer size
}

export const SITE_CONDITIONS: SiteConditionOption[] = [
  { value: 'urban', label: 'Urban / City Center', description: 'Limited laydown, noise/traffic restrictions, tight logistics', bufferMultiplier: 1.5 },
  { value: 'suburban', label: 'Suburban', description: 'Good access, moderate restrictions, standard logistics', bufferMultiplier: 1.0 },
  { value: 'rural', label: 'Rural / Greenfield', description: 'Open site, minimal restrictions, ample storage', bufferMultiplier: 0.8 },
  { value: 'remote', label: 'Remote / Camp-based', description: 'Limited infrastructure, camp-based workforce, long supply chains', bufferMultiplier: 2.0 },
];

// ══════════════════════════════════════════════════════════════════════════════
// Foundation Types — OmniClass 21-01 10 Foundations (Substructure)
// Determines substructure takt plan, zone layout, and duration
// ══════════════════════════════════════════════════════════════════════════════

export interface FoundationTypeOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  taktMultiplier: number;    // relative to pad foundation baseline
  typicalDuration: string;   // indicative duration description
}

export const FOUNDATION_TYPES: FoundationTypeOption[] = [
  {
    value: 'pad', label: 'Pad / Isolated Footing', icon: '⬜',
    description: 'Individual footings under columns — simplest, fastest for low-rise',
    taktMultiplier: 0.7, typicalDuration: '2-4 weeks',
  },
  {
    value: 'strip', label: 'Strip Foundation', icon: '▬',
    description: 'Continuous strip under load-bearing walls — common for masonry structures',
    taktMultiplier: 0.8, typicalDuration: '3-5 weeks',
  },
  {
    value: 'raft', label: 'Raft / Mat Foundation', icon: '⬛',
    description: 'Continuous slab covering full footprint — uniform settlement, high water table',
    taktMultiplier: 1.0, typicalDuration: '4-8 weeks',
  },
  {
    value: 'piled', label: 'Piled Foundation', icon: '📍',
    description: 'Deep piles to bedrock or bearing stratum — soft ground, heavy loads',
    taktMultiplier: 1.5, typicalDuration: '6-16 weeks',
  },
  {
    value: 'combined', label: 'Piled Raft', icon: '🔲',
    description: 'Raft slab on piles — high-rise, differential settlement control',
    taktMultiplier: 1.8, typicalDuration: '8-20 weeks',
  },
  {
    value: 'caisson', label: 'Caisson / Drilled Shaft', icon: '🕳️',
    description: 'Large-diameter deep foundations — bridge piers, heavy point loads',
    taktMultiplier: 2.0, typicalDuration: '10-24 weeks',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// Ground Conditions — affects substructure approach, dewatering, soil treatment
// ══════════════════════════════════════════════════════════════════════════════

export interface GroundConditionOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  taktMultiplier: number;  // affects substructure duration
}

export const GROUND_CONDITIONS: GroundConditionOption[] = [
  {
    value: 'normal', label: 'Normal / Stable', icon: '🟢',
    description: 'Adequate bearing capacity, no special measures needed',
    taktMultiplier: 1.0,
  },
  {
    value: 'high_water_table', label: 'High Water Table', icon: '💧',
    description: 'Water table within excavation depth — dewatering required',
    taktMultiplier: 1.4,
  },
  {
    value: 'soft_soil', label: 'Soft / Compressible Soil', icon: '🟤',
    description: 'Clay, silt, peat — settlement risk, ground improvement likely needed',
    taktMultiplier: 1.5,
  },
  {
    value: 'rock', label: 'Rock / Hard Ground', icon: '🪨',
    description: 'Shallow bedrock — strong bearing but excavation requires rock-breaking',
    taktMultiplier: 1.3,
  },
  {
    value: 'contaminated', label: 'Contaminated / Brownfield', icon: '⚠️',
    description: 'Soil contamination requiring remediation — environmental constraints',
    taktMultiplier: 1.6,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// Ground Improvement Methods — techniques to improve bearing capacity or control water
// ══════════════════════════════════════════════════════════════════════════════

export interface GroundImprovementOption {
  value: string;
  label: string;
  icon: string;
  description: string;
}

export const GROUND_IMPROVEMENTS: GroundImprovementOption[] = [
  { value: 'dewatering', label: 'Dewatering', icon: '💧', description: 'Wellpoints or deep wells to lower water table during excavation' },
  { value: 'soil_stabilization', label: 'Soil Stabilization', icon: '🧪', description: 'Cement/lime mixing, jet grouting, or compaction grouting' },
  { value: 'ground_anchors', label: 'Ground Anchors', icon: '⚓', description: 'Anchored retaining walls for deep excavation stability' },
  { value: 'sheet_piling', label: 'Sheet Piling', icon: '🛡️', description: 'Steel sheet piles for excavation support and water cutoff' },
  { value: 'vibro_compaction', label: 'Vibro Compaction', icon: '📳', description: 'Densification of granular soils via vibratory probes' },
  { value: 'stone_columns', label: 'Stone Columns', icon: '🪨', description: 'Gravel columns to improve bearing and accelerate drainage' },
  { value: 'soil_nailing', label: 'Soil Nailing', icon: '📌', description: 'Reinforced soil slope or excavation face using steel nails' },
  { value: 'diaphragm_wall', label: 'Diaphragm Wall', icon: '🧱', description: 'Cast in-situ concrete wall for deep basements and water cutoff' },
];

// ══════════════════════════════════════════════════════════════════════════════
// Module Behavior Config — how contract pricing model affects each module
// Used by CostPilot, SupplyChain, TaktFlow, ClaimShield, CrewFlow, etc.
// ══════════════════════════════════════════════════════════════════════════════

export interface ModuleBehaviorConfig {
  // CostPilot behavior
  costPilot: {
    evmEnabled: boolean;             // EVM (PV/EV/AC) applicable?
    sCurveType: 'cost' | 'milestone' | 'unit' | 'revenue';
    progressMethod: string;          // how progress is measured
    paymentLabel: string;            // what payment documents are called
  };
  // SupplyChain behavior
  supplyChain: {
    materialProcurement: 'contractor' | 'mixed' | 'subcontractor';
    mrpEnabled: boolean;
  };
  // ClaimShield behavior
  claimShield: {
    changeOrderType: string;         // what changes look like
    claimBasis: string;              // basis for claims
  };
  // TaktFlow behavior
  taktFlow: {
    progressUnit: string;            // m², %, unit, revenue
  };
}

export function getModuleBehavior(pricingModel: string): ModuleBehaviorConfig {
  switch (pricingModel) {
    case 'unit_price':
      return {
        costPilot: { evmEnabled: true, sCurveType: 'cost', progressMethod: 'BOQ measured quantities (m², m³, kg)', paymentLabel: 'Hakediş' },
        supplyChain: { materialProcurement: 'mixed', mrpEnabled: true },
        claimShield: { changeOrderType: 'Unit price adjustment / new items', claimBasis: 'Quantity variance + new rates' },
        taktFlow: { progressUnit: 'Measured quantity' },
      };
    case 'lump_sum':
      return {
        costPilot: { evmEnabled: true, sCurveType: 'milestone', progressMethod: 'Milestone completion percentage', paymentLabel: 'Milestone Payment' },
        supplyChain: { materialProcurement: 'subcontractor', mrpEnabled: false },
        claimShield: { changeOrderType: 'Scope variation order', claimBasis: 'Scope change + schedule impact' },
        taktFlow: { progressUnit: 'Milestone %' },
      };
    case 'cost_plus':
    case 'gmp':
      return {
        costPilot: { evmEnabled: true, sCurveType: 'cost', progressMethod: 'Actual cost tracking + quantity verification', paymentLabel: 'Cost Reimbursement' },
        supplyChain: { materialProcurement: 'contractor', mrpEnabled: true },
        claimShield: { changeOrderType: 'Scope directive / cost adjustment', claimBasis: 'Cost substantiation + fee adjustment' },
        taktFlow: { progressUnit: 'Measured quantity' },
      };
    case 'build_share':
      return {
        costPilot: { evmEnabled: false, sCurveType: 'unit', progressMethod: 'Unit (apartment/daire) completion tracking', paymentLabel: 'Unit Handover' },
        supplyChain: { materialProcurement: 'contractor', mrpEnabled: true },
        claimShield: { changeOrderType: 'Unit allocation change / specification change', claimBasis: 'Unit count agreement + area disputes' },
        taktFlow: { progressUnit: 'Unit completion' },
      };
    case 'revenue_share':
      return {
        costPilot: { evmEnabled: false, sCurveType: 'revenue', progressMethod: 'Revenue realization + construction progress', paymentLabel: 'Revenue Distribution' },
        supplyChain: { materialProcurement: 'contractor', mrpEnabled: true },
        claimShield: { changeOrderType: 'Revenue share percentage adjustment', claimBasis: 'Market conditions + cost overrun disputes' },
        taktFlow: { progressUnit: 'Revenue + physical %' },
      };
    default:
      return {
        costPilot: { evmEnabled: true, sCurveType: 'cost', progressMethod: 'Standard progress tracking', paymentLabel: 'Payment Certificate' },
        supplyChain: { materialProcurement: 'mixed', mrpEnabled: true },
        claimShield: { changeOrderType: 'Change order', claimBasis: 'Contract variation' },
        taktFlow: { progressUnit: 'Percentage' },
      };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Disciplines & defaults
// ══════════════════════════════════════════════════════════════════════════════

export const DISCIPLINES = [
  { value: 'structural', label: 'Structural', color: '#6366F1' },
  { value: 'mechanical', label: 'Mechanical', color: '#06B6D4' },
  { value: 'electrical', label: 'Electrical', color: '#F59E0B' },
  { value: 'architectural', label: 'Architectural', color: '#EC4899' },
  { value: 'landscape', label: 'Landscape', color: '#16A34A' },
  { value: 'general', label: 'General', color: '#6B7280' },
];

export const DEFAULT_WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

// ══════════════════════════════════════════════════════════════════════════════
// Takt Recommendation Engine
// Based on Takt Time Planning (TTP) methodology:
//   Zone Area × MEP Complexity × Structural System = Recommended Takt
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate recommended takt time based on project parameters.
 * Formula: baseTakt × structuralMultiplier × mepMultiplier × areaFactor
 *
 * Reference: 400m² zone area, RC frame, medium MEP = 5 day takt
 */
export function calculateRecommendedTakt(state: SetupState): {
  recommended: number;
  range: [number, number];
  reasoning: string;
} {
  const buildingType = BUILDING_TYPES.find((b) => b.value === state.buildingType);
  const structural = STRUCTURAL_SYSTEMS.find((s) => s.value === state.structuralSystem);
  const mep = MEP_COMPLEXITY_LEVELS.find((m) => m.value === state.mepComplexity);
  const site = SITE_CONDITIONS.find((s) => s.value === state.siteCondition);

  // Base takt from building type (default 5 days)
  const baseTakt = state.buildingType === 'industrial' || state.buildingType === 'infrastructure' ? 7 : 5;

  // Structural system multiplier (Steel is faster, Masonry is slower)
  const structMultiplier = structural?.taktMultiplier ?? 1.0;

  // MEP complexity multiplier (Hospital 1.3x, Data Center 1.5x)
  const mepMultiplier = mep?.taktMultiplier ?? 1.0;

  // Area factor: zone area relative to 400m² reference
  const zoneArea = state.typicalFloorArea > 0 && state.zonesPerFloor > 0
    ? state.typicalFloorArea / state.zonesPerFloor
    : 400; // default reference
  const areaFactor = Math.max(0.6, Math.min(2.0, zoneArea / 400));

  // Phase adjustment: fit-out is faster, renovation needs more buffer
  const phaseMultiplier = state.projectPhase === 'fit_out' ? 0.7
    : state.projectPhase === 'renovation' ? 1.2
    : 1.0;

  const raw = baseTakt * structMultiplier * mepMultiplier * areaFactor * phaseMultiplier;
  const recommended = Math.max(2, Math.min(14, Math.round(raw)));
  const rangeLow = Math.max(1, recommended - 1);
  const rangeHigh = Math.min(14, recommended + 2);

  // Build reasoning
  const parts: string[] = [];
  if (buildingType) parts.push(`${buildingType.label} base: ${baseTakt}d`);
  if (structural && structural.taktMultiplier !== 1.0) parts.push(`${structural.label}: ×${structural.taktMultiplier}`);
  if (mep && mep.taktMultiplier !== 1.0) parts.push(`MEP ${mep.label}: ×${mep.taktMultiplier}`);
  if (areaFactor !== 1.0) parts.push(`Zone ${Math.round(zoneArea)}m²: ×${areaFactor.toFixed(1)}`);
  if (phaseMultiplier !== 1.0) parts.push(`${state.projectPhase === 'fit_out' ? 'Fit-out' : 'Renovation'}: ×${phaseMultiplier}`);

  return {
    recommended,
    range: [rangeLow, rangeHigh],
    reasoning: parts.length > 0 ? parts.join(' → ') : 'Default calculation',
  };
}

/**
 * Calculate recommended buffer size based on MEP complexity and site conditions.
 */
export function calculateRecommendedBuffer(state: SetupState): number {
  const mep = MEP_COMPLEXITY_LEVELS.find((m) => m.value === state.mepComplexity);
  const site = SITE_CONDITIONS.find((s) => s.value === state.siteCondition);

  const mepBuffer = state.mepComplexity === 'critical' ? 2
    : state.mepComplexity === 'high' ? 2
    : 1;
  const siteMultiplier = site?.bufferMultiplier ?? 1.0;

  return Math.max(1, Math.min(5, Math.round(mepBuffer * siteMultiplier)));
}

// ══════════════════════════════════════════════════════════════════════════════
// Validation — each step must pass before proceeding
// ══════════════════════════════════════════════════════════════════════════════

export function getStepValidation(
  stepId: string,
  state: SetupState,
): { valid: boolean; message: string } {
  switch (stepId) {
    case 'info':
      if (!state.projectName || !state.projectName.trim()) {
        return { valid: false, message: 'Enter a project name to continue.' };
      }
      if (!state.projectCode || !state.projectCode.trim()) {
        return { valid: false, message: 'Enter a project code to continue.' };
      }
      return { valid: true, message: '' };
    case 'classification':
      if (!state.classificationStandard) {
        return { valid: false, message: 'Select a classification standard to continue.' };
      }
      if (!state.buildingType) {
        return { valid: false, message: 'Select a building type to continue.' };
      }
      if (!state.projectPhase) {
        return { valid: false, message: 'Select a project phase to continue.' };
      }
      return { valid: true, message: '' };
    case 'scope':
      if (!state.structuralSystem) {
        return { valid: false, message: 'Select a structural system to continue.' };
      }
      if (!state.mepComplexity) {
        return { valid: false, message: 'Select MEP complexity level to continue.' };
      }
      if (state.buildingType !== 'infrastructure' && state.floorCount < 1) {
        return { valid: false, message: 'Set at least 1 floor (above ground) to continue.' };
      }
      return { valid: true, message: '' };
    case 'drawings':
      return { valid: true, message: '' };
    case 'boq':
      return { valid: true, message: '' };
    case 'wbs':
      return {
        valid: state.wbsGenerated && state.wbsNodeCount > 0,
        message:
          state.classificationStandard === 'custom'
            ? 'Custom WBS is not yet supported in setup. Select a standard first.'
            : 'Click "Generate WBS" to create the work breakdown structure.',
      };
    case 'cbs':
      return {
        valid: state.cbsGenerated && state.cbsNodeCount > 0,
        message: !state.wbsGenerated
          ? 'Generate WBS first (previous step), then generate CBS.'
          : 'Click "Generate CBS" to create the cost breakdown structure.',
      };
    case 'lbs':
      return {
        valid: state.lbsConfigured && state.zoneCount > 0,
        message: 'Click "Apply Template" to create the location hierarchy with takt zones.',
      };
    case 'trades':
      return {
        valid: state.tradeCount > 0,
        message: 'Select trades and click "Apply Trades" before proceeding.',
      };
    case 'takt':
      return {
        valid: state.taktPlanGenerated,
        message: 'Click "Save Takt Configuration" before proceeding.',
      };
    case 'review':
      return { valid: true, message: '' };
    default:
      return { valid: true, message: '' };
  }
}

export function getMissingRequiredSteps(state: SetupState): string[] {
  const missing: string[] = [];
  for (const step of SETUP_STEPS) {
    if (isStepOptional(step.id) || step.id === 'review') continue;
    const { valid } = getStepValidation(step.id, state);
    if (!valid) missing.push(step.label);
  }
  return missing;
}
