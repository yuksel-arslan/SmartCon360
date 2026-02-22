/**
 * Activity Relationship Templates
 *
 * Defines logical dependencies between construction activities (trades/wagons)
 * using standard scheduling relationship types per PMI PMBOK Guide & ISO 21500:
 *
 *   FS (Finish-to-Start)  — Predecessor finishes before successor starts (most common)
 *   SS (Start-to-Start)   — Successor starts when predecessor starts (+ optional lag)
 *   FF (Finish-to-Finish) — Successor finishes when predecessor finishes (+ optional lag)
 *   SF (Start-to-Finish)  — Successor can't finish until predecessor starts (rare)
 *
 * Lag: positive = delay (days), negative = lead/overlap (days)
 *
 * These templates are used by the plan generator (AI-1 Core) to schedule
 * activities with proper construction logic. Without these, the takt grid
 * would be a simple sequential layout without respecting real dependencies.
 *
 * Zone-Based Enforcement:
 *   All relationships are enforced per zone — within each zone, the predecessor
 *   activity must satisfy the constraint before the successor can start in that
 *   same zone.
 */

// ============================================================================
// TYPES
// ============================================================================

export type RelationshipType = 'FS' | 'SS' | 'FF' | 'SF';

export interface ActivityRelationshipTemplate {
  /** Predecessor trade code (e.g., 'STR-FRC') */
  predecessorCode: string;
  /** Successor trade code (e.g., 'MEC-PLB') */
  successorCode: string;
  /** Relationship type: FS, SS, FF, SF */
  type: RelationshipType;
  /** Lag in days (positive = delay, negative = lead/overlap). 0 = no lag. */
  lagDays: number;
  /** Whether this relationship is mandatory (hard logic) or preferred (soft logic) */
  mandatory: boolean;
  /** Human-readable description of the relationship */
  description: string;
}

// ============================================================================
// STRUCTURAL RELATIONSHIPS
// ============================================================================

const STRUCTURAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  // ── SUBSTRUCTURE: [Shoring] → Excavation → [Piling] → Foundation ─────────
  // W1: Kazı (Excavation)
  // W2: İksa (Shoring) — optional, auto-filtered by getRelationshipsForTrades()
  // W3: Kazık (Piling) — optional, auto-filtered by getRelationshipsForTrades()
  // W4: Temel (Foundation Waterproofing + Concrete)
  {
    predecessorCode: 'STR-EXC',
    successorCode: 'STR-FND',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Foundation works start after excavation completes in zone',
  },
  // Shoring (İksa) — optional wagon, auto-filtered by getRelationshipsForTrades()
  // Derin kazılarda: Önce iksa kazıkları çakılır, ardından kademeli kazı + iksa kirişleri
  // eş zamanlı ilerler. İksa, kazıdan ÖNCE başlar ve kademeli olarak birlikte tamamlanır.
  {
    predecessorCode: 'STR-IKS',
    successorCode: 'STR-EXC',
    type: 'SS',
    lagDays: 3,
    mandatory: true,
    description: 'Staged excavation starts after shoring piles installed (3 day lag)',
  },
  {
    predecessorCode: 'STR-IKS',
    successorCode: 'STR-FND',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Foundation works start after shoring fully complete in zone',
  },
  // Piling — optional wagon, auto-filtered by getRelationshipsForTrades()
  {
    predecessorCode: 'STR-EXC',
    successorCode: 'STR-PIL',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Piling starts after excavation to pile cut-off level in zone',
  },
  {
    predecessorCode: 'STR-PIL',
    successorCode: 'STR-FND',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Foundation works start after piling provides bearing capacity in zone',
  },
  // ── SHELL & CORE: Foundation → Superstructure ────────────────────────────
  {
    predecessorCode: 'STR-FND',
    successorCode: 'STR-FRC',
    type: 'FS',
    lagDays: 3,
    mandatory: true,
    description: 'Superstructure (Karkas) starts after foundation concrete cures (min 3 days)',
  },
  {
    predecessorCode: 'STR-FRC',
    successorCode: 'STR-WPR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Waterproofing after superstructure frame complete in zone',
  },
  {
    predecessorCode: 'STR-WPR',
    successorCode: 'STR-INS',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Insulation after waterproofing membrane cures (min 24h)',
  },
];

