'use client';

import type { StepProps } from '../types';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}
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
        // @ts-expect-error CSS custom property
        '--tw-ring-color': 'var(--color-accent)',
      }}
    />
  );
}

export default function StepBasicInfo({ data, onChange }: StepProps) {
  const generateCode = (name: string) => {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.substring(0, 3).toUpperCase())
      .join('-')
      .substring(0, 15);
  };

  return (
    <div>
      <h2
        className="text-xl font-medium mb-1"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Project Details
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Enter your project information. Code is auto-generated but editable.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Project Name *">
            <Input
              value={data.name}
              onChange={(v) => {
                const updates: Partial<typeof data> = { name: v };
                if (!data.code || data.code === generateCode(data.name)) {
                  updates.code = generateCode(v);
                }
                onChange(updates);
              }}
              placeholder="e.g. Hotel Sapphire Istanbul"
            />
          </Field>
          <Field label="Project Code *">
            <Input
              value={data.code}
              onChange={(v) => onChange({ code: v.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
              placeholder="e.g. HSI-001"
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Planned Start">
            <Input
              type="date"
              value={data.plannedStart}
              onChange={(v) => onChange({ plannedStart: v })}
            />
          </Field>
          <Field label="Planned Finish">
            <Input
              type="date"
              value={data.plannedFinish}
              onChange={(v) => onChange({ plannedFinish: v })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="City">
            <Input
              value={data.city}
              onChange={(v) => onChange({ city: v })}
              placeholder="e.g. Istanbul"
            />
          </Field>
          <Field label="Country">
            <Input
              value={data.country}
              onChange={(v) => onChange({ country: v })}
              placeholder="e.g. Turkey"
            />
          </Field>
          <Field label="Address">
            <Input
              value={data.address}
              onChange={(v) => onChange({ address: v })}
              placeholder="Site address"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Budget">
            <Input
              type="number"
              value={data.budget}
              onChange={(v) => onChange({ budget: v })}
              placeholder="e.g. 5000000"
            />
          </Field>
          <Field label="Currency">
            <select
              value={data.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
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
  );
}
