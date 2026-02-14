import { create } from 'zustand';

interface UIState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('light', next === 'light');
      }
      return { theme: next };
    }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('light', theme === 'light');
    }
    set({ theme });
  },
}));
