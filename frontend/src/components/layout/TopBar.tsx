'use client';

import { useUIStore } from '@/stores/uiStore';
import { Search, Bell, Sun, Moon } from 'lucide-react';

export default function TopBar({ title }: { title: string }) {
  const { theme, toggleTheme } = useUIStore();

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

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))' }}
        >
          YA
        </div>
      </div>
    </header>
  );
}