// ============================================================================
// MECHANICAL RELATIONSHIPS
// ============================================================================

const MECHANICAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'STR-FRC',
    successorCode: 'MEC-PLB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plumbing rough-in starts after structural formwork stripped',
  },
  {
    predecessorCode: 'STR-FRC',
    successorCode: 'MEC-HVC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'HVAC ductwork starts after structural formwork stripped',
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'MEC-HVC',
    type: 'SS',
    lagDays: 2,
    mandatory: false,
    description: 'HVAC can start 2 days after plumbing rough-in starts (coordination)',
  },
  {
    predecessorCode: 'MEC-HVC',
    successorCode: 'MEC-FPR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fire sprinklers after HVAC ductwork (needs duct routing first)',
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'MEC-PIP',
    type: 'SS',
    lagDays: 3,
    mandatory: true,
    description: 'Piping systems start 3 days after plumbing rough-in starts',
  },
  {
    predecessorCode: 'MEC-HVC',
    successorCode: 'MEC-EQP',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Mechanical equipment after HVAC ductwork is routed',
  },
  {
    predecessorCode: 'MEC-PIP',
    successorCode: 'MEC-EQP',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Mechanical equipment after piping systems are in place',
  },
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'MEC-TAB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'HVAC testing & balancing after all equipment installed',
  },
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plumbing fixtures after equipment installation',
  },
];

// ============================================================================
// ELECTRICAL RELATIONSHIPS
// ============================================================================

const ELECTRICAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'STR-FRC',
    successorCode: 'ELC-RGH',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Electrical rough-in starts after structural formwork stripped',
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ELC-RGH',
    type: 'SS',
    lagDays: 1,
    mandatory: false,
    description: 'Electrical rough-in can start 1 day after plumbing (avoid clashes)',
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ELC-CTR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Cable tray after conduit rough-in establishes routing',
  },
  {
    predecessorCode: 'ELC-CTR',
    successorCode: 'ELC-CBL',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Cable pulling after trays and containment installed',
  },
  {
    predecessorCode: 'ELC-CTR',
    successorCode: 'ELC-DAT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Data & communications cables after tray installation',
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-SWG',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Switchgear & panels after power cables pulled',
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-LGT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Lighting installation after cables pulled',
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-FAD',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fire alarm & detection after cables pulled',
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-SEC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Security & CCTV after cables pulled',
  },
  {
    predecessorCode: 'ELC-SWG',
    successorCode: 'ELC-BMS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'BMS controls after switchgear energized',
  },
  {
    predecessorCode: 'MEC-TAB',
    successorCode: 'ELC-BMS',
    type: 'FF',
    lagDays: 0,
    mandatory: true,
    description: 'BMS commissioning finishes with HVAC T&B (integrated testing)',
  },
];

// ============================================================================
// ARCHITECTURAL RELATIONSHIPS
// ============================================================================

const ARCHITECTURAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  // ── MASONRY / BLOCK WALL PHASE (Tuğla Duvar) ─────────────────────────────
  // Block masonry starts 3 floors behind structural work (3 kat sonra).
  // SS relationship: masonry can START in zone X when structure STARTS in zone X + lagDays.
  // Default lagDays = 3 × taktTime. At taktTime=5: lag=15d → 3 floors lead.
  // Adjust lagDays if taktTime differs: lagDays = 3 × taktTime.
  {
    predecessorCode: 'STR-FRC',
    successorCode: 'ARC-MSN',
    type: 'SS',
    lagDays: 15,
    mandatory: true,
    description: 'Block masonry starts 3 floors behind structural (SS+15d = 3×taktTime lag)',
  },
  // ── PLASTERING PHASE ───────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-MSN',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 2,
    mandatory: true,
    description: 'Plastering after masonry mortar cures in zone (min 2 days)',
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plastering after plumbing rough-in — pipes must be concealed in zone',
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plastering after electrical rough-in — conduits must be concealed in zone',
  },
  {
    predecessorCode: 'ARC-FAC',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Interior plastering after facade/envelope is weather-tight in zone',
  },
  // ── DRYWALL PHASE ─────────────────────────────────────────────────────
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ARC-DRW',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drywall after plumbing rough-in behind walls in zone',
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ARC-DRW',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drywall after electrical rough-in behind walls in zone',
  },
  {
    predecessorCode: 'STR-INS',
    successorCode: 'ARC-DRW',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drywall after insulation installed behind wall cavities in zone',
  },
  // ── FACADE / ENVELOPE ─────────────────────────────────────────────────
  {
    predecessorCode: 'STR-FRC',
    successorCode: 'ARC-FAC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Facade starts after structural formwork stripped in zone',
  },
  // ── WINDOWS ────────────────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-MSN',
    successorCode: 'ARC-WND',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Windows after masonry openings ready and lintel mortar cured (1 day)',
  },
  {
    predecessorCode: 'ARC-WND',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: false,
    description: 'Plaster window reveals after window frames installed in zone',
  },
  // ── TILING PHASE ───────────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-PLS',
    successorCode: 'ARC-TIL',
    type: 'FS',
    lagDays: 3,
    mandatory: true,
    description: 'Tiling after plaster cures in zone (min 3 days)',
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ARC-TIL',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Tiling after plumbing rough-in — floor drains set in zone',
  },
  {
    predecessorCode: 'STR-WPR',
    successorCode: 'ARC-TIL',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Tiling wet areas after waterproofing membrane cures and tested (1 day)',
  },
  // ── FLOORING PHASE ─────────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-DRW',
    successorCode: 'ARC-FLR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Flooring after drywall partitions define room boundaries in zone',
  },
  {
    predecessorCode: 'ARC-PLS',
    successorCode: 'ARC-FLR',
    type: 'FS',
    lagDays: 2,
    mandatory: true,
    description: 'Flooring after floor screed/plaster cures in zone (min 2 days)',
  },
  // ── SUSPENDED CEILING PHASE ────────────────────────────────────────────
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'ARC-CLG',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Suspended ceiling after above-ceiling MEP equipment installed in zone',
  },
  {
    predecessorCode: 'ELC-LGT',
    successorCode: 'ARC-CLG',
    type: 'SS',
    lagDays: 0,
    mandatory: true,
    description: 'Ceiling grid starts with lighting rough-in (concurrent install in zone)',
  },
  {
    predecessorCode: 'MEC-FPR',
    successorCode: 'ARC-CLG',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Suspended ceiling after sprinkler heads positioned in zone',
  },
  // ── PAINTING PHASE ─────────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-PLS',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 5,
    mandatory: true,
    description: 'Painting after plaster fully cures in zone (min 5 days)',
  },
  {
    predecessorCode: 'ARC-DRW',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 2,
    mandatory: true,
    description: 'Painting after drywall joint compound cures in zone (min 2 days)',
  },
  {
    predecessorCode: 'ARC-CLG',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Painting after ceiling installed in zone — avoid overspray damage',
  },
  {
    predecessorCode: 'ARC-WND',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Painting after windows installed — zone must be weather-tight',
  },
  // ── DOORS & HARDWARE ──────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ARC-DOR',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Doors after paint dries in zone (min 1 day)',
  },
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'ARC-DOR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Door hanging after flooring — finished floor level determines clearance',
  },
  // ── CABINETRY & MILLWORK ──────────────────────────────────────────────
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ARC-CAB',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Cabinetry after paint dries in zone (min 1 day)',
  },
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'ARC-CAB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Base cabinets after flooring — finished floor level required in zone',
  },
  {
    predecessorCode: 'ARC-TIL',
    successorCode: 'ARC-CAB',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Cabinets in wet areas after tile grout cures in zone (min 1 day)',
  },
  // ── FF&E (FURNITURE, FIXTURES & EQUIPMENT) ─────────────────────────────
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'ARC-FFE',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Furniture after flooring complete in zone',
  },
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ARC-FFE',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Furniture after painting dries in zone (min 1 day)',
  },
  {
    predecessorCode: 'ARC-TIL',
    successorCode: 'ARC-FFE',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'FF&E after tile grout cures in zone (min 1 day)',
  },
];

