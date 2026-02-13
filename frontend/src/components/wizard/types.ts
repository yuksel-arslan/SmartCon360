import type { LocationTemplate, TradeTemplate } from '@/lib/core/project-templates';

export interface WizardData {
  // Step 1 — Project Type
  projectType: string;

  // Step 2 — Basic Info
  name: string;
  code: string;
  description: string;
  plannedStart: string;
  plannedFinish: string;
  address: string;
  city: string;
  country: string;
  budget: string;
  currency: string;

  // Step 3 — LBS (from template)
  locations: LocationTemplate[];

  // Step 4 — Trades (from template, togglable)
  trades: (TradeTemplate & { enabled: boolean })[];

  // Step 5 — Takt Config
  defaultTaktTime: number;
  bufferSize: number;
  workingDays: string[];
}

export interface StepProps {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

export const WIZARD_STEPS = [
  { id: 'type', label: 'Project Type' },
  { id: 'info', label: 'Basic Info' },
  { id: 'lbs', label: 'Locations' },
  { id: 'trades', label: 'Trades' },
  { id: 'takt', label: 'Takt Config' },
  { id: 'review', label: 'Review' },
] as const;

export const DEFAULT_WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
