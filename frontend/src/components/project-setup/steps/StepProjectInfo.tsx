'use client';

import { MapPin, Calendar, DollarSign } from 'lucide-react';
import type { SetupStepProps } from '../types';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:ring-1"
      style={{
        background: 'var(--color-bg-input)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      }}
    />
  );
}

function generateCode(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.substring(0, 3).toUpperCase())
    .join('-')
    .substring(0, 15);
}

export default function StepProjectInfo({ state, onStateChange }: SetupStepProps) {
  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Project Information
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Enter your project details. Code is auto-generated from the name but can be edited.
      </p>

      <div className="space-y-5">
        {/* Name & Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Project Name" required>
            <Input
              value={state.projectName}
              onChange={(v) => {
                const updates: Partial<typeof state> = { projectName: v };
                if (!state.projectCode || state.projectCode === generateCode(state.projectName)) {
                  updates.projectCode = generateCode(v);
                }
                onStateChange(updates);
              }}
              placeholder="e.g. Hotel Sapphire Istanbul"
            />
          </Field>
          <Field label="Project Code" required>
            <Input
              value={state.projectCode || ''}
              onChange={(v) => onStateChange({ projectCode: v.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
              placeholder="e.g. HSI-001"
            />
          </Field>
        </div>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={state.projectDescription || ''}
            onChange={(e) => onStateChange({ projectDescription: e.target.value })}
            rows={2}
            placeholder="Brief project description..."
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none focus:ring-1"
            style={{
              background: 'var(--color-bg-input)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </Field>

        {/* Dates */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} style={{ color: 'var(--color-cyan)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>Schedule</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Planned Start">
              <Input
                type="date"
                value={state.plannedStart || ''}
                onChange={(v) => onStateChange({ plannedStart: v })}
              />
            </Field>
            <Field label="Planned Finish">
              <Input
                type="date"
                value={state.plannedFinish || ''}
                onChange={(v) => onStateChange({ plannedFinish: v })}
              />
            </Field>
          </div>
        </div>

        {/* Location */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} style={{ color: 'var(--color-success)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>Location</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="City">
              <Input
                value={state.projectCity || ''}
                onChange={(v) => onStateChange({ projectCity: v })}
                placeholder="e.g. Istanbul"
              />
            </Field>
            <Field label="Country">
              <Input
                value={state.projectCountry || ''}
                onChange={(v) => onStateChange({ projectCountry: v })}
                placeholder="e.g. Turkey"
              />
            </Field>
            <Field label="Address">
              <Input
                value={state.projectAddress || ''}
                onChange={(v) => onStateChange({ projectAddress: v })}
                placeholder="Site address"
              />
            </Field>
          </div>
        </div>

        {/* Budget */}
        <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={14} style={{ color: 'var(--color-accent)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>Budget</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Budget">
              <Input
                type="number"
                value={state.projectBudget || ''}
                onChange={(v) => onStateChange({ projectBudget: v })}
                placeholder="e.g. 5000000"
              />
            </Field>
            <Field label="Currency">
              <select
                value={state.currency || 'USD'}
                onChange={(e) => onStateChange({ currency: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                style={{
                  background: 'var(--color-bg-input)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (&euro;)</option>
                <option value="GBP">GBP (&pound;)</option>
                <option value="TRY">TRY (&#8378;)</option>
                <option value="AED">AED</option>
                <option value="SAR">SAR</option>
              </select>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
