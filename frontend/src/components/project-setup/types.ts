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

export const DISCIPLINES = [
  { value: 'structural', label: 'Structural', color: '#6366F1' },
  { value: 'mechanical', label: 'Mechanical', color: '#06B6D4' },
  { value: 'electrical', label: 'Electrical', color: '#F59E0B' },
  { value: 'architectural', label: 'Architectural', color: '#EC4899' },
  { value: 'landscape', label: 'Landscape', color: '#16A34A' },
  { value: 'general', label: 'General', color: '#6B7280' },
];

export const DEFAULT_WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
