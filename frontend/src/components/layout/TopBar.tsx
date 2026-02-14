'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Search, Bell, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react';

export default function TopBar({ title }: { title: string }) {
  const router = useRouter();
  const { theme, toggleTheme } = useUIStore();
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
      className="h-14 border-b flex items-center justify-between px-6 lg:px-8 flex-shrink-0"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      <h1
        className="text-[15px] font-semibold tracking-[-0.01em]"
        style={{ color: 'var(--color-text)' }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl w-52"
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
          className="w-9 h-9 rounded-xl flex items-center justify-center relative transition-colors"
          style={{ background: 'var(--color-bg-input)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)'; }}
        >
          <Bell size={15} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
          <div
            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--color-danger)' }}
          />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
            style={{ background: menuOpen ? 'var(--color-bg-hover)' : 'transparent' }}
            onMouseEnter={(e) => { if (!menuOpen) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
            onMouseLeave={(e) => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
            >
              {initials}
            </div>
            {user && (
              <>
                <div className="hidden md:block text-left">
                  <div className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </div>
                </div>
                <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
              </>
            )}
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="absolute right-0 top-12 w-56 rounded-xl border overflow-hidden z-50 shadow-lg"
              style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
            >
              {user && (
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </div>
                  {user.company && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
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
