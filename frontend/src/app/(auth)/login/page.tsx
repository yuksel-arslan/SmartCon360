'use client';

import { useState, useEffect, Suspense } from 'react';
import { translations, type Lang } from '@/lib/i18n/login-translations';
import { HeroSection } from '@/components/landing/HeroSection';
import { LoginForm } from '@/components/landing/LoginForm';

function LoginContent() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lang');
      if (saved === 'en' || saved === 'tr') return saved;
    }
    return 'en';
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
      return !window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    return true;
  });

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

  const i = translations[lang];

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <HeroSection isDark={isDark} i={i} />
      <LoginForm
        lang={lang}
        switchLang={switchLang}
        isDark={isDark}
        toggleTheme={toggleTheme}
        i={i}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
