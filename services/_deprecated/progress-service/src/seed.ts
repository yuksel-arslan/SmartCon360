import { v4 as uuidv4 } from 'uuid';
import {
  WeeklyCommitment,
  TradeBreakdown,
  VarianceReasonEntry,
  PPCRecord,
  ProgressUpdate,
  DailyLog,
} from './types';
import {
  progressUpdates,
  weeklyCommitments,
  ppcRecords,
  dailyLogs,
} from './store';
import { logger } from './index';

// ── Demo Data Seed ──────────────────────────────────────
export function seedDemoData(): void {
  const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
  const DEMO_USER_ID = '00000000-0000-0000-0000-000000000099';

  // Demo trades
  const trades = [
    { id: '10000000-0000-0000-0000-000000000001', name: 'Structure' },
    { id: '10000000-0000-0000-0000-000000000002', name: 'MEP Rough-In' },
    { id: '10000000-0000-0000-0000-000000000003', name: 'Drywall' },
    { id: '10000000-0000-0000-0000-000000000004', name: 'MEP Finish' },
    { id: '10000000-0000-0000-0000-000000000005', name: 'Flooring' },
    { id: '10000000-0000-0000-0000-000000000006', name: 'Paint' },
    { id: '10000000-0000-0000-0000-000000000007', name: 'Final Finishes' },
  ];

  // Demo zones
  const zones = [
    { id: '20000000-0000-0000-0000-000000000001', name: 'Zone A - Ground Floor' },
    { id: '20000000-0000-0000-0000-000000000002', name: 'Zone B - 1st Floor' },
    { id: '20000000-0000-0000-0000-000000000003', name: 'Zone C - 2nd Floor' },
    { id: '20000000-0000-0000-0000-000000000004', name: 'Zone D - 3rd Floor' },
    { id: '20000000-0000-0000-0000-000000000005', name: 'Zone E - 4th Floor' },
    { id: '20000000-0000-0000-0000-000000000006', name: 'Zone F - 5th Floor' },
  ];

  // Generate 8 weeks of PPC history (improving from 65% to 93%)
  const ppcWeeks: { weekStart: string; weekEnd: string; ppc: number }[] = [
    { weekStart: '2025-12-22', weekEnd: '2025-12-26', ppc: 65.0 },
    { weekStart: '2025-12-29', weekEnd: '2026-01-02', ppc: 68.5 },
    { weekStart: '2026-01-05', weekEnd: '2026-01-09', ppc: 72.0 },
    { weekStart: '2026-01-12', weekEnd: '2026-01-16', ppc: 78.0 },
    { weekStart: '2026-01-19', weekEnd: '2026-01-23', ppc: 82.5 },
    { weekStart: '2026-01-26', weekEnd: '2026-01-30', ppc: 87.0 },
    { weekStart: '2026-02-02', weekEnd: '2026-02-06', ppc: 91.0 },
    { weekStart: '2026-02-09', weekEnd: '2026-02-13', ppc: 93.0 },
  ];

  // Variance reasons pool
  const varianceReasons: { reason: string; category: string }[] = [
    { reason: 'Material delivery delayed', category: 'material' },
    { reason: 'Crew not available', category: 'labor' },
    { reason: 'Design change pending RFI', category: 'design' },
    { reason: 'Equipment breakdown', category: 'equipment' },
    { reason: 'Preceding work not complete', category: 'predecessor' },
    { reason: 'Access restricted by other trade', category: 'space' },
    { reason: 'Permit approval pending', category: 'permit' },
    { reason: 'Missing specifications', category: 'information' },
    { reason: 'Weather delay', category: 'labor' },
    { reason: 'Scaffold not erected', category: 'equipment' },
  ];

  // Initialize storage for demo project
  weeklyCommitments.set(DEMO_PROJECT_ID, []);
  ppcRecords.set(DEMO_PROJECT_ID, []);
  progressUpdates.set(DEMO_PROJECT_ID, []);
  dailyLogs.set(DEMO_PROJECT_ID, []);

  // Generate weekly commitments and PPC records for each week
  for (const week of ppcWeeks) {
    const commitmentsPerTrade = 3; // Each trade has 3 commitments per week (one per zone in progress)
    const totalCommitted = trades.length * commitmentsPerTrade;
    const totalCompleted = Math.round(totalCommitted * (week.ppc / 100));
    const totalFailed = totalCommitted - totalCompleted;

    // Create commitments
    let completedCount = 0;
    const tradeBreakdowns: TradeBreakdown[] = [];

    for (const trade of trades) {
      let tradeCompleted = 0;
      for (let z = 0; z < commitmentsPerTrade; z++) {
        const zone = zones[z % zones.length];
        const shouldComplete = completedCount < totalCompleted;

        const commitment: WeeklyCommitment = {
          id: uuidv4(),
          projectId: DEMO_PROJECT_ID,
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          tradeId: trade.id,
          tradeName: trade.name,
          zoneId: zone.id,
          zoneName: zone.name,
          description: `${trade.name} work in ${zone.name}`,
          committed: true,
          completed: shouldComplete,
          varianceReason: shouldComplete ? null : varianceReasons[Math.floor(Math.random() * varianceReasons.length)].reason,
          varianceCategory: shouldComplete ? null : varianceReasons[Math.floor(Math.random() * varianceReasons.length)].category,
          createdAt: `${week.weekStart}T08:00:00.000Z`,
          updatedAt: `${week.weekEnd}T17:00:00.000Z`,
        };

        weeklyCommitments.get(DEMO_PROJECT_ID)!.push(commitment);
        if (shouldComplete) {
          completedCount++;
          tradeCompleted++;
        }
      }

      tradeBreakdowns.push({
        tradeId: trade.id,
        tradeName: trade.name,
        committed: commitmentsPerTrade,
        completed: tradeCompleted,
        ppc: Math.round((tradeCompleted / commitmentsPerTrade) * 100 * 10) / 10,
      });
    }

    // Aggregate variance reasons for this week's failed commitments
    const weekCommitments = weeklyCommitments.get(DEMO_PROJECT_ID)!.filter(
      c => c.weekStart === week.weekStart && !c.completed && c.varianceReason
    );
    const reasonMap = new Map<string, { category: string; count: number }>();
    for (const c of weekCommitments) {
      if (c.varianceReason) {
        const existing = reasonMap.get(c.varianceReason) || { category: c.varianceCategory || 'unknown', count: 0 };
        existing.count += 1;
        reasonMap.set(c.varianceReason, existing);
      }
    }
    const topReasons: VarianceReasonEntry[] = Array.from(reasonMap.entries())
      .map(([reason, data]) => ({ reason, category: data.category, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Create PPC record
    const record: PPCRecord = {
      id: uuidv4(),
      projectId: DEMO_PROJECT_ID,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      totalCommitted,
      totalCompleted: completedCount,
      ppcPercent: Math.round((completedCount / totalCommitted) * 100 * 10) / 10,
      byTrade: tradeBreakdowns,
      topVarianceReasons: topReasons,
      createdAt: `${week.weekEnd}T18:00:00.000Z`,
    };

    ppcRecords.get(DEMO_PROJECT_ID)!.push(record);
  }

  // Generate progress updates for a few recent assignments
  const recentAssignments = [
    { assignmentId: '30000000-0000-0000-0000-000000000001', tradeIdx: 0, zoneIdx: 0, percent: 100 },
    { assignmentId: '30000000-0000-0000-0000-000000000002', tradeIdx: 0, zoneIdx: 1, percent: 100 },
    { assignmentId: '30000000-0000-0000-0000-000000000003', tradeIdx: 0, zoneIdx: 2, percent: 85 },
    { assignmentId: '30000000-0000-0000-0000-000000000004', tradeIdx: 1, zoneIdx: 0, percent: 100 },
    { assignmentId: '30000000-0000-0000-0000-000000000005', tradeIdx: 1, zoneIdx: 1, percent: 70 },
    { assignmentId: '30000000-0000-0000-0000-000000000006', tradeIdx: 2, zoneIdx: 0, percent: 60 },
    { assignmentId: '30000000-0000-0000-0000-000000000007', tradeIdx: 3, zoneIdx: 0, percent: 40 },
    { assignmentId: '30000000-0000-0000-0000-000000000008', tradeIdx: 4, zoneIdx: 0, percent: 20 },
  ];

  for (const assignment of recentAssignments) {
    const trade = trades[assignment.tradeIdx];
    const zone = zones[assignment.zoneIdx];

    // Create a few progress snapshots over time
    const steps = assignment.percent >= 100
      ? [25, 50, 75, 100]
      : assignment.percent >= 50
        ? [25, 50, assignment.percent]
        : [assignment.percent];

    let previousPercent = 0;
    for (let i = 0; i < steps.length; i++) {
      const daysAgo = (steps.length - i) * 2;
      const reportDate = new Date();
      reportDate.setDate(reportDate.getDate() - daysAgo);

      const status: ProgressUpdate['status'] = steps[i] >= 100
        ? 'completed'
        : steps[i] > 0
          ? 'in_progress'
          : 'not_started';

      const update: ProgressUpdate = {
        id: uuidv4(),
        projectId: DEMO_PROJECT_ID,
        assignmentId: assignment.assignmentId,
        zoneId: zone.id,
        tradeId: trade.id,
        reportedBy: DEMO_USER_ID,
        percentComplete: steps[i],
        previousPercent,
        status,
        notes: i === steps.length - 1 ? `Latest update: ${trade.name} at ${steps[i]}% in ${zone.name}` : null,
        photoUrls: [],
        reportedAt: reportDate.toISOString(),
        createdAt: reportDate.toISOString(),
        updatedAt: reportDate.toISOString(),
      };

      progressUpdates.get(DEMO_PROJECT_ID)!.push(update);
      previousPercent = steps[i];
    }
  }

  // Generate daily logs for the past 5 days
  const dailyLogData = [
    { daysAgo: 4, weather: 'Sunny', temp: 12, crew: 85, notes: 'Full production day. Structure trade ahead of schedule on Zone C.' },
    { daysAgo: 3, weather: 'Partly Cloudy', temp: 10, crew: 82, notes: 'MEP rough-in started in Zone B. Minor coordination issue with drywall crew resolved on-site.' },
    { daysAgo: 2, weather: 'Overcast', temp: 8, crew: 78, notes: 'Drywall material delivery delayed by 2 hours. Crew redirected to Zone A prep work.' },
    { daysAgo: 1, weather: 'Light Rain', temp: 6, crew: 70, notes: 'Reduced exterior work due to rain. Interior trades maintained full production.' },
    { daysAgo: 0, weather: 'Clear', temp: 9, crew: 88, notes: 'Strong progress day. PPC tracking at 93% for current week.' },
  ];

  for (const entry of dailyLogData) {
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - entry.daysAgo);
    const dateStr = logDate.toISOString().split('T')[0];

    const issues: { description: string; severity: string }[] = [];
    if (entry.daysAgo === 2) {
      issues.push({ description: 'Drywall material delivery 2 hours late', severity: 'medium' });
    }
    if (entry.daysAgo === 1) {
      issues.push({ description: 'Rain affecting exterior work', severity: 'low' });
      issues.push({ description: 'Scaffold inspection due tomorrow', severity: 'medium' });
    }

    const log: DailyLog = {
      id: uuidv4(),
      projectId: DEMO_PROJECT_ID,
      date: dateStr,
      weather: entry.weather,
      temperature: entry.temp,
      crewCount: entry.crew,
      notes: entry.notes,
      issues,
      createdBy: DEMO_USER_ID,
      createdAt: `${dateStr}T07:00:00.000Z`,
      updatedAt: `${dateStr}T17:00:00.000Z`,
    };

    dailyLogs.get(DEMO_PROJECT_ID)!.push(log);
  }

  const totalCommitments = weeklyCommitments.get(DEMO_PROJECT_ID)!.length;
  const totalPPCRecords = ppcRecords.get(DEMO_PROJECT_ID)!.length;
  const totalProgress = progressUpdates.get(DEMO_PROJECT_ID)!.length;
  const totalLogs = dailyLogs.get(DEMO_PROJECT_ID)!.length;

  logger.info(
    {
      projectId: DEMO_PROJECT_ID,
      commitments: totalCommitments,
      ppcRecords: totalPPCRecords,
      progressUpdates: totalProgress,
      dailyLogs: totalLogs,
    },
    'Demo data seeded successfully'
  );
}
