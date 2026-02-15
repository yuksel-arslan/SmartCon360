'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Globe, Layers, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { BRAND } from '@/lib/modules';

// ── i18n ───────────────────────────────────────────────
type Lang = 'en' | 'tr';

const t: Record<Lang, Record<string, string>> = {
  en: {
    heroTagline1: 'One Platform,',
    heroTagline2: 'NextGen Construction Management',
    heroTagline3: '— Zero Compromise.',
    heroDesc:
      'SmartCon360 brings scheduling, cost control, quality, safety, procurement, risk, claims, communication, stakeholder management, and ESG together in one AI-powered platform. Built on Lean Construction principles — LBMS, Takt Time, and Last Planner System — 13 specialized modules cover all 10 PMBOK knowledge areas plus OHS and environmental management with a 3-layer intelligence architecture.',
    stat1Value: '13',
    stat1Label: 'Integrated Modules',
    stat2Value: '10+2',
    stat2Label: 'PMBOK + OHS & ESG',
    stat3Value: '3-Layer',
    stat3Label: 'AI Architecture',
    stat4Value: '27',
    stat4Label: 'Microservices',
    secModules: '13 Specialized Modules',
    secMethods: 'Methodology & Standards',
    aiTitle: '3-Layer AI Architecture',
    aiDesc: 'Layer 1: Core Engine works without AI dependency. Layer 2: AI-Enhanced with Gemini API. Layer 3: Deep Reinforcement Learning for adaptive replanning and simulation.',
    copyright: `${BRAND.name} © 2026 — AI-Powered Construction Management`,
    welcomeBack: 'Welcome back',
    createAccount: 'Create account',
    signInSubtitle: 'Sign in to your SmartCon360 account',
    signUpSubtitle: 'Start your free trial today',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    password: 'Password',
    passwordHint: 'Min 8 characters, one uppercase letter, one number',
    signIn: 'Sign In',
    createAccountBtn: 'Create Account',
    noAccount: "Don't have an account? Sign up",
    hasAccount: 'Already have an account? Sign in',
    tryDemo: 'Try Demo Account',
    googleContinue: 'Continue with Google',
    or: 'or',
  },
  tr: {
    heroTagline1: 'Tek Platform,',
    heroTagline2: 'Yeni Nesil İnşaat Yönetimi',
    heroTagline3: '— Sıfır Taviz.',
    heroDesc:
      'SmartCon360; planlama, maliyet kontrolu, kalite, guvenlik, tedarik, risk, talep, iletisim, paydas yonetimi ve ESG\'yi tek bir YZ destekli platformda birlestirir. Yalin Insaat prensipleri — LBMS, Takt Zamani ve Son Planlayici Sistemi — uzerine insa edilen 13 uzman modul, tum 10 PMBOK bilgi alanini, ISG ve cevre yonetimini 3 katmanli zeka mimarisiyle kapsar.',
    stat1Value: '13',
    stat1Label: 'Entegre Modul',
    stat2Value: '10+2',
    stat2Label: 'PMBOK + ISG & ESG',
    stat3Value: '3 Katman',
    stat3Label: 'YZ Mimarisi',
    stat4Value: '27',
    stat4Label: 'Mikroservis',
    secModules: '13 Uzman Modul',
    secMethods: 'Metodoloji & Standartlar',
    aiTitle: '3 Katmanli YZ Mimarisi',
    aiDesc: 'Katman 1: YZ bagimsiz cekirdek motor. Katman 2: Gemini API ile YZ destekli. Katman 3: Uyarlanabilir yeniden planlama ve simulasyon icin Derin Pekistirmeli Ogrenme.',
    copyright: `${BRAND.name} © 2026 — YZ Destekli Insaat Yonetimi`,
    welcomeBack: 'Tekrar hos geldiniz',
    createAccount: 'Hesap olustur',
    signInSubtitle: 'SmartCon360 hesabiniza giris yapin',
    signUpSubtitle: 'Ucretsiz denemenize bugun baslayin',
    firstName: 'Ad',
    lastName: 'Soyad',
    email: 'E-posta',
    password: 'Sifre',
    passwordHint: 'En az 8 karakter, bir buyuk harf, bir rakam',
    signIn: 'Giris Yap',
    createAccountBtn: 'Hesap Olustur',
    noAccount: 'Hesabiniz yok mu? Kayit olun',
    hasAccount: 'Zaten hesabiniz var mi? Giris yapin',
    tryDemo: 'Demo Hesabi Dene',
    googleContinue: 'Google ile devam et',
    or: 'veya',
  },
};

