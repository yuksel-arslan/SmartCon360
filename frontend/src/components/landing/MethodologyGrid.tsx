'use client';

interface MethodItem {
  label: string;
  title: string;
  desc: string;
}

interface MethodologyGridProps {
  methods: MethodItem[];
  isDark: boolean;
  sectionTitle: string;
}

export function MethodologyGrid({ methods, isDark, sectionTitle }: MethodologyGridProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-6 h-0.5 rounded-sm" style={{ background: '#14b8a6' }} />
        <span
          className="text-[11px] font-bold uppercase"
          style={{ letterSpacing: '1.8px', color: isDark ? '#556178' : '#94a3b8' }}
        >
          {sectionTitle}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-12">
        {methods.map((m) => (
          <div
            key={m.label}
            className="p-5 rounded-xl transition-all"
            style={{
              border: isDark ? '1px solid rgba(20,184,166,0.2)' : '1px solid rgba(20,184,166,0.25)',
              background: isDark ? 'rgba(20,184,166,0.04)' : 'rgba(20,184,166,0.04)',
            }}
          >
            <div
              className="text-[10px] font-semibold uppercase mb-2"
              style={{ fontFamily: 'var(--font-mono)', color: '#14b8a6', letterSpacing: '1.2px' }}
            >
              {m.label}
            </div>
            <div className="text-[14px] font-bold mb-1.5" style={{ color: isDark ? '#f1f3f7' : '#1a1a2e', letterSpacing: '-0.2px' }}>
              {m.title}
            </div>
            <div className="text-[12px] leading-relaxed" style={{ color: isDark ? '#8895a7' : '#64748b' }}>
              {m.desc}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
