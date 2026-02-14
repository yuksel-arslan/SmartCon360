'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { DEMO_PROJECTS } from '@/lib/mockData';
import {
  LayoutDashboard, GitBranch, Grid3x3, AlertTriangle,
  ClipboardCheck, Users, FileText, Bot, Settings, PanelLeftClose,
  Plus, ChevronDown, Play,
  Building2, Hospital, Building, Landmark, Factory, Construction, FolderKanban,
  ShieldCheck, HardHat, DollarSign, Truck, Radar, Scale,
  Camera, MessageSquare, UserCheck, Leaf, Activity,
} from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

const PROJECT_ICONS: Record<string, LucideIcon> = {
  hotel: Building2,
  hospital: Hospital,
  residential: Building,
  commercial: Landmark,
  industrial: Factory,
  infrastructure: Construction,
};

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const navGroups: NavGroup[] = [
  {
    label: 'Planning',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/flowline', icon: GitBranch, label: 'Flowline' },
      { href: '/takt-editor', icon: Grid3x3, label: 'Takt Editor' },
      { href: '/constraints', icon: AlertTriangle, label: 'Constraints' },
      { href: '/lps', icon: ClipboardCheck, label: 'Last Planner' },
    ],
  },
  {
    label: 'Quality & Safety',
    items: [
      { href: '/quality', icon: ShieldCheck, label: 'QualityGate' },
      { href: '/safety', icon: HardHat, label: 'SafeZone' },
      { href: '/vision', icon: Camera, label: 'VisionAI' },
    ],
  },
  {
    label: 'Cost & Resources',
    items: [
      { href: '/cost', icon: DollarSign, label: 'CostPilot' },
      { href: '/resources', icon: Users, label: 'CrewFlow' },
    ],
  },
  {
    label: 'Supply & Risk',
    items: [
      { href: '/supply', icon: Truck, label: 'SupplyChain' },
      { href: '/risk', icon: Radar, label: 'RiskRadar' },
      { href: '/claims', icon: Scale, label: 'ClaimShield' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/communication', icon: MessageSquare, label: 'CommHub' },
      { href: '/stakeholders', icon: UserCheck, label: 'StakeHub' },
    ],
  },
  {
    label: 'Sustainability',
    items: [
      { href: '/sustainability', icon: Leaf, label: 'GreenSite' },
    ],
  },
  {
    label: 'AI & Analytics',
    items: [
      { href: '/ai', icon: Bot, label: 'AI Concierge' },
      { href: '/reports', icon: FileText, label: 'Reports' },
      { href: '/simulation', icon: Play, label: 'Simulation' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const activeProject = DEMO_PROJECTS[0];
  const DefaultProjectIcon = FolderKanban;

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className="flex flex-col border-r transition-all duration-200 flex-shrink-0"
      style={{
        width: sidebarCollapsed ? 64 : 250,
        backgroundColor: 'var(--color-bg-sidebar)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center border-b"
        style={{
          borderColor: 'var(--color-border)',
          padding: sidebarCollapsed ? '12px' : '14px 16px',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}
      >
        {sidebarCollapsed ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[14px]"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            S
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[14px]"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              S
            </div>
            <div>
              <div className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
                SmartCon360
              </div>
              <div className="text-[9px] font-medium tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>
                Construction Platform
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project selector */}
      {!sidebarCollapsed ? (
        <div className="px-3 py-2.5">
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="w-full rounded-xl px-3 py-2.5 cursor-pointer border text-left transition-colors"
            style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {(() => {
                  const Icon = PROJECT_ICONS[activeProject.type] || DefaultProjectIcon;
                  return (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-muted)' }}>
                      <Icon size={14} style={{ color: 'var(--color-accent)' }} strokeWidth={1.5} />
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {activeProject.name}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {activeProject.floors} floors · {activeProject.zones} zones
                  </div>
                </div>
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: 'var(--color-text-muted)',
                  transform: projectDropdownOpen ? 'rotate(180deg)' : undefined,
                  transition: 'transform 0.2s',
                }}
              />
            </div>
          </button>

          {/* Dropdown */}
          {projectDropdownOpen && (
            <div
              className="mt-1.5 rounded-xl border overflow-hidden"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              {DEMO_PROJECTS.map((project) => {
                const Icon = PROJECT_ICONS[project.type] || DefaultProjectIcon;
                return (
                  <button
                    key={project.id}
                    onClick={() => setProjectDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: project.id === activeProject.id ? 'var(--color-accent-muted)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (project.id !== activeProject.id) e.currentTarget.style.background = 'var(--color-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = project.id === activeProject.id ? 'var(--color-accent-muted)' : 'transparent';
                    }}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-bg-input)' }}>
                      <Icon size={12} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {project.name}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {project.status === 'planning' ? 'Planning' : `PPC ${project.ppc}%`}
                      </div>
                    </div>
                  </button>
                );
              })}

              <Link
                href="/projects/new"
                onClick={() => setProjectDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-3 border-t transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
              >
                <Plus size={14} />
                <span className="text-[11px] font-semibold">New Project</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="px-2 py-2.5 flex justify-center">
          <Link
            href="/projects/new"
            className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
            title="New Project"
          >
            <Plus size={16} />
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-0.5 min-h-0">
        {navGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.label];
          return (
            <div key={group.label} className="mb-1">
              {/* Group label */}
              {!sidebarCollapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 cursor-pointer"
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {group.label}
                  </span>
                  <ChevronDown
                    size={10}
                    style={{
                      color: 'var(--color-text-muted)',
                      transform: isGroupCollapsed ? 'rotate(-90deg)' : undefined,
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
              )}

              {/* Group items */}
              {(!isGroupCollapsed || sidebarCollapsed) && group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150"
                    style={{
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      background: isActive ? 'var(--color-accent-muted)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--color-bg-hover)';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }
                    }}
                  >
                    <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                    {!sidebarCollapsed && item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t flex flex-col gap-1" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[12px] font-medium w-full transition-colors"
          style={{
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            color: 'var(--color-text-muted)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <PanelLeftClose size={18} strokeWidth={1.5} />
          {!sidebarCollapsed && 'Collapse'}
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
          style={{
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            color: 'var(--color-text-muted)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
        >
          <Settings size={18} strokeWidth={1.5} />
          {!sidebarCollapsed && 'Settings'}
        </Link>
      </div>
    </aside>
  );
}
