'use client';

import { useUIStore } from '@/stores/uiStore';
import { Search, Bell, Sun, Moon } from 'lucide-react';

export default function TopBar({ title }: { title: string }) {
  const { theme, toggleTheme } = useUIStore();

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-6 flex-shrink-0"
      style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
    >
      <h1 className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border w-52"
          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
        >
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-xs w-full"
            style={{ color: 'var(--color-text)' }}
          />
        </div>

        {/* Notifications */}
        <button
          className="w-9 h-9 rounded-lg border flex items-center justify-center relative"
          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
        >
          <Bell size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-danger)' }} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg border flex items-center justify-center"
          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)' }}
        >
          {theme === 'dark' ? (
            <Sun size={16} style={{ color: 'var(--color-text-secondary)' }} />
          ) : (
            <Moon size={16} style={{ color: 'var(--color-text-secondary)' }} />
          )}
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))' }}
        >
          YA
        </div>
      </div>
    </header>
  );
}
