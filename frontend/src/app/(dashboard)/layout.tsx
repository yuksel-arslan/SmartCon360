'use client';

import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { useUIStore } from '@/stores/uiStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { mobileSidebarOpen, setMobileSidebar } = useUIStore();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile sidebar — overlay drawer */}
        {mobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileSidebar(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 md:hidden" style={{ width: 280 }}>
              <Sidebar />
            </div>
          </>
        )}

        <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
