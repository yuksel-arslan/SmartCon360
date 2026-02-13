'use client';
import TopBar from '@/components/layout/TopBar';
export default function ResourcesPage() {
  return (<><TopBar title="Resources" /><div className="flex-1 overflow-auto p-6"><div className="rounded-xl border p-8 flex items-center justify-center min-h-[400px]" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}><div className="text-center"><h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Resource Manager</h2><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Crews, equipment, materials — Phase 3</p></div></div></div></>);
}
