'use client';

interface ModuleItem {
  name: string;
  icon: string;
  desc: string;
  tag: string;
}

interface ModuleListProps {
  modules: ModuleItem[];
  isDark: boolean;
  sectionTitle: string;
}

export function ModuleList({ modules, isDark, sectionTitle }: ModuleListProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-6 h-0.5 rounded-sm" style={{ background: isDark ? '#f59e0b' : '#d97706' }} />
        <span
          className="text-[11px] font-bold uppercase"
          style={{ letterSpacing: '1.8px', color: isDark ? '#556178' : '#94a3b8' }}
        >
          {sectionTitle}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-12">
        {modules.map((m) => (
          <div
            key={m.name}
            className="flex items-start gap-3 px-3.5 py-3 rounded-xl transition-all group"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#151c2a' : '#ffffff';
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
              e.currentTarget.style.boxShadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.icon}
              alt={m.name}
              className="w-9 h-9 min-w-9 rounded-lg mt-0.5 transition-transform group-hover:scale-110"
              style={{
                background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.08)',
                padding: 3,
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold" style={{ color: isDark ? '#f1f3f7' : '#1a1a2e', letterSpacing: '-0.2px' }}>
                {m.name}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: isDark ? '#556178' : '#64748b' }}>
                {m.desc}
              </div>
              <span
                className="inline-block text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(217,119,6,0.1)',
                  color: '#d97706',
                  letterSpacing: '0.3px',
                }}
              >
                {m.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
