'use client';
import TopBar from '@/components/layout/TopBar';
export default function TaktEditorPage() {
  return (<><TopBar title="Takt Editor" /><div className="flex-1 overflow-auto p-6"><div className="rounded-xl border p-8 flex items-center justify-center min-h-[400px]" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}><div className="text-center"><h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Takt Plan Editor</h2><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Drag & drop takt grid — Phase 2</p></div></div></div></>);
}
