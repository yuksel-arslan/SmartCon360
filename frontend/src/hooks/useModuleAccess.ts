// Hook: check if current user's license tier grants access to a module

import { useAuthStore, getModulesForTier, type LicenseTier } from '@/stores/authStore';

/** Returns true if the user's tier includes the given module ID */
export function useModuleAccess(moduleId: string): boolean {
  const user = useAuthStore((s) => s.user);
  const tier: LicenseTier = user?.licenseTier || 'ultimate'; // default to full access until licensing is enforced
  return getModulesForTier(tier).includes(moduleId);
}

/** Returns the set of accessible module IDs for the current user */
export function useAccessibleModules(): string[] {
  const user = useAuthStore((s) => s.user);
  const tier: LicenseTier = user?.licenseTier || 'ultimate';
  return getModulesForTier(tier);
}

/** Returns the current tier */
export function useLicenseTier(): LicenseTier {
  const user = useAuthStore((s) => s.user);
  return user?.licenseTier || 'ultimate';
}
