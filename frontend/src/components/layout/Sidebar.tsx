'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import {
  LayoutDashboard, GitBranch, Grid3x3, AlertTriangle,
  ClipboardCheck, Users, FileText, Bot, Settings, PanelLeftClose
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/flowline', icon: GitBranch, label: 'Flowline' },
  { href: '/takt-editor', icon: Grid3x3, label: 'Takt Editor' },
  { href: '/constraints', icon: AlertTriangle, label: 'Constraints' },
  { href: '/lps', icon: ClipboardCheck, label: 'Last Planner' },
  { href: '/resources', icon: Users, label: 'Resources' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/ai', icon: Bot, label: 'AI Concierge' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className="flex flex-col border-r transition-all duration-200 flex-shrink-0"
      style={{
        width: sidebarCollapsed ? 64 : 220,
        backgroundColor: 'var(--color-bg-sidebar)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
          }}
        >
          T
        </div>
        {!sidebarCollapsed && (
          <div>
            <div className="text-sm font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              TaktFlow
            </div>
            <div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
              AI Platform
            </div>
          </div>
        )}
      </div>

      {/* Project selector */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3">
          <div
            className="rounded-lg px-2.5 py-2 cursor-pointer border"
            style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
          >
            <div className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Hotel Sapphire</div>
            <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>12 floors · 6 zones</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors"
              style={{
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              <item.icon size={18} />
              {!sidebarCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t flex flex-col gap-0.5" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs w-full"
          style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', color: 'var(--color-text-muted)' }}
        >
          <PanelLeftClose size={18} />
          {!sidebarCollapsed && 'Collapse'}
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs"
          style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', color: 'var(--color-text-muted)' }}
        >
          <Settings size={18} />
          {!sidebarCollapsed && 'Settings'}
        </Link>
      </div>
    </aside>
  );
}
