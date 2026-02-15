'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useProjectStore } from '@/stores/projectStore';
import { AlertTriangle, ArrowRight, Settings2 } from 'lucide-react';

/**
 * SetupGuard — shows a warning banner and redirects when
 * the active project's setup has not been finalized.
 *
 * Wraps dashboard content. Does NOT block rendering — shows
 * a prominent banner with a link to the setup page.
 */
export default function SetupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { projects, activeProjectId } = useProjectStore();
  const [dismissed, setDismissed] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const needsSetup = activeProject && activeProject.status !== 'active';

  // Exempt pages: setup page itself, projects list, new project wizard, settings
  const isExemptPage =
    pathname.includes('/setup') ||
    pathname === '/projects' ||
    pathname === '/projects/new' ||
    pathname === '/settings';

  // Reset dismissed state when project changes
  useEffect(() => {
    setDismissed(false);
  }, [activeProjectId]);

  // Auto-redirect to setup on first load if setup incomplete
  useEffect(() => {
    if (needsSetup && !isExemptPage && activeProjectId) {
      router.replace(`/projects/${activeProjectId}/setup`);
    }
  }, [needsSetup, isExemptPage, activeProjectId, router]);

  // Don't show banner on exempt pages or after dismissal
  if (!needsSetup || isExemptPage || dismissed) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Setup warning banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: 'rgba(245,158,11,0.08)',
          borderColor: 'rgba(245,158,11,0.2)',
        }}
      >
        <AlertTriangle size={16} className="flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>
            Project setup is not complete.
          </span>
          <span className="text-[12px] ml-1" style={{ color: 'var(--color-text-muted)' }}>
            Complete the setup wizard to enable all features.
          </span>
        </div>
        <button
          onClick={() => router.push(`/projects/${activeProjectId}/setup`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
          style={{ background: 'var(--color-warning)' }}
        >
          <Settings2 size={12} />
          Complete Setup
          <ArrowRight size={10} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-[18px] leading-none px-1 transition-opacity hover:opacity-60 flex-shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
          title="Dismiss"
        >
          &times;
        </button>
      </div>
      {children}
    </>
  );
}
