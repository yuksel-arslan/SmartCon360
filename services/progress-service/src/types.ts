// ── Types ───────────────────────────────────────────────

export interface ProgressUpdate {
  id: string;
  projectId: string;
  assignmentId: string;
  zoneId: string;
  tradeId: string;
  reportedBy: string;
  percentComplete: number;
  previousPercent: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'blocked';
  notes: string | null;
  photoUrls: string[];
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyCommitment {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  tradeId: string;
  tradeName: string;
  zoneId: string;
  zoneName: string;
  description: string;
  committed: boolean;
  completed: boolean;
  varianceReason: string | null;
  varianceCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TradeBreakdown {
  tradeId: string;
  tradeName: string;
  committed: number;
  completed: number;
  ppc: number;
}

export interface VarianceReasonEntry {
  reason: string;
  category: string;
  count: number;
}

export interface PPCRecord {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  totalCommitted: number;
  totalCompleted: number;
  ppcPercent: number;
  byTrade: TradeBreakdown[];
  topVarianceReasons: VarianceReasonEntry[];
  createdAt: string;
}

export interface DailyLog {
  id: string;
  projectId: string;
  date: string;
  weather: string | null;
  temperature: number | null;
  crewCount: number | null;
  notes: string | null;
  issues: { description: string; severity: string }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