// ============================================================================
// LANDSCAPE RELATIONSHIPS
// ============================================================================

const LANDSCAPE_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'LND-CLR',
    successorCode: 'LND-HRD',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Hard landscaping after site is cleared and graded',
  },
  {
    predecessorCode: 'LND-CLR',
    successorCode: 'LND-DRN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drainage after site clearing (trench before paving)',
  },
  {
    predecessorCode: 'LND-DRN',
    successorCode: 'LND-HRD',
    type: 'SS',
    lagDays: 2,
    mandatory: false,
    description: 'Paving can start 2 days after drainage starts (different areas)',
  },
  {
    predecessorCode: 'LND-HRD',
    successorCode: 'LND-ELC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'External electrical after hard landscaping (cable routes)',
  },
  {
    predecessorCode: 'LND-DRN',
    successorCode: 'LND-IRR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Irrigation after drainage infrastructure in place',
  },
  {
    predecessorCode: 'LND-IRR',
    successorCode: 'LND-PLT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Planting after irrigation systems installed',
  },
  {
    predecessorCode: 'LND-HRD',
    successorCode: 'LND-FNC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fencing after hard landscaping (boundary definition)',
  },
  {
    predecessorCode: 'LND-PLT',
    successorCode: 'LND-FRN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'External furniture & signage as last landscape activity',
  },
];

// ============================================================================
// CROSS-DISCIPLINE: SITE PREPARATION → EXCAVATION & FOUNDATION
// ============================================================================

const SITE_PREPARATION_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'LND-CLR',
    successorCode: 'STR-EXC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Excavation after site clearing — vegetation, roots, grading must be done',
  },
  {
    predecessorCode: 'LND-CLR',
    successorCode: 'STR-IKS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Shoring after site clearing — site must be cleared before shoring piles',
  },
];

// ============================================================================
// CROSS-DISCIPLINE FINISHING CONSTRAINTS
// ============================================================================

const CROSS_DISCIPLINE_FINISHING: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Plumbing fixtures after painting dries in zone (protect chrome/porcelain)',
  },
  {
    predecessorCode: 'ARC-TIL',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Plumbing fixtures after tile grout cures in zone (min 1 day)',
  },
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plumbing fixtures after flooring — pedestal/base alignment in zone',
  },
  {
    predecessorCode: 'ARC-CLG',
    successorCode: 'ELC-FAD',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fire alarm devices after ceiling grid installed in zone',
  },
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ELC-SEC',
    type: 'FS',
    lagDays: 1,
    mandatory: false,
    description: 'Security devices after painting dries in zone (wall-mounted equipment)',
  },
];

// ============================================================================
// CROSS-DISCIPLINE RELATIONSHIPS (Hospital Extras)
// ============================================================================

const HOSPITAL_EXTRA_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'STR-FRC',
    successorCode: 'MEC-MED',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Medical gas systems after structure complete',
  },
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'MEC-CLN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Clean room systems after MEP equipment installed',
  },
  {
    predecessorCode: 'ELC-SWG',
    successorCode: 'ELC-UPS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'UPS / emergency power after switchgear installed',
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-NCS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Nurse call systems after cabling pulled',
  },
];

