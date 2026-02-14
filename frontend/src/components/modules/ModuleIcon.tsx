'use client';

import Image from 'next/image';
import { MODULE_REGISTRY, type ModuleId } from '@/lib/modules';

interface ModuleIconProps {
  /** Module identifier — looks up SVG path from the registry */
  moduleId: ModuleId;
  /** Pixel size (width & height) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders the branded SVG icon for a SmartCon360 module.
 *
 * Icons live in /public/icons/modules/ and are referenced
 * via the centralized MODULE_REGISTRY — nothing is hardcoded here.
 */
export default function ModuleIcon({ moduleId, size = 40, className = '' }: ModuleIconProps) {
  const mod = MODULE_REGISTRY[moduleId];
  if (!mod) return null;

  return (
    <Image
      src={mod.svgIcon}
      alt={`${mod.brandName} icon`}
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
}
