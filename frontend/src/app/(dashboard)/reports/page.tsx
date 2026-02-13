'use client';

import TopBar from '@/components/layout/TopBar';
import { FileText, Download, Calendar, Zap } from 'lucide-react';

const reports = [
  { title: 'Weekly Progress Report', type: 'Weekly', date: '2026-02-10', status: 'ready', icon: FileText },
  { title: 'Executive Summary — January', type: 'Monthly', date: '2026-02-01', status: 'ready', icon: FileText },
  { title: 'Variance Analysis Report', type: 'Weekly', date: '2026-02-10', status: 'ready', icon: FileText },
  { title: 'PPC Trend Report', type: 'Weekly', date: '2026-02-10', status: 'ready', icon: FileText },
  { title: 'Constraint Log Report', type: 'On-Demand', date: '2026-02-09', status: 'ready', icon: FileText },
];

export default function ReportsPage() {
  return (
    <>
      <TopBar title="Reports" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* AI-generated report card */}
          <div className="lg:col-span-2 rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} style={{ color: 'var(--color-purple)' }} />
              <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>AI-Generated Reports</h3>
            </div>
            <div className="space-y-2.5">
              {reports.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-bg-input)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                    <r.icon size={14} style={{ color: 'var(--color-purple)' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{r.type}</span>
                      <span className="text-[9px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.date}</span>
                    </div>
                  </div>
                  <button className="w-7 h-7 rounded-lg border flex items-center justify-center" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <Download size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <h4 className="text-xs font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Generate New Report</h4>
              <div className="space-y-2">
                {['Weekly Progress', 'Executive Summary', 'Variance Analysis', 'Custom Report'].map((type) => (
                  <button key={type} className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium border transition-colors"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-input)' }}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-display)' }}>Schedule</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                Weekly reports auto-generate every Friday at 5:00 PM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
