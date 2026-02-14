'use client';

import TopBar from '@/components/layout/TopBar';
import FlowlineChart from '@/components/charts/FlowlineChart';
import {
  Card, SectionHeader, MetricCard, ActivityItem,
  ConstraintRow, StatPill, ProgressBar, ConciergeMessage, LegendDot,
} from '@/components/ui';
import {
  CheckCircle, Activity, AlertTriangle, Zap,
  TrendingUp, Clock, GitBranch, Target,
} from 'lucide-react';
import {
  DEMO_FLOWLINE, DEMO_ZONES, DEMO_TODAY_X, DEMO_TOTAL_PERIODS,
  DEMO_KPIS, DEMO_ACTIVITIES, DEMO_CONSTRAINTS,
} from '@/lib/mockData';

const constraintColors: Record<string, string> = {
  critical: 'var(--color-danger)',
  high: 'var(--color-warning)',
  medium: 'var(--color-accent)',
  low: 'var(--color-text-muted)',
};

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">

        {/* ── KPI Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="PPC"
            value={`${DEMO_KPIS.ppc}%`}
            sub={`+${DEMO_KPIS.ppcTrend}% from last week`}
            icon={CheckCircle}
            color="var(--color-success)"
          />
          <MetricCard
            label="Takt Progress"
            value={`T${DEMO_KPIS.taktPeriod}`}
            sub={`of ${DEMO_KPIS.totalPeriods} periods`}
            icon={Activity}
            color="var(--color-accent)"
          />
          <MetricCard
            label="Open Constraints"
            value={`${DEMO_KPIS.openConstraints}`}
            sub={`${DEMO_KPIS.criticalConstraints} critical`}
            icon={AlertTriangle}
            color="var(--color-danger)"
          />
          <MetricCard
            label="AI Score"
            value={`${DEMO_KPIS.aiScore}`}
            sub="Project health index"
            icon={Zap}
            color="var(--color-accent-light)"
          />
        </div>

        {/* ── Main Content ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Flowline Chart */}
          <Card className="lg:col-span-2" padding="lg">
            <SectionHeader icon={GitBranch} title="Flowline Overview" href="/flowline" />
            <div className="flex flex-wrap gap-3 mb-4">
              {DEMO_FLOWLINE.map((w) => (
                <LegendDot key={w.trade_name} label={w.trade_name} color={w.color} />
              ))}
            </div>
            <FlowlineChart
              wagons={DEMO_FLOWLINE}
              zones={DEMO_ZONES}
              todayX={DEMO_TODAY_X}
              totalPeriods={DEMO_TOTAL_PERIODS}
              height={220}
              mini
            />
          </Card>

          {/* AI Concierge */}
          <Card padding="none" className="flex flex-col">
            <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-border)' }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
              >
                <Zap size={14} className="text-white" />
              </div>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>AI Concierge</div>
                <div className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--color-success)' }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: 'var(--color-success)' }} /> Online
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-auto">
              <ConciergeMessage
                type="Insight"
                color="var(--color-accent)"
                message="Structure trade is 2 days ahead of schedule. Consider pulling MEP Rough forward to utilize the buffer."
              />
              <ConciergeMessage
                type="Warning"
                color="var(--color-warning)"
                message="MEP material delivery delay may impact Zone E by T8. Recommend early procurement action."
              />
              <ConciergeMessage
                type="Recommendation"
                color="var(--color-success)"
                message="PPC trending upward for 3 consecutive weeks. Current team productivity is above benchmark."
              />
            </div>
            <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--color-bg-input)' }}
              >
                <input
                  placeholder="Ask about your project..."
                  className="bg-transparent border-none outline-none text-[12px] w-full"
                  style={{ color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Bottom Row ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Activity */}
          <Card padding="lg">
            <SectionHeader icon={Clock} title="Recent Activity" />
            <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
              {DEMO_ACTIVITIES.slice(0, 5).map((act) => (
                <ActivityItem key={act.id} message={act.message} time={act.time} color={act.color} />
              ))}
            </div>
          </Card>

          {/* Constraints */}
          <Card padding="lg">
            <SectionHeader icon={Target} title="Open Constraints" href="/constraints" />
            <div className="space-y-1">
              {DEMO_CONSTRAINTS.filter((c) => c.status === 'open').map((c) => (
                <ConstraintRow
                  key={c.id}
                  title={c.title}
                  priority={c.priority}
                  priorityColor={constraintColors[c.priority]}
                  trade={c.trade}
                  zone={c.zone}
                  dueDate={c.dueDate}
                />
              ))}
            </div>
            <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <ProgressBar value={78} color="var(--color-success)" showLabel label="Constraint Removal Rate" />
            </div>
          </Card>
        </div>

        {/* ── Stats Bar ───────────────────────────────────── */}
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <StatPill label="Active Projects" value={DEMO_KPIS.activeProjects} icon={TrendingUp} />
            <StatPill label="Total Trades" value={DEMO_KPIS.totalTrades} icon={Activity} />
            <StatPill label="Takt Zones" value={DEMO_KPIS.totalZones} icon={GitBranch} />
            <StatPill label="CRR" value="78%" icon={Target} />
          </div>
        </Card>
      </div>
    </>
  );
}
