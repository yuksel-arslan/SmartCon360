'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { DEMO_PROJECTS } from '@/lib/mockData';
import {
  LayoutDashboard, GitBranch, Grid3x3, AlertTriangle,
  ClipboardCheck, Users, FileText, Bot, Settings, PanelLeftClose,
  Plus, ChevronDown, Play,
} from 'lucide-react';
import { useState } from 'react';

const PROJECT_ICONS: Record<string, string> = {
  hotel: '🏨',
  hospital: '🏥',
  residential: '🏢',
  commercial: '🏛️',
  industrial: '🏭',
  infrastructure: '🌉',
};

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/flowline', icon: GitBranch, label: 'Flowline' },
  { href: '/takt-editor', icon: Grid3x3, label: 'Takt Editor' },
  { href: '/constraints', icon: AlertTriangle, label: 'Constraints' },
  { href: '/lps', icon: ClipboardCheck, label: 'Last Planner' },
  { href: '/resources', icon: Users, label: 'Resources' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/simulation', icon: Play, label: 'Simulation' },
  { href: '/ai', icon: Bot, label: 'AI Concierge' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const activeProject = DEMO_PROJECTS[0];

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
      {!sidebarCollapsed ? (
        <div className="px-3 py-3">
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="w-full rounded-lg px-2.5 py-2 cursor-pointer border text-left transition-colors hover:opacity-90"
            style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm flex-shrink-0">{PROJECT_ICONS[activeProject.type] || '📋'}</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {activeProject.name}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                    {activeProject.floors} floors · {activeProject.zones} zones
                  </div>
                </div>
              </div>
              <ChevronDown
                size={14}
                style={{ color: 'var(--color-text-muted)', transform: projectDropdownOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }}
              />
            </div>
          </button>

          {/* Dropdown */}
          {projectDropdownOpen && (
            <div
              className="mt-1 rounded-lg border overflow-hidden"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              {DEMO_PROJECTS.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setProjectDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors hover:opacity-80"
                  style={{
                    background: project.id === activeProject.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                  }}
                >
                  <span className="text-sm flex-shrink-0">{PROJECT_ICONS[project.type] || '📋'}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                      {project.name}
                    </div>
                    <div className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                      {project.status === 'planning' ? 'Planning' : `PPC ${project.ppc}%`}
                    </div>
                  </div>
                </button>
              ))}

              {/* New Project button */}
              <Link
                href="/projects/new"
                onClick={() => setProjectDropdownOpen(false)}
                className="flex items-center gap-2 px-2.5 py-2.5 border-t transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
              >
                <Plus size={14} />
                <span className="text-[11px] font-semibold">New Project</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="px-2 py-3 flex justify-center">
          <Link
            href="/projects/new"
            className="w-9 h-9 rounded-lg flex items-center justify-center border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
            title="New Project"
          >
            <Plus size={16} />
          </Link>
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
