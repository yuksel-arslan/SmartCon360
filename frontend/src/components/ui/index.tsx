'use client';

import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
 * TaktFlow Design System — Hyper-Minimal 2026
 *
 * Centralized UI primitives. All pages import from here
 * to ensure consistent styling across the application.
 *
 * Corporate palette: Blue #3B82F6 → Purple #8B5CF6
 * Font: Inter (all weights)
 * ───────────────────────────────────────────────────────── */

// ── Card ──────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  style?: React.CSSProperties;
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export function Card({ children, className = '', padding = 'md', hover = false, style }: CardProps) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${paddingMap[padding]} ${hover ? 'hover:translate-y-[-1px]' : ''} ${className}`}
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────
interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  href?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ icon: Icon, title, href, linkLabel = 'View All', children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent-muted)' }}>
            <Icon size={14} style={{ color: 'var(--color-accent)' }} />
          </div>
        )}
        <h3 className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--color-text)' }}>{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {href && (
          <a
            href={href}
            className="text-[11px] font-medium flex items-center gap-1 transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {linkLabel} <ArrowUpRight size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

// ── KPI Metric ────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ label, value, sub, icon: Icon, color = 'var(--color-accent)' }: MetricCardProps) {
  return (
    <Card padding="lg" hover>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </span>
          <div className="text-[32px] font-bold leading-none tracking-[-0.03em]" style={{ color }}>
            {value}
          </div>
          {sub && (
            <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-muted)' }}>
              {sub}
            </span>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
            <Icon size={18} style={{ color }} strokeWidth={1.5} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Badge ─────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color = 'var(--color-accent)', size = 'sm' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  return (
    <span
      className={`${sizeClasses} font-semibold uppercase tracking-[0.06em] rounded-md`}
      style={{ color, background: `${color}15` }}
    >
      {label}
    </span>
  );
}

// ── Progress Bar ──────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ value, color = 'var(--color-accent)', height = 4, showLabel = false, label }: ProgressBarProps) {
  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color, fontFamily: 'var(--font-mono)' }}>{value}%</span>
        </div>
      )}
      <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'var(--color-bg-input)' }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Activity Item ─────────────────────────────────────────
interface ActivityItemProps {
  message: string;
  time: string;
  color?: string;
}

export function ActivityItem({ message, time, color = 'var(--color-accent)' }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{time}</span>
      </div>
    </div>
  );
}

// ── Constraint Row ────────────────────────────────────────
interface ConstraintRowProps {
  title: string;
  priority: string;
  priorityColor: string;
  trade: string;
  zone: string;
  dueDate: string;
}

export function ConstraintRow({ title, priority, priorityColor, trade, zone, dueDate }: ConstraintRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors" style={{ background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ background: priorityColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text)' }}>{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge label={priority} color={priorityColor} />
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{trade} · {zone}</span>
        </div>
      </div>
      <span className="text-[10px] flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{dueDate}</span>
    </div>
  );
}

// ── Stat Pill ─────────────────────────────────────────────
interface StatPillProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

export function StatPill({ label, value, icon: Icon }: StatPillProps) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-bg-input)' }}>
          <Icon size={14} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
        </div>
      )}
      <div>
        <div className="text-[15px] font-bold tracking-[-0.02em] tabular-nums" style={{ color: 'var(--color-text)' }}>{value}</div>
        <div className="text-[9px] uppercase font-medium tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      </div>
    </div>
  );
}

// ── Concierge Message ─────────────────────────────────────
interface ConciergeMessageProps {
  type: string;
  color: string;
  message: string;
}

export function ConciergeMessage({ type, color, message }: ConciergeMessageProps) {
  return (
    <div className="p-3.5 rounded-xl" style={{ background: 'var(--color-bg-input)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-1 h-1 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color }}>{type}</span>
      </div>
      <p className="text-[11px] leading-[1.6]" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
    </div>
  );
}

// ── Legend Dot ─────────────────────────────────────────────
interface LegendDotProps {
  label: string;
  color: string;
}

export function LegendDot({ label, color }: LegendDotProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon size={32} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1} />}
      <p className="text-sm font-medium mt-3" style={{ color: 'var(--color-text-secondary)' }}>{title}</p>
      {description && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{description}</p>}
    </div>
  );
}