// ============================================================================
// COMMERCIAL EXTRAS
// ============================================================================

const COMMERCIAL_EXTRA_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ARC-RAF',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Raised access floor after under-floor MEP rough-in',
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ARC-RAF',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Raised access floor after under-floor electrical rough-in',
  },
];

// ============================================================================
// ALL RELATIONSHIPS — COMBINED
// ============================================================================

const ALL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  ...STRUCTURAL_RELATIONSHIPS,
  ...MECHANICAL_RELATIONSHIPS,
  ...ELECTRICAL_RELATIONSHIPS,
  ...ARCHITECTURAL_RELATIONSHIPS,
  ...LANDSCAPE_RELATIONSHIPS,
  ...SITE_PREPARATION_RELATIONSHIPS,
  ...CROSS_DISCIPLINE_FINISHING,
];

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get all activity relationship templates (base set for all project types).
 */
export function getAllRelationshipTemplates(): ActivityRelationshipTemplate[] {
  return ALL_RELATIONSHIPS;
}

/**
 * Get activity relationship templates filtered for a specific project type.
 * Only returns relationships where both predecessor and successor codes
 * exist in the given trade code list.
 */
export function getRelationshipsForTrades(
  tradeCodes: string[],
  projectType?: string,
): ActivityRelationshipTemplate[] {
  const codeSet = new Set(tradeCodes);

  let relationships = [...ALL_RELATIONSHIPS];

  // Add project-type-specific extra relationships
  if (projectType === 'hospital') {
    relationships.push(...HOSPITAL_EXTRA_RELATIONSHIPS);
  }
  if (projectType === 'commercial') {
    relationships.push(...COMMERCIAL_EXTRA_RELATIONSHIPS);
  }

  // Filter to only relationships where both trades exist in the project
  return relationships.filter(
    (r) => codeSet.has(r.predecessorCode) && codeSet.has(r.successorCode),
  );
}

/**
 * Get relationships grouped by successor code.
 * Useful for the takt calculator to determine when an activity can start.
 */
export function getRelationshipsBySuccessor(
  relationships: ActivityRelationshipTemplate[],
): Map<string, ActivityRelationshipTemplate[]> {
  const map = new Map<string, ActivityRelationshipTemplate[]>();
  for (const r of relationships) {
    const list = map.get(r.successorCode) || [];
    list.push(r);
    map.set(r.successorCode, list);
  }
  return map;
}

/**
 * Get relationships grouped by predecessor code.
 * Useful for determining what depends on a given activity.
 */
export function getRelationshipsByPredecessor(
  relationships: ActivityRelationshipTemplate[],
): Map<string, ActivityRelationshipTemplate[]> {
  const map = new Map<string, ActivityRelationshipTemplate[]>();
  for (const r of relationships) {
    const list = map.get(r.predecessorCode) || [];
    list.push(r);
    map.set(r.predecessorCode, list);
  }
  return map;
}

/**
 * Validate that relationships have no circular dependencies.
 * Returns an array of codes involved in cycles (empty if valid).
 */
export function detectCircularDependencies(
  relationships: ActivityRelationshipTemplate[],
): string[] {
  const graph = new Map<string, string[]>();
  const allCodes = new Set<string>();

  for (const r of relationships) {
    allCodes.add(r.predecessorCode);
    allCodes.add(r.successorCode);
    const successors = graph.get(r.predecessorCode) || [];
    successors.push(r.successorCode);
    graph.set(r.predecessorCode, successors);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycleNodes: string[] = [];

  function dfs(node: string): boolean {
    if (inStack.has(node)) {
      cycleNodes.push(node);
      return true;
    }
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);

    for (const neighbor of graph.get(node) || []) {
      if (dfs(neighbor)) return true;
    }

    inStack.delete(node);
    return false;
  }

  for (const code of allCodes) {
    if (!visited.has(code)) {
      dfs(code);
    }
  }

  return cycleNodes;
}