const modules = [
  { name: 'TaktFlow', icon: '/icons/modules/taktflow.svg', desc: 'Planning & scheduling — takt time, flowline, LPS, LBS hierarchy, constraint management', tag: 'Schedule · Scope' },
  { name: 'CostPilot', icon: '/icons/modules/costpilot.svg', desc: 'Cost & EVM management — budgets, CPI/SPI, S-curve, forecasting', tag: 'Cost Management' },
  { name: 'CrewFlow', icon: '/icons/modules/crewflow.svg', desc: 'Resource management — labor crews, equipment tracking, material allocation', tag: 'Resource Mgmt' },
  { name: 'QualityGate', icon: '/icons/modules/qualitygate.svg', desc: 'Quality control — NCR tracking, inspection checklists, FTR rate, COPQ', tag: 'Quality Mgmt' },
  { name: 'SafeZone', icon: '/icons/modules/safezone.svg', desc: 'OHS / HSE — risk matrix, incident reporting, PTW, toolbox talks', tag: 'OHS / HSE' },
  { name: 'VisionAI', icon: '/icons/modules/visionai.svg', desc: 'Visual progress tracking — photo analysis, defect detection via Gemini Vision', tag: 'AI · Layer 2' },
  { name: 'SupplyChain AI', icon: '/icons/modules/supplychain.svg', desc: 'Procurement — MRP, JIT delivery, supplier management, RFQ workflows', tag: 'Procurement' },
  { name: 'RiskRadar', icon: '/icons/modules/riskradar.svg', desc: 'Risk management — risk register, heat map, what-if analysis, mitigation tracking', tag: 'Risk Mgmt' },
  { name: 'ClaimShield', icon: '/icons/modules/claimshield.svg', desc: 'Claims & change orders — claims register, delay analysis, change order management', tag: 'Scope · Claims' },
  { name: 'CommHub', icon: '/icons/modules/commhub.svg', desc: 'Communication management — RFI, transmittals, meeting minutes, escalation engine', tag: 'Communication' },
  { name: 'StakeHub', icon: '/icons/modules/stakehub.svg', desc: 'Stakeholder management — stakeholder register, authority matrix, engagement tracking', tag: 'Stakeholder' },
  { name: 'GreenSite', icon: '/icons/modules/greensite.svg', desc: 'ESG & environmental — carbon tracking, waste management, LEED/BREEAM compliance', tag: 'ESG' },
  { name: 'SmartCon360 Hub', icon: '/icons/modules/hub.svg', desc: 'Master AI orchestrator — cross-module synthesis, Project Health Score, unified dashboard', tag: 'Integration' },
];

const methods = [
  {
    label: 'PMBOK 7',
    title: 'Project Management Body of Knowledge',
    desc: 'All 10 knowledge areas natively embedded — scope, schedule, cost, quality, resource, communication, risk, procurement, stakeholder & integration management.',
  },
  {
    label: 'CMAA',
    title: 'Construction Management Association of America',
    desc: 'Owner representation, program management and CM-at-Risk best practices woven into every module workflow and decision gate.',
  },
  {
    label: 'LBMS + LPS',
    title: 'Lean Construction Methods',
    desc: 'Location-Based Management System, Takt Time Construction, Last Planner System — constraint-based pull planning with flowline visualization.',
  },
];

// Google OAuth2 helper — access code client for login + Drive scope
function getGoogleOAuth2(): {
  initCodeClient: (config: Record<string, unknown>) => { requestCode: () => void };
} | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).google?.accounts?.oauth2;
}

