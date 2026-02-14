'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });

  const storeAuth = (data: { user: Record<string, unknown>; accessToken: string }) => {
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

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
      {/* Left — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(135deg, #0B0F1A 0%, #1a1f3a 50%, #0B0F1A 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/smartcon360-logo-dark.svg" alt="SmartCon360" style={{ height: 80, width: 'auto' }} />

        <div className="max-w-md">
          <h1
            className="text-4xl font-extrabold text-white leading-tight mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AI-Powered Construction Planning
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Combine Takt Time, Location-Based Management, and Last Planner System with
            artificial intelligence. Automate plan generation, predict delays, and deliver
            projects faster.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { value: '40%', label: 'Faster Delivery' },
              { value: '93%', label: 'PPC Average' },
              { value: '60%', label: 'Less Rework' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
                  {stat.value}
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          SmartCon360 &copy; 2026 — All rights reserved
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/smartcon360-logo-light.svg" alt="SmartCon360" style={{ height: 56, width: 'auto' }} />
          </div>

          <h2
            className="text-2xl font-extrabold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            {isLogin ? 'Sign in to your SmartCon360 account' : 'Start your free trial today'}
          </p>

          {error && (
            <div className="rounded-lg px-4 py-2.5 text-[12px] font-medium mb-4" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>
                    First Name
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
                    Last Name
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
                Email
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
                Password
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
                  {isLogin ? 'Sign In' : 'Create Account'}
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
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
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
              Try Demo Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
