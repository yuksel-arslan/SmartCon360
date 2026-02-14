'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import {
  Plus, Building2, Hospital, Building, Landmark, Factory, Construction,
  FolderKanban, MapPin, Calendar, Loader2, AlertCircle, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const PROJECT_ICONS: Record<string, LucideIcon> = {
  hotel: Building2,
  hospital: Hospital,
  residential: Building,
  commercial: Landmark,
  industrial: Factory,
  infrastructure: Construction,
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  hospital: 'Hospital',
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  infrastructure: 'Infrastructure',
  mixed_use: 'Mixed Use',
  educational: 'Educational',
  data_center: 'Data Center',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  planning: { bg: 'rgba(139,92,246,0.12)', color: 'var(--color-purple)', label: 'Planning' },
  active: { bg: 'rgba(16,185,129,0.12)', color: 'var(--color-success)', label: 'Active' },
  on_hold: { bg: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)', label: 'On Hold' },
  completed: { bg: 'rgba(107,114,128,0.12)', color: 'var(--color-text-muted)', label: 'Completed' },
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function ProjectsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { projects, loading, initialized, error, fetchProjects, setActiveProject } = useProjectStore();

  useEffect(() => {
    if (token && !initialized) {
      fetchProjects();
    }
  }, [token, initialized, fetchProjects]);

  const handleOpenProject = (projectId: string) => {
    setActiveProject(projectId);
    router.push('/dashboard');
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-extrabold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Projects
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {projects.length > 0
                ? `${projects.length} project${projects.length === 1 ? '' : 's'}`
                : 'Create your first project to get started'}
            </p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
          >
            <Plus size={14} />
            New Project
          </Link>
        </div>

        {/* Loading */}
        {loading && !initialized && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 mb-6 flex items-center gap-3 text-[12px]"
            style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)' }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Empty state */}
        {initialized && !loading && projects.length === 0 && !error && (
          <div
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-20 px-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--color-accent-muted)' }}
            >
              <FolderKanban size={28} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              No projects yet
            </h2>
            <p className="text-[13px] mb-6 text-center max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
              Create your first construction project to start planning with takt time, flowline scheduling, and AI-powered insights.
            </p>
            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
            >
              <Plus size={16} />
              Create First Project
            </Link>
          </div>
        )}

        {/* Project cards */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const Icon = PROJECT_ICONS[project.projectType] || FolderKanban;
              const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.planning;

              return (
                <button
                  key={project.id}
                  onClick={() => handleOpenProject(project.id)}
                  className="rounded-xl border p-5 text-left transition-all hover:shadow-lg group"
                  style={{
                    background: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  {/* Top row: icon + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--color-accent-muted)' }}
                    >
                      <Icon size={18} style={{ color: 'var(--color-accent)' }} strokeWidth={1.5} />
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>

                  {/* Name + type */}
                  <h3
                    className="text-[14px] font-bold truncate mb-0.5"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {project.name}
                  </h3>
                  <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    {PROJECT_TYPE_LABELS[project.projectType] || project.projectType}
                    {project.code && ` · ${project.code}`}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-col gap-1.5 mb-4">
                    {(project.city || project.country) && (
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        <MapPin size={12} />
                        <span className="truncate">
                          {[project.city, project.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {project.plannedStart && (
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        <Calendar size={12} />
                        <span>
                          {formatDate(project.plannedStart)}
                          {project.plannedFinish && ` — ${formatDate(project.plannedFinish)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  {project._count && (
                    <div
                      className="flex items-center gap-3 pt-3 border-t text-[10px]"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <span>{project._count.locations} locations</span>
                      <span>{project._count.trades} trades</span>
                      <span>{project._count.members} members</span>
                    </div>
                  )}

                  {/* Open arrow */}
                  <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={14} style={{ color: 'var(--color-accent)' }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
