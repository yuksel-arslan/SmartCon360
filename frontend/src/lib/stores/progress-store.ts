/* In-memory progress data store — Phase 2 */

import { v4 as uuidv4 } from 'uuid';

export interface ProgressUpdate {
  id: string;
  projectId: string;
  assignmentId: string;
  zoneId: string;
  tradeId: string;
  reportedBy: string;
  percentComplete: number;
  previousPercent: number;
  status: string;
  notes?: string;
  reportedAt: string;
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
  varianceReason?: string;
  varianceCategory?: string;
}

export interface PPCRecord {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  totalCommitted: number;
  totalCompleted: number;
  ppcPercent: number;
  byTrade: { tradeId: string; tradeName: string; committed: number; completed: number; ppc: number }[];
  topVarianceReasons: { reason: string; category: string; count: number }[];
}

// ── In-Memory Stores ──
const progressUpdates: Map<string, ProgressUpdate[]> = new Map();
const weeklyCommitments: Map<string, WeeklyCommitment[]> = new Map();
const ppcRecords: Map<string, PPCRecord[]> = new Map();

// ── Initialize Demo Data ──
const DEMO_PROJECT_ID = 'demo-project-001';

function initDemoData() {
  // PPC History (12 weeks)
  const ppcHistory: PPCRecord[] = [];
  const ppcValues = [62, 68, 71, 74, 78, 80, 82, 85, 87, 89, 91, 93];
  const trades = [
    { id: 't1', name: 'Structure' },
    { id: 't2', name: 'MEP Rough-in' },
    { id: 't3', name: 'Drywall' },
    { id: 't4', name: 'MEP Finish' },
    { id: 't5', name: 'Painting' },
    { id: 't6', name: 'Flooring' },
    { id: 't7', name: 'Final Fix' },
  ];

  for (let w = 0; w < 12; w++) {
    const weekStart = new Date(2026, 0, 5 + w * 7);
    const weekEnd = new Date(2026, 0, 9 + w * 7);
    const ppc = ppcValues[w];
    const committed = 28;
    const completed = Math.round((ppc / 100) * committed);

    ppcHistory.push({
      id: uuidv4(),
      projectId: DEMO_PROJECT_ID,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalCommitted: committed,
      totalCompleted: completed,
      ppcPercent: ppc,
      byTrade: trades.map((t) => {
        const tc = Math.round(committed / trades.length);
        const tradePpc = Math.min(100, ppc + Math.floor(Math.random() * 15) - 7);
        return {
          tradeId: t.id,
          tradeName: t.name,
          committed: tc,
          completed: Math.round((tradePpc / 100) * tc),
          ppc: tradePpc,
        };
      }),
      topVarianceReasons: [
        { reason: 'Material delivery delay', category: 'Material', count: 3 },
        { reason: 'Crew shortage', category: 'Labor', count: 2 },
        { reason: 'Drawing revision pending', category: 'Design', count: 1 },
      ],
    });
  }
  ppcRecords.set(DEMO_PROJECT_ID, ppcHistory);

  // Current week commitments
  const currentCommitments: WeeklyCommitment[] = [];
  const zoneNames = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];
  let commitIdx = 0;
  for (const trade of trades) {
    for (let z = 0; z < 4; z++) {
      const isCompleted = commitIdx < 26;
      const isFailed = commitIdx >= 26 && commitIdx < 28;
      currentCommitments.push({
        id: uuidv4(),
        projectId: DEMO_PROJECT_ID,
        weekStart: '2026-03-23',
        weekEnd: '2026-03-27',
        tradeId: trade.id,
        tradeName: trade.name,
        zoneId: `z${z + 1}`,
        zoneName: zoneNames[z],
        description: `${trade.name} work in ${zoneNames[z]}`,
        committed: true,
        completed: isCompleted,
        varianceReason: isFailed ? (commitIdx === 26 ? 'Material not on site' : 'Crew shortage') : undefined,
        varianceCategory: isFailed ? (commitIdx === 26 ? 'Material' : 'Labor') : undefined,
      });
      commitIdx++;
      if (commitIdx >= 28) break;
    }
    if (commitIdx >= 28) break;
  }
  weeklyCommitments.set(`${DEMO_PROJECT_ID}:2026-03-23`, currentCommitments);
}

