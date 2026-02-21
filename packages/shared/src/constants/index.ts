export const TRADE_COLORS: Record<string, string> = {
  'Structure': '#3B82F6', 'MEP Rough': '#8B5CF6', 'Drywall': '#F59E0B',
  'MEP Finish': '#06B6D4', 'Flooring': '#10B981', 'Paint': '#EC4899',
  'Finishes': '#F97316', 'Inspection': '#EF4444',
};
export const CONSTRAINT_CATEGORIES = ['design','material','equipment','labor','space','predecessor','permit','information'] as const;
export const PRIORITIES = ['critical','high','medium','low'] as const;
export const PROJECT_TYPES = ['hotel','hospital','residential','commercial','industrial','infrastructure'] as const;
export const LOCATION_TYPES = ['site','building','floor','zone','room','area'] as const;

// Contract-Driven Architecture constants
export const DELIVERY_MODELS = ['dbb','design_build','cm_at_risk','ipd','epc','kat_karsiligi','hasilat_paylasimi','bot','blt','emanet'] as const;
export const COMMERCIAL_MODELS = ['unit_price','lump_sum','cost_plus','gmp','build_share','revenue_share'] as const;
export const CONTRACT_FORMS = ['fidic_red','fidic_yellow','fidic_silver','fidic_green','nec3','nec4','jct','aia','bespoke'] as const;
export const POLICY_MODULES = ['cost_pilot','takt_flow','claim_shield','supply_chain','crew_flow','quality_gate','safe_zone','comm_hub'] as const;