export default function LoginPage() {
  const router = useRouter();
  const { token, initialize, setAuth } = useAuthStore();
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lang');
      if (saved === 'en' || saved === 'tr') return saved;
    }
    return 'en';
  });
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
      return !window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    return true;
  });

  // Sync theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('light', !isDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('light', !newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const switchLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const i = t[lang];

  // Initialize auth and redirect if already logged in
  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    if (token) router.replace('/dashboard');
  }, [token, router]);

  const storeAuth = useCallback((data: { user: Record<string, unknown>; accessToken: string; refreshToken?: string }) => {
    setAuth(data.accessToken, {
      id: data.user.id as string,
      email: data.user.email as string,
      firstName: data.user.firstName as string,
      lastName: data.user.lastName as string,
      company: data.user.company as string | undefined,
      avatarUrl: data.user.avatarUrl as string | undefined,
      roles: (data.user.roles as { role: string; projectId?: string | null }[]) || [],
    }, data.refreshToken);
  }, [setAuth]);

  // Google OAuth2 — login + Drive access in one step
  const [googleReady, setGoogleReady] = useState(false);

  const handleGoogleLogin = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !getGoogleOAuth2()) return;

    setLoading(true);
    setError('');

    const client = getGoogleOAuth2()!.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      ux_mode: 'popup',
      callback: async (response: { code?: string; error?: string }) => {
        if (response.error || !response.code) {
          setLoading(false);
          if (response.error !== 'access_denied') {
            setError(response.error || 'Google sign-in cancelled');
          }
          return;
        }

        try {
          const res = await fetch('/api/v1/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: response.code }),
          });
          const json = await res.json();
          if (!res.ok) {
            const message = typeof json.error === 'object' ? json.error.message : json.error;
            throw new Error(message || 'Google sign-in failed');
          }
          storeAuth(json.data);
          router.push('/dashboard');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed');
        } finally {
          setLoading(false);
        }
      },
    });

    client.requestCode();
  }, [storeAuth, router]);

  // Load Google Identity Services SDK
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const body = isLogin
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        const message = typeof json.error === 'object' ? json.error.message : json.error;
        throw new Error(message || `Authentication failed (${res.status})`);
      }

      storeAuth(json.data);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/demo', { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        const message = typeof json.error === 'object' ? json.error.message : json.error;
        throw new Error(message || 'Demo login failed');
      }

      storeAuth(json.data);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Left — Branding & Content */}
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
                fontFamily: "'Instrument Serif', 'Georgia', serif",
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

          {/* Modules Section */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-6 h-0.5 rounded-sm" style={{ background: isDark ? '#f59e0b' : '#d97706' }} />
            <span
              className="text-[11px] font-bold uppercase"
              style={{ letterSpacing: '1.8px', color: isDark ? '#556178' : '#94a3b8' }}
            >
              {i.secModules}
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

          {/* Methodologies Section */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-6 h-0.5 rounded-sm" style={{ background: '#14b8a6' }} />
            <span
              className="text-[11px] font-bold uppercase"
              style={{ letterSpacing: '1.8px', color: isDark ? '#556178' : '#94a3b8' }}
            >
              {i.secMethods}
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

      {/* Right — Form */}
      <div className="flex-1 flex flex-col p-8">
        {/* Theme + Language toggle — top right */}
        <div className="flex justify-end gap-2 mb-4">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark
              ? <Sun size={15} style={{ color: 'var(--color-text-muted)' }} />
              : <Moon size={15} style={{ color: 'var(--color-text-muted)' }} />
            }
          </button>

          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium"
            style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
          >
            <Globe size={14} style={{ color: 'var(--color-text-muted)' }} />
            <button
              onClick={() => switchLang('en')}
              className="px-1.5 py-0.5 rounded transition-colors"
              style={{
                color: lang === 'en' ? '#fff' : 'var(--color-text-muted)',
                background: lang === 'en' ? BRAND.accentColor : 'transparent',
              }}
            >
              EN
            </button>
            <button
              onClick={() => switchLang('tr')}
              className="px-1.5 py-0.5 rounded transition-colors"
              style={{
                color: lang === 'tr' ? '#fff' : 'var(--color-text-muted)',
                background: lang === 'tr' ? BRAND.accentColor : 'transparent',
              }}
            >
              TR
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logoLight} alt={BRAND.name} style={{ height: 56, width: 'auto' }} />
          </div>

          <h2
            className="text-2xl font-extrabold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {isLogin ? i.welcomeBack : i.createAccount}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            {isLogin ? i.signInSubtitle : i.signUpSubtitle}
          </p>

          {error && (
            <div className="rounded-lg px-4 py-2.5 text-[12px] font-medium mb-4" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          {/* Google Sign-In — OAuth2 code flow with Drive access */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => {
                if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                  setError(lang === 'tr'
                    ? 'Google ile giris henuz yapilandirilmadi. Lutfen e-posta ile giris yapin.'
                    : 'Google Sign-In is not configured yet. Please use email login.');
                  return;
                }
                if (!googleReady) {
                  setError(lang === 'tr' ? 'Google SDK yukleniyor...' : 'Loading Google SDK...');
                  return;
                }
                handleGoogleLogin();
              }}
              disabled={loading}
              className="w-full py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-3 transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg-card)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {i.googleContinue}
            </button>
            <p className="mt-2 text-center text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'tr'
                ? 'Proje yoneticileri icin Google ile giris zorunludur — proje dosyalari Drive\'a kaydedilir.'
                : 'Google sign-in is required for project managers — project files are saved to your Drive.'}
            </p>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{i.or}</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                    {i.firstName}
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--color-bg-input)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    placeholder="Yuksel"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                    {i.lastName}
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--color-bg-input)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    placeholder="Arslan"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                {i.email}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-bg-input)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                {i.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors pr-10"
                  style={{
                    background: 'var(--color-bg-input)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {i.passwordHint}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? i.signIn : i.createAccountBtn}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-xs font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              {isLogin ? i.noAccount : i.hasAccount}
            </button>
          </div>

          {/* Demo shortcut */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full py-2 rounded-lg border text-xs font-medium transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-card)',
              }}
            >
              {i.tryDemo}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
