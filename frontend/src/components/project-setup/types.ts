export interface SetupState {
  currentStep: string;
  completedSteps: string[];
  classificationStandard: string;
  boqUploaded: boolean;
  boqFileName: string | null;
  boqItemCount: number;
  drawingCount: number;
  wbsGenerated: boolean;
  wbsNodeCount: number;
  cbsGenerated: boolean;
  cbsNodeCount: number;
  taktPlanGenerated: boolean;
  projectType: string;
  currency: string;
  projectName: string;
  // Building config (set in Classification step)
  buildingType: string;
  floorCount: number;
  basementCount: number;
  zonesPerFloor: number;
  // LBS
  locationCount: number;
  zoneCount: number;
  lbsConfigured: boolean;
  // Takt Config
  defaultTaktTime: number;
  bufferSize: number;
  workingDays: string[];
  tradeCount: number;
}

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

export interface SubTradeTemplate {
  name: string;
  code: string;
  color: string;
  discipline: string;
  defaultCrewSize: number;
  durationMultiplier: number;
  predecessorCodes: string[];
  sortOrder: number;
}

export const SETUP_STEPS: SetupStepDef[] = [
  { id: 'classification', label: 'Classification', description: 'Select WBS/CBS standard' },
  { id: 'drawings', label: 'Drawings', description: 'Upload project drawings' },
  { id: 'boq', label: 'BOQ', description: 'Bill of Quantities' },
  { id: 'wbs', label: 'WBS', description: 'Work Breakdown Structure' },
  { id: 'cbs', label: 'CBS', description: 'Cost Breakdown Structure' },
  { id: 'lbs', label: 'LBS', description: 'Location Breakdown Structure' },
  { id: 'trades', label: 'Trades', description: 'Discipline trades' },
  { id: 'takt', label: 'Takt Config', description: 'Takt time & schedule rhythm' },
  { id: 'review', label: 'Review', description: 'Finalize setup' },
];

// Steps that can be skipped without completing
const OPTIONAL_STEPS = new Set(['drawings', 'boq']);

export function isStepOptional(stepId: string): boolean {
  return OPTIONAL_STEPS.has(stepId);
}

/**
 * Check whether a step's requirements are met based on current setup state.
 * Returns { valid, message } — if not valid, message explains what's missing.
 */
export function getStepValidation(
  stepId: string,
  state: SetupState,
): { valid: boolean; message: string } {
  switch (stepId) {
    case 'classification':
      if (!state.classificationStandard) {
        return { valid: false, message: 'Select a classification standard to continue.' };
      }
      if (!state.buildingType) {
        return { valid: false, message: 'Select a building type to continue.' };
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

/**
 * Returns list of required steps that are NOT yet completed in state.
 */
export function getMissingRequiredSteps(state: SetupState): string[] {
  const missing: string[] = [];
  for (const step of SETUP_STEPS) {
    if (isStepOptional(step.id) || step.id === 'review') continue;
    const { valid } = getStepValidation(step.id, state);
    if (!valid) missing.push(step.label);
  }
  return missing;
}

// ── Building Types for Classification step ──

export interface BuildingTypeOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  defaultFloors: number;
  defaultBasements: number;
  defaultZonesPerFloor: number;
}

export const BUILDING_TYPES: BuildingTypeOption[] = [
  { value: 'hotel', label: 'Hotel / Resort', icon: '🏨', description: 'Guest rooms, lobbies, restaurants, back-of-house', defaultFloors: 10, defaultBasements: 1, defaultZonesPerFloor: 3 },
  { value: 'hospital', label: 'Hospital / Healthcare', icon: '🏥', description: 'Patient rooms, OR suites, emergency, diagnostics', defaultFloors: 6, defaultBasements: 1, defaultZonesPerFloor: 4 },
  { value: 'residential', label: 'Residential Tower', icon: '🏢', description: 'Apartments, condos, residential complexes', defaultFloors: 20, defaultBasements: 1, defaultZonesPerFloor: 3 },
  { value: 'commercial', label: 'Commercial Office', icon: '🏛️', description: 'Office towers, business parks, co-working spaces', defaultFloors: 15, defaultBasements: 1, defaultZonesPerFloor: 4 },
  { value: 'industrial', label: 'Industrial / Factory', icon: '🏭', description: 'Factories, warehouses, logistics centers', defaultFloors: 1, defaultBasements: 0, defaultZonesPerFloor: 4 },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🌉', description: 'Roads, bridges, tunnels, utilities', defaultFloors: 0, defaultBasements: 0, defaultZonesPerFloor: 3 },
  { value: 'educational', label: 'Educational', icon: '🎓', description: 'Schools, universities, training facilities', defaultFloors: 4, defaultBasements: 1, defaultZonesPerFloor: 3 },
  { value: 'mixed_use', label: 'Mixed Use', icon: '🏙️', description: 'Mixed residential, retail, and office', defaultFloors: 25, defaultBasements: 2, defaultZonesPerFloor: 4 },
  { value: 'data_center', label: 'Data Center', icon: '🖥️', description: 'Server halls, power rooms, cooling systems', defaultFloors: 2, defaultBasements: 0, defaultZonesPerFloor: 4 },
];

export const DISCIPLINES = [
  { value: 'structural', label: 'Structural', color: '#6366F1' },
  { value: 'mechanical', label: 'Mechanical', color: '#06B6D4' },
  { value: 'electrical', label: 'Electrical', color: '#F59E0B' },
  { value: 'architectural', label: 'Architectural', color: '#EC4899' },
  { value: 'landscape', label: 'Landscape', color: '#16A34A' },
  { value: 'general', label: 'General', color: '#6B7280' },
];

export const DEFAULT_WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