/**
 * Compute topological sort order for trades based on relationships.
 * Returns an ordered list of trade codes respecting all dependencies.
 * Falls back to input order if circular dependencies exist.
 */
export function topologicalSort(
  tradeCodes: string[],
  relationships: ActivityRelationshipTemplate[],
): string[] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const code of tradeCodes) {
    inDegree.set(code, 0);
    graph.set(code, []);
  }

  const codeSet = new Set(tradeCodes);
  for (const r of relationships) {
    if (!codeSet.has(r.predecessorCode) || !codeSet.has(r.successorCode)) continue;
    graph.get(r.predecessorCode)!.push(r.successorCode);
    inDegree.set(r.successorCode, (inDegree.get(r.successorCode) || 0) + 1);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [code, degree] of inDegree) {
    if (degree === 0) queue.push(code);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    for (const neighbor of graph.get(node) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  // If not all nodes were sorted, there's a cycle — fall back to input order
  if (sorted.length < tradeCodes.length) {
    return tradeCodes;
  }

  return sorted;
}

// ============================================================================
// SUB-ACTIVITY RELATIONSHIPS (Internal to wagons)
// ============================================================================

export interface SubActivityRelationshipMap {
  /** Parent wagon code (e.g., 'STR-EXC') */
  wagonCode: string;
  /** Relationships between sub-activities within this wagon */
  relationships: ActivityRelationshipTemplate[];
}

// ── STR-EXC: Excavation (internal chain) ─────────────────────────────────

const EXC_SUB_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'EXC-SRV',
    successorCode: 'EXC-BEX',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Bulk excavation starts after survey & setting out completes in zone',
  },
  {
    predecessorCode: 'EXC-BEX',
    successorCode: 'EXC-SGP',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Sub-grade preparation after bulk excavation reaches formation level',
  },
];

// ── STR-IKS: Shoring / İksa (internal chain) ─────────────────────────────

const IKS_SUB_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'IKS-MOB',
    successorCode: 'IKS-DRV',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Sheet pile / secant pile installation after equipment mobilized',
  },
  {
    predecessorCode: 'IKS-DRV',
    successorCode: 'IKS-ANC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Anchoring & bracing after piles installed in zone',
  },
  {
    predecessorCode: 'IKS-ANC',
    successorCode: 'IKS-MON',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Monitoring instrumentation after anchoring complete',
  },
];

// ── STR-PIL: Piling (internal chain) ─────────────────────────────────────

const PIL_SUB_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'PIL-MOB',
    successorCode: 'PIL-DRV',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Pile driving / boring after rig mobilized in zone',
  },
  {
    predecessorCode: 'PIL-DRV',
    successorCode: 'PIL-TST',
    type: 'FS',
    lagDays: 7,
    mandatory: true,
    description: 'Pile load testing after concrete piles cure (min 7 days)',
  },
  {
    predecessorCode: 'PIL-TST',
    successorCode: 'PIL-CUT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Pile head trimming after load test approved',
  },
];

// ── STR-FND: Foundation Works (Temel — substructure W4) ───────────────────

const FND_SUB_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'FND-BLN',
    successorCode: 'FND-FWP',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Foundation waterproofing after blinding concrete cures (min 1 day)',
  },
  {
    predecessorCode: 'FND-FWP',
    successorCode: 'FND-FFM',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Foundation formwork placed on waterproofing membrane',
  },
  {
    predecessorCode: 'FND-FFM',
    successorCode: 'FND-FRB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Foundation reinforcement after formwork in place',
  },
  {
    predecessorCode: 'FND-FRB',
    successorCode: 'FND-FCN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Foundation concrete pour after rebar placement and inspection',
  },
  {
    predecessorCode: 'FND-FCN',
    successorCode: 'FND-BKF',
    type: 'FS',
    lagDays: 3,
    mandatory: true,
    description: 'Backfill after foundation concrete cures (min 3 days)',
  },
];

