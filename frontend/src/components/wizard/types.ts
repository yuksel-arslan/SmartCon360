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
}

export interface StepProps {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

export const WIZARD_STEPS = [
  { id: 'type', label: 'Project Type' },
  { id: 'info', label: 'Basic Info' },
  { id: 'review', label: 'Review' },
] as const;
