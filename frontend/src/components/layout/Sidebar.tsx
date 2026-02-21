'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { NAV_GROUPS, MODULE_REGISTRY, BRAND, type NavGroupItem } from '@/lib/modules';
import { useAccessibleModules } from '@/hooks/useModuleAccess';
import {
  Settings, PanelLeftClose, Plus, ChevronDown, ChevronRight,
  Building2, Hospital, Building, Landmark, Factory, Construction, FolderKanban, Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

const PROJECT_ICONS: Record<string, LucideIcon> = {
  hotel: Building2,
  hospital: Hospital,
  residential: Building,
  commercial: Landmark,
  industrial: Factory,
  infrastructure: Construction,
};


export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, theme } = useUIStore();
  const { token } = useAuthStore();
  const accessibleModules = useAccessibleModules();
  const { projects, activeProjectId, loading, initialized, error, fetchProjects, setActiveProject } = useProjectStore();
  const sidebarLogo = theme === 'dark' ? BRAND.logoDark : BRAND.logoLight;
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Fetch projects on mount when authenticated
  useEffect(() => {
    if (token && !initialized) {
      fetchProjects();
    }
  }, [token, initialized, fetchProjects]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const DefaultProjectIcon = FolderKanban;

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  /** Render a single nav link (plain module or indented child) */
  const renderNavLink = (moduleId: string, path: string, collapsed: boolean, indented = false) => {
    const mod = MODULE_REGISTRY[moduleId as keyof typeof MODULE_REGISTRY];
    if (!mod) return null;
    if (!accessibleModules.includes(moduleId)) return null;
    const isActive = path === mod.href;
    return (
      <Link
        key={mod.id}
        href={mod.href}
        title={collapsed ? mod.label : undefined}
        className="flex items-center gap-3 rounded-lg py-1.5 text-[12px] font-medium transition-all duration-150"
        style={{
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingLeft: collapsed ? 12 : indented ? 32 : 12,
          paddingRight: 12,
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
        <mod.icon size={indented ? 14 : 16} strokeWidth={isActive ? 2 : 1.5} />
        {!collapsed && mod.label}
      </Link>
    );
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <Image src={BRAND.icon} alt={BRAND.name} width={32} height={32} priority />
          </div>
        ) : (
          <Image
            src={sidebarLogo}
            alt={BRAND.name}
            width={660}
            height={190}
            priority
            style={{ width: '100%', height: 'auto' }}
          />
        )}
      </div>

      {/* Project selector */}
      {!sidebarCollapsed ? (
        <div className="px-3 py-2.5">
          {loading && !initialized ? (
            <div className="w-full rounded-xl px-3 py-3 border flex items-center justify-center gap-2"
              style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Loading projects...</span>
            </div>
          ) : error ? (
            <button
              onClick={() => fetchProjects()}
              className="w-full rounded-xl px-3 py-3 border flex flex-col items-center justify-center gap-1.5 transition-colors hover:opacity-80"
              style={{ background: 'var(--color-bg-input)', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--color-danger)' }}
            >
              <span className="text-[10px]">Failed to load projects</span>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-accent)' }}>Tap to retry</span>
            </button>
          ) : projects.length === 0 ? (
            <Link
              href="/projects/new"
              className="w-full rounded-xl px-3 py-3 border flex items-center justify-center gap-2 transition-colors hover:opacity-80"
              style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
            >
              <Plus size={14} />
              <span className="text-[11px] font-semibold">Create First Project</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="w-full rounded-xl px-3 py-2.5 cursor-pointer border text-left transition-colors"
                style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {(() => {
                      const Icon = activeProject ? (PROJECT_ICONS[activeProject.projectType] || DefaultProjectIcon) : DefaultProjectIcon;
                      return (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-muted)' }}>
                          <Icon size={14} style={{ color: 'var(--color-accent)' }} strokeWidth={1.5} />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {activeProject?.name || 'Select Project'}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {activeProject?._count
                          ? `${activeProject._count.locations} locations · ${activeProject._count.trades} trades`
                          : activeProject?.status || ''}
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
                  {projects.map((project) => {
                    const Icon = PROJECT_ICONS[project.projectType] || DefaultProjectIcon;
                    const needsSetup = project.status !== 'active';
                    return (
                      <button
                        key={project.id}
                        onClick={() => {
                          setActiveProject(project.id);
                          setProjectDropdownOpen(false);
                          if (needsSetup) {
                            router.push(`/projects/${project.id}/setup`);
                          } else {
                            router.push('/dashboard');
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                        style={{
                          background: project.id === activeProjectId ? 'var(--color-accent-muted)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (project.id !== activeProjectId) e.currentTarget.style.background = 'var(--color-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = project.id === activeProjectId ? 'var(--color-accent-muted)' : 'transparent';
                        }}
                      >
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-bg-input)' }}>
                          <Icon size={12} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                            {project.name}
                          </div>
                          <div className="text-[10px]" style={{ color: needsSetup ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                            {needsSetup ? 'Setup Required' : 'Active'}
                          </div>
                        </div>
                        {needsSetup && (
                          <AlertTriangle size={12} className="flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
                        )}
                      </button>
                    );
                  })}

                  <div className="border-t flex" style={{ borderColor: 'var(--color-border)' }}>
                    <Link
                      href="/projects"
                      onClick={() => setProjectDropdownOpen(false)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-3 transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <FolderKanban size={13} />
                      <span className="text-[11px] font-semibold">All Projects</span>
                    </Link>
                    <div className="w-px" style={{ background: 'var(--color-border)' }} />
                    <Link
                      href="/projects/new"
                      onClick={() => setProjectDropdownOpen(false)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-3 transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      <Plus size={13} />
                      <span className="text-[11px] font-semibold">New Project</span>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="px-2 py-2.5 flex flex-col items-center gap-1.5">
          <Link
            href="/projects"
            className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            title="All Projects"
          >
            <FolderKanban size={16} />
          </Link>
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

      {/* Navigation — driven by NAV_GROUPS + MODULE_REGISTRY */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-0.5 min-h-0">
        {NAV_GROUPS.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.label];
          return (
            <div key={group.id} className="mb-1">
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

              {/* Group items — supports plain modules and parent+children */}
              {(!isGroupCollapsed || sidebarCollapsed) && group.items.map((item) => {
                if (typeof item === 'string') {
                  return renderNavLink(item, pathname, sidebarCollapsed);
                }
                // Parent with children
                const parentMod = MODULE_REGISTRY[item.parent];
                if (!parentMod) return null;
                // Filter children by license tier
                const accessibleChildren = item.children.filter((cid) => accessibleModules.includes(cid));
                if (accessibleChildren.length === 0 && !accessibleModules.includes(item.parent)) return null;
                const isSubCollapsed = collapsedGroups[`sub:${item.parent}`];
                const hasActiveChild = item.children.some((cid) => pathname === MODULE_REGISTRY[cid]?.href);

                return (
                  <div key={item.parent}>
                    {/* Parent toggle */}
                    {!sidebarCollapsed ? (
                      <button
                        onClick={() => toggleGroup(`sub:${item.parent}`)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150 cursor-pointer"
                        style={{
                          color: hasActiveChild ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        }}
                        onMouseEnter={(e) => {
                          if (!hasActiveChild) e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          if (!hasActiveChild) e.currentTarget.style.color = 'var(--color-text-muted)';
                        }}
                      >
                        <parentMod.icon size={16} strokeWidth={hasActiveChild ? 2 : 1.5} />
                        <span className="flex-1 text-left">{parentMod.label}</span>
                        <ChevronRight
                          size={12}
                          style={{
                            transform: isSubCollapsed ? undefined : 'rotate(90deg)',
                            transition: 'transform 0.2s',
                            opacity: 0.5,
                          }}
                        />
                      </button>
                    ) : (
                      <Link
                        href={parentMod.href}
                        title={parentMod.label}
                        className="flex items-center justify-center rounded-lg px-3 py-1.5 transition-all duration-150"
                        style={{
                          color: hasActiveChild ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          background: hasActiveChild ? 'var(--color-accent-muted)' : 'transparent',
                        }}
                      >
                        <parentMod.icon size={16} strokeWidth={hasActiveChild ? 2 : 1.5} />
                      </Link>
                    )}

                    {/* Children (indented) */}
                    {!isSubCollapsed && !sidebarCollapsed && item.children.map((childId) =>
                      renderNavLink(childId, pathname, sidebarCollapsed, true)
                    )}
                  </div>
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
