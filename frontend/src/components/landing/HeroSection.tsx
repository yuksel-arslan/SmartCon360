'use client';

import { Layers } from 'lucide-react';
import { BRAND } from '@/lib/modules';
import { modules, methods } from '@/lib/i18n/login-translations';
import { ModuleList } from './ModuleList';
import { MethodologyGrid } from './MethodologyGrid';

interface HeroSectionProps {
  isDark: boolean;
  i: Record<string, string>;
}

export function HeroSection({ isDark, i }: HeroSectionProps) {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col overflow-y-auto"
      style={{
        background: isDark
          ? 'linear-gradient(170deg, #0c1017 0%, #0f1520 35%, #111824 100%)'
          : 'linear-gradient(170deg, #f8f9fb 0%, #f1f3f7 35%, #edf0f5 100%)',
      }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute rounded-full"
          style={{
            top: '-15%', left: '-5%', width: 500, height: 500,
            background: isDark ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.08)',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-20%', right: '25%', width: 600, height: 600,
            background: isDark ? 'rgba(20, 184, 166, 0.03)' : 'rgba(20, 184, 166, 0.06)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="relative p-10 pb-16" style={{ zIndex: 1 }}>
        {/* Brand */}
        <div className="flex items-center gap-3.5 mb-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isDark ? BRAND.logoDark : BRAND.logoLight}
            alt={BRAND.name}
            className="self-start"
            style={{ height: 56, width: 'auto' }}
          />
        </div>

        {/* Hero */}
        <div className="mb-12">
          <h1
            className="leading-none mb-6"
            style={{
              fontFamily: "var(--font-display), 'Georgia', serif",
              fontSize: 'clamp(36px, 4vw, 56px)',
              letterSpacing: '-1.5px',
              fontWeight: 400,
              color: isDark ? '#f1f3f7' : '#1a1a2e',
            }}
          >
            {i.heroTagline1}<br />
            <em style={{ fontStyle: 'italic', color: isDark ? '#f59e0b' : '#d97706' }}>{i.heroTagline2}</em><br />
            {i.heroTagline3}
          </h1>
          <p
            className="text-sm leading-relaxed max-w-xl"
            style={{ color: isDark ? '#8895a7' : '#64748b', fontWeight: 400 }}
          >
            {i.heroDesc}
          </p>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-4 rounded-xl overflow-hidden mb-12"
          style={{
            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 32px rgba(0,0,0,0.06)',
          }}
        >
          {[
            { value: i.stat1Value, label: i.stat1Label },
            { value: i.stat2Value, label: i.stat2Label },
            { value: i.stat3Value, label: i.stat3Label },
            { value: i.stat4Value, label: i.stat4Label },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center py-5 px-3 transition-colors"
              style={{ background: isDark ? '#151c2a' : '#ffffff' }}
            >
              <div
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: isDark ? '#f59e0b' : '#d97706', letterSpacing: '-0.5px' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px] mt-1" style={{ color: isDark ? '#556178' : '#94a3b8' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <ModuleList modules={modules} isDark={isDark} sectionTitle={i.secModules} />
        <MethodologyGrid methods={methods} isDark={isDark} sectionTitle={i.secMethods} />

        {/* AI Architecture Bar */}
        <div
          className="flex items-center gap-5 p-5 rounded-xl"
          style={{
            background: isDark ? '#151c2a' : '#ffffff',
            border: isDark ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(217,119,6,0.2)',
            boxShadow: isDark ? '0 0 80px rgba(245,158,11,0.06)' : '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="w-11 h-11 min-w-11 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              boxShadow: '0 4px 20px rgba(245,158,11,0.2)',
            }}
          >
            <Layers size={20} style={{ color: '#fff' }} />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-bold mb-1" style={{ color: isDark ? '#f1f3f7' : '#1a1a2e' }}>
              {i.aiTitle}
            </div>
            <div className="text-[12px] leading-relaxed" style={{ color: isDark ? '#8895a7' : '#64748b' }}>
              {i.aiDesc}
            </div>
            <div className="flex gap-2 mt-2.5 flex-wrap">
              {['L1 · Core Engine', 'L2 · Gemini AI', 'L3 · DRL Engine'].map((layer) => (
                <span
                  key={layer}
                  className="text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(217,119,6,0.1)',
                    color: isDark ? '#f59e0b' : '#d97706',
                    border: isDark ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(217,119,6,0.2)',
                    letterSpacing: '0.3px',
                  }}
                >
                  {layer}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-12 pt-5 text-[11px]"
          style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)', color: isDark ? '#556178' : '#94a3b8' }}
        >
          {i.copyright}
        </div>
      </div>
    </div>
  );
}
