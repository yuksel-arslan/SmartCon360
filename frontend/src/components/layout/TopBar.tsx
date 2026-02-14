'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Search, Bell, Sun, Moon, LogOut, User, ChevronDown, Menu } from 'lucide-react';

export default function TopBar({ title }: { title: string }) {
  const router = useRouter();
  const { theme, toggleTheme, setMobileSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : '?';

  const handleLogout = async () => {
    setMenuOpen(false);
    logout();
    router.push('/login');
  };

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0 gap-2"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setMobileSidebar(true)}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: 'var(--color-bg-input)' }}
        >
          <Menu size={18} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
        </button>
        <h1
          className="text-[14px] sm:text-[15px] font-semibold tracking-[-0.01em] truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Search — hidden on mobile */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl w-40 md:w-52"
          style={{ background: 'var(--color-bg-input)' }}
        >
          <Search size={13} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
          <input
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-[12px] w-full"
            style={{ color: 'var(--color-text)' }}
          />
        </div>

        {/* Notifications */}
        <button
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center relative transition-colors flex-shrink-0"
          style={{ background: 'var(--color-bg-input)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; }}
        >
          <Bell size={15} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
          <div
            className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--color-danger)' }}
          />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          style={{ background: 'var(--color-bg-input)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; }}
        >
          {theme === 'dark' ? (
            <Sun size={15} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
          ) : (
            <Moon size={15} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
          )}
        </button>

        {/* User menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1.5 rounded-xl transition-colors"
            style={{ background: menuOpen ? 'var(--color-bg-hover)' : 'transparent' }}
            onMouseEnter={(e) => { if (!menuOpen) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
            onMouseLeave={(e) => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
            >
              {initials}
            </div>
            {user && (
              <>
                <div className="hidden lg:block text-left">
                  <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </div>
                </div>
                <ChevronDown size={12} className="hidden sm:block" style={{ color: 'var(--color-text-muted)' }} />
              </>
            )}
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="absolute right-0 top-12 w-[calc(100vw-24px)] sm:w-56 max-w-[14rem] rounded-xl border overflow-hidden z-50 shadow-lg"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              {user && (
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </div>
                  {user.company && (
                    <div className="text-[10px] mt-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {user.company}
                    </div>
                  )}
                </div>
              )}

              <div className="py-1">
                <button
                  onClick={() => { setMenuOpen(false); router.push('/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors text-left"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <User size={14} strokeWidth={1.5} />
                  Profile & Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium transition-colors text-left"
                  style={{ color: 'var(--color-danger)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut size={14} strokeWidth={1.5} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
