export const TRADE_COLORS: Record<string, string> = {
  'Structure': '#3B82F6', 'MEP Rough': '#8B5CF6', 'Drywall': '#F59E0B',
  'MEP Finish': '#06B6D4', 'Flooring': '#10B981', 'Paint': '#EC4899',
  'Finishes': '#F97316', 'Inspection': '#EF4444',
};
export const CONSTRAINT_CATEGORIES = ['design','material','equipment','labor','space','predecessor','permit','information'] as const;
export const PRIORITIES = ['critical','high','medium','low'] as const;
export const PROJECT_TYPES = ['hotel','hospital','residential','commercial','industrial','infrastructure'] as const;
export const LOCATION_TYPES = ['site','building','floor','zone','room','area'] as const;
