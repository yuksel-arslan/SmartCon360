'use client';

import Image from 'next/image';
import { MODULE_REGISTRY, type ModuleId } from '@/lib/modules';

interface ModulePageHeaderProps {
  /** Module identifier — all metadata is pulled from the registry */
  moduleId: ModuleId;
  /** Optional override for the subtitle / description */
  description?: string;
  /** Optional right-side actions (buttons, filters, etc.) */
  children?: React.ReactNode;
}

/**
 * Standardised page header for every module page.
 *
 * Renders the module SVG icon, brand name, and description
 * pulled dynamically from MODULE_REGISTRY.
 */
export default function ModulePageHeader({ moduleId, description, children }: ModulePageHeaderProps) {
  const mod = MODULE_REGISTRY[moduleId];
  if (!mod) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-accent-muted)' }}
        >
          <Image
            src={mod.svgIcon}
            alt={`${mod.brandName} icon`}
            width={28}
            height={28}
            priority
          />
        </div>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {mod.brandName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {description ?? mod.description}
          </p>
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
