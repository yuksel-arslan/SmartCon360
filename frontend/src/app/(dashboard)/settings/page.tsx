'use client';
import TopBar from '@/components/layout/TopBar';
import { useUIStore } from '@/stores/uiStore';
import { Sun, Moon } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  return (
    <>
      <TopBar title="Settings" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-md">
          <div className="rounded-xl border p-5" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-base font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Appearance</h3>
            <div className="flex gap-3">
              {(['dark', 'light'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTheme(m)}
                  className="flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 cursor-pointer"
                  style={{
                    borderColor: theme === m ? 'var(--color-accent)' : 'var(--color-border)',
                    background: theme === m ? 'rgba(59,130,246,0.08)' : 'var(--color-bg-input)',
                  }}
                >
                  {m === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
                  <span className="text-xs font-semibold capitalize">{m} Mode</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