initDemoData();

// ── Accessors ──
export function getProgressUpdates(projectId: string): ProgressUpdate[] {
  return progressUpdates.get(projectId) || [];
}

export function addProgressUpdate(update: ProgressUpdate): void {
  const existing = progressUpdates.get(update.projectId) || [];
  existing.push(update);
  progressUpdates.set(update.projectId, existing);
}

export function getWeeklyCommitments(projectId: string, weekStart: string): WeeklyCommitment[] {
  return weeklyCommitments.get(`${projectId}:${weekStart}`) || [];
}

export function addWeeklyCommitment(c: WeeklyCommitment): void {
  const key = `${c.projectId}:${c.weekStart}`;
  const existing = weeklyCommitments.get(key) || [];
  existing.push(c);
  weeklyCommitments.set(key, existing);
}

export function updateCommitment(id: string, updates: Partial<WeeklyCommitment>): WeeklyCommitment | null {
  for (const [, comms] of weeklyCommitments) {
    const idx = comms.findIndex((c) => c.id === id);
    if (idx !== -1) {
      comms[idx] = { ...comms[idx], ...updates };
      return comms[idx];
    }
  }
  return null;
}

export function getPPCHistory(projectId: string): PPCRecord[] {
  return ppcRecords.get(projectId) || [];
}

export function getCurrentPPC(projectId: string): PPCRecord | null {
  const history = ppcRecords.get(projectId) || [];
  return history.length > 0 ? history[history.length - 1] : null;
}

export function addPPCRecord(record: PPCRecord): void {
  const existing = ppcRecords.get(record.projectId) || [];
  existing.push(record);
  ppcRecords.set(record.projectId, existing);
}

export function calculatePPC(projectId: string, weekStart: string, weekEnd: string): PPCRecord {
  const commitments = getWeeklyCommitments(projectId, weekStart);
  const totalCommitted = commitments.filter((c) => c.committed).length;
  const totalCompleted = commitments.filter((c) => c.completed).length;
  const ppc = totalCommitted > 0 ? Math.round((totalCompleted / totalCommitted) * 100) : 0;

  const byTradeMap = new Map<string, { tradeId: string; tradeName: string; committed: number; completed: number }>();
  for (const c of commitments) {
    const entry = byTradeMap.get(c.tradeId) || { tradeId: c.tradeId, tradeName: c.tradeName, committed: 0, completed: 0 };
    if (c.committed) entry.committed++;
    if (c.completed) entry.completed++;
    byTradeMap.set(c.tradeId, entry);
  }

  const byTrade = Array.from(byTradeMap.values()).map((e) => ({
    ...e,
    ppc: e.committed > 0 ? Math.round((e.completed / e.committed) * 100) : 0,
  }));

  const varianceCounts = new Map<string, { reason: string; category: string; count: number }>();
  for (const c of commitments) {
    if (c.varianceReason && !c.completed) {
      const key = c.varianceCategory || 'Other';
      const entry = varianceCounts.get(key) || { reason: c.varianceReason, category: key, count: 0 };
      entry.count++;
      varianceCounts.set(key, entry);
    }
  }

  const record: PPCRecord = {
    id: uuidv4(),
    projectId,
    weekStart,
    weekEnd,
    totalCommitted,
    totalCompleted,
    ppcPercent: ppc,
    byTrade,
    topVarianceReasons: Array.from(varianceCounts.values()).sort((a, b) => b.count - a.count),
  };

  addPPCRecord(record);
  return record;
}
