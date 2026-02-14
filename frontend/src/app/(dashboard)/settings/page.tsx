'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Sun, Moon, Users, Shield, Palette, UserCog } from 'lucide-react';
import UsersTab from './UsersTab';
import RolesTab from './RolesTab';
import ProjectTeamTab from './ProjectTeamTab';

type SettingsTab = 'appearance' | 'users' | 'roles' | 'team';

const TABS: { id: SettingsTab; label: string; icon: typeof Palette; adminOnly?: boolean }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'users', label: 'Users', icon: Users, adminOnly: true },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield, adminOnly: true },
  { id: 'team', label: 'Project Team', icon: UserCog },
];

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  const { hasRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const isAdmin = hasRole('admin');

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <>
      <TopBar title="Settings" />
      <div className="flex-1 overflow-auto">
        {/* Tab Navigation */}
        <div className="border-b px-6 pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex gap-1">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium rounded-t-lg transition-colors cursor-pointer"
                  style={{
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    background: isActive ? 'var(--color-bg-card)' : 'transparent',
                    borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'appearance' && (
            <div className="max-w-md">
              <div
                className="rounded-xl border p-5"
                style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              >
                <h3
                  className="text-base font-medium mb-4"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Appearance
                </h3>
                <div className="flex gap-3">
                  {(['dark', 'light'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTheme(m)}
                      className="flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 cursor-pointer"
                      style={{
                        borderColor:
                          theme === m ? 'var(--color-accent)' : 'var(--color-border)',
                        background:
                          theme === m ? 'rgba(232,115,26,0.08)' : 'var(--color-bg-input)',
                      }}
                    >
                      {m === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
                      <span className="text-xs font-semibold capitalize">{m} Mode</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && isAdmin && <UsersTab />}
          {activeTab === 'roles' && isAdmin && <RolesTab />}
          {activeTab === 'team' && <ProjectTeamTab />}
        </div>
      </div>
    </>
  );
}
