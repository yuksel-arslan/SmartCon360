'use client';

import Image from 'next/image';
import { MODULE_REGISTRY, type ModuleId } from '@/lib/modules';

interface ModuleComingSoonProps {
  /** Module identifier — metadata is pulled from the registry */
  moduleId: ModuleId;
  /** Optional custom message to override the default description */
  message?: string;
}

/**
 * "Coming soon" placeholder card for modules still in development.
 *
 * Shows the module SVG icon, brand name, description, and
 * feature tags — all pulled from MODULE_REGISTRY.
 */
export default function ModuleComingSoon({ moduleId, message }: ModuleComingSoonProps) {
  const mod = MODULE_REGISTRY[moduleId];
  if (!mod) return null;

  return (
    <div
      className="rounded-xl border p-4 sm:p-8 md:p-12 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: 'var(--color-accent-muted)' }}
      >
        <Image
          src={mod.svgIcon}
          alt={`${mod.brandName} icon`}
          width={48}
          height={48}
        />
      </div>

      <h2 className="text-lg font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        {mod.brandName} Module
      </h2>

      <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
        {message ?? mod.description}
      </p>

      {mod.features.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {mod.features.map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: 'var(--color-accent-muted)', color: 'var(--color-accent)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