// ── STR-FRC: Superstructure / Karkas (shell & core) ──────────────────────

const FRC_SUB_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'FRC-CFM',
    successorCode: 'FRC-CRB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Column/shear wall rebar after formwork in place',
  },
  {
    predecessorCode: 'FRC-CRB',
    successorCode: 'FRC-CCN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Column/shear wall concrete pour after rebar and inspection',
  },
  {
    predecessorCode: 'FRC-CCN',
    successorCode: 'FRC-SFM',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Slab formwork after column concrete gains initial set (min 1 day)',
  },
  {
    predecessorCode: 'FRC-SFM',
    successorCode: 'FRC-SRB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Slab rebar after slab formwork in place',
  },
  {
    predecessorCode: 'FRC-SRB',
    successorCode: 'FRC-SCN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Slab concrete pour after rebar placement and inspection',
  },
  {
    predecessorCode: 'FRC-SCN',
    successorCode: 'FRC-STP',
    type: 'FS',
    lagDays: 3,
    mandatory: true,
    description: 'Formwork stripping after slab concrete cures (min 3 days)',
  },
];

// ── LND-CLR: Site Clearing & Grading (internal chain) ────────────────────

const CLR_SUB_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'CLR-SRV',
    successorCode: 'CLR-VEG',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Vegetation clearing after site survey identifies boundaries',
  },
  {
    predecessorCode: 'CLR-SRV',
    successorCode: 'CLR-DEM',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Demolition after survey marks existing structures and utilities',
  },
  {
    predecessorCode: 'CLR-VEG',
    successorCode: 'CLR-TOP',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Topsoil stripping after vegetation and root removal complete',
  },
  {
    predecessorCode: 'CLR-TOP',
    successorCode: 'CLR-CUT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Cut & fill earthworks after topsoil stripped and stockpiled',
  },
  {
    predecessorCode: 'CLR-DEM',
    successorCode: 'CLR-CUT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Earthworks after demolition debris cleared from zone',
  },
  {
    predecessorCode: 'CLR-CUT',
    successorCode: 'CLR-GRD',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fine grading after bulk earthworks reach rough design levels',
  },
  {
    predecessorCode: 'CLR-GRD',
    successorCode: 'CLR-ERC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Erosion & sediment control after final grades established',
  },
];

// ── Combined sub-activity relationship map ───────────────────────────────

const SUB_ACTIVITY_RELATIONSHIP_MAP: SubActivityRelationshipMap[] = [
  { wagonCode: 'STR-EXC', relationships: EXC_SUB_RELATIONSHIPS },
  { wagonCode: 'STR-IKS', relationships: IKS_SUB_RELATIONSHIPS },
  { wagonCode: 'STR-PIL', relationships: PIL_SUB_RELATIONSHIPS },
  { wagonCode: 'STR-FND', relationships: FND_SUB_RELATIONSHIPS },
  { wagonCode: 'STR-FRC', relationships: FRC_SUB_RELATIONSHIPS },
  { wagonCode: 'LND-CLR', relationships: CLR_SUB_RELATIONSHIPS },
];

/**
 * Get all sub-activity relationship maps.
 * Returns relationships organized by parent wagon code.
 */
export function getAllSubActivityRelationships(): SubActivityRelationshipMap[] {
  return SUB_ACTIVITY_RELATIONSHIP_MAP;
}

/**
 * Get sub-activity relationships for a specific wagon.
 * Returns the internal activity chain for drill-down scheduling.
 */
export function getSubActivityRelationships(
  wagonCode: string,
): ActivityRelationshipTemplate[] {
  const map = SUB_ACTIVITY_RELATIONSHIP_MAP.find((m) => m.wagonCode === wagonCode);
  return map ? map.relationships : [];
}
