'use client';

import TopBar from '@/components/layout/TopBar';
import FlowlineChart from '@/components/charts/FlowlineChart';
import {
  Activity, CheckCircle, AlertTriangle, Zap, TrendingUp,
  Clock, ArrowUpRight, GitBranch, Target,
} from 'lucide-react';
import {
  DEMO_FLOWLINE, DEMO_ZONES, DEMO_TODAY_X, DEMO_TOTAL_PERIODS,
  DEMO_KPIS, DEMO_ACTIVITIES, DEMO_CONSTRAINTS,
} from '@/lib/mockData';

const kpis = [
  { label: 'PPC', value: `${DEMO_KPIS.ppc}%`, sub: `▲ ${DEMO_KPIS.ppcTrend}% from last week`, color: 'var(--color-success)', icon: CheckCircle },
  { label: 'Takt Progress', value: `T${DEMO_KPIS.taktPeriod}`, sub: `of ${DEMO_KPIS.totalPeriods} periods`, color: 'var(--color-accent)', icon: Activity },
  { label: 'Open Constraints', value: `${DEMO_KPIS.openConstraints}`, sub: `${DEMO_KPIS.criticalConstraints} critical`, color: 'var(--color-danger)', icon: AlertTriangle },
  { label: 'AI Score', value: `${DEMO_KPIS.aiScore}`, sub: 'Project health index', color: 'var(--color-purple)', icon: Zap },
];

const constraintColors: Record<string, string> = {
  critical: 'var(--color-danger)', high: 'var(--color-warning)', medium: 'var(--color-accent)', low: 'var(--color-text-muted)',
};

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border p-4 transition-all hover:scale-[1.01]" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                  <div className="text-3xl font-extrabold mt-1" style={{ fontFamily: 'var(--font-display)', color: kpi.color }}>{kpi.value}</div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>{kpi.sub}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Flowline Chart — mini */}
          <div className="lg:col-span-2 rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Flowline Overview</h3>
              </div>
              <a href="/flowline" className="text-[10px] font-semibold flex items-center gap-1 hover:underline" style={{ color: 'var(--color-accent)' }}>
                Full View <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="flex flex-wrap gap-3 mb-3">
              {DEMO_FLOWLINE.map((w) => (
                <div key={w.trade_name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: w.color }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{w.trade_name}</span>
                </div>
              ))}
            </div>
            <FlowlineChart wagons={DEMO_FLOWLINE} zones={DEMO_ZONES} todayX={DEMO_TODAY_X} totalPeriods={DEMO_TOTAL_PERIODS} height={220} mini />
          </div>

          {/* AI Concierge */}
          <div className="rounded-xl border flex flex-col" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}>
                <Zap size={14} className="text-white" />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>AI Concierge</div>
                <div className="text-[9px] flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                  <div className="w-1 h-1 rounded-full" style={{ background: 'var(--color-success)' }} /> Online
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-auto">
              {[
                { type: 'Insight', color: 'var(--color-accent)', msg: 'Structure trade is 2 days ahead of schedule. Consider pulling MEP Rough forward to utilize the buffer.' },
                { type: 'Warning', color: 'var(--color-warning)', msg: 'MEP material delivery delay may impact Zone E by T8. Recommend early procurement action.' },
                { type: 'Recommendation', color: 'var(--color-success)', msg: 'PPC trending upward for 3 consecutive weeks. Current team productivity is above benchmark.' },
              ].map((item) => (
                <div key={item.type} className="p-3 rounded-lg" style={{ background: 'var(--color-bg-input)' }}>
                  <div className="text-[10px] font-semibold mb-1" style={{ color: item.color }}>{item.type}</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{item.msg}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}>
                <input placeholder="Ask about your project..." className="bg-transparent border-none outline-none text-[11px] w-full" style={{ color: 'var(--color-text)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Activity */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
              <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {DEMO_ACTIVITIES.slice(0, 5).map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: act.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{act.message}</p>
                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Constraint Summary */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={16} style={{ color: 'var(--color-danger)' }} />
                <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>Open Constraints</h3>
              </div>
              <a href="/constraints" className="text-[10px] font-semibold flex items-center gap-1 hover:underline" style={{ color: 'var(--color-accent)' }}>
                View All <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="space-y-2.5">
              {DEMO_CONSTRAINTS.filter((c) => c.status === 'open').map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--color-bg-input)' }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: constraintColors[c.priority] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] uppercase font-semibold" style={{ color: constraintColors[c.priority] }}>{c.priority}</span>
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{c.trade} · {c.zone}</span>
                    </div>
                  </div>
                  <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{c.dueDate}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>Constraint Removal Rate</span>
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>78%</span>
              </div>
              <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--color-bg-input)' }}>
                <div className="h-1.5 rounded-full" style={{ width: '78%', background: 'var(--color-success)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Project stats bar */}
        <div className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          {[
            { label: 'Active Projects', value: DEMO_KPIS.activeProjects, icon: TrendingUp },
            { label: 'Total Trades', value: DEMO_KPIS.totalTrades, icon: Activity },
            { label: 'Takt Zones', value: DEMO_KPIS.totalZones, icon: GitBranch },
            { label: 'CRR', value: '78%', icon: Target },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-bg-input)' }}>
                <stat.icon size={15} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div>
                <div className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{stat.value}</div>
                <div className="text-[9px] uppercase font-semibold tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
