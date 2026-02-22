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
 * Constraint Categories:
 *   physical    — Dictated by material/physics (e.g., concrete curing, plaster drying)
 *   logistical  — Construction sequence logic (e.g., rough-in before close-up)
 *   regulatory  — Code/permit requirements (e.g., inspection hold points)
 *   preferential — Best-practice optimization (e.g., MEP coordination)
 *
 * Zone-Based Enforcement:
 *   All relationships are enforced per zone — within each zone, the predecessor
 *   activity must satisfy the constraint before the successor can start in that
 *   same zone. This models real construction: "in Zone A, masonry must finish
 *   before plastering starts in Zone A."
 *
 * Configurable:
 *   Physical constraints have factory-default lag times based on material science
 *   (curing, drying, settling). These defaults can be overridden per project via
 *   the TradeRelationship model, but the physical minimum is preserved as guidance.
 */

// ============================================================================
// TYPES
// ============================================================================

export type RelationshipType = 'FS' | 'SS' | 'FF' | 'SF';

/** Constraint category — why this relationship exists */
export type ConstraintCategory = 'physical' | 'logistical' | 'regulatory' | 'preferential';

export interface ActivityRelationshipTemplate {
  /** Predecessor trade code (e.g., 'STR-FRM') */
  predecessorCode: string;
  /** Successor trade code (e.g., 'STR-RBR') */
  successorCode: string;
  /** Relationship type: FS, SS, FF, SF */
  type: RelationshipType;
  /** Lag in days (positive = delay, negative = lead/overlap). 0 = no lag. */
  lagDays: number;
  /** Whether this relationship is mandatory (hard logic) or preferred (soft logic) */
  mandatory: boolean;
  /** Human-readable description of the relationship */
  description: string;
  /** Why this constraint exists — physical, logistical, regulatory, or preferential */
  category: ConstraintCategory;
  /** Whether the lag can be modified per project (physical constraints have defaults but can be adjusted) */
  configurable: boolean;
  /** Factory default lag in days — preserved when user overrides lagDays, for reset/guidance */
  defaultLagDays: number;
}

// ============================================================================
// STRUCTURAL RELATIONSHIPS
// ============================================================================

const STRUCTURAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'STR-EXC',
    successorCode: 'STR-FRM',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Foundation formwork starts after excavation completes',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'STR-FRM',
    successorCode: 'STR-RBR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Rebar installation starts after formwork is in place',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'STR-RBR',
    successorCode: 'STR-CON',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Concrete pour after rebar placement and inspection',
    category: 'regulatory',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'STR-CON',
    successorCode: 'STR-STP',
    type: 'FS',
    lagDays: 3,
    mandatory: true,
    description: 'Formwork stripping after concrete curing (min 3 days per ACI 347)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 3,
  },
  {
    predecessorCode: 'STR-STP',
    successorCode: 'STR-WPR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Waterproofing after formwork stripping exposes surfaces',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'STR-WPR',
    successorCode: 'STR-INS',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Insulation after waterproofing membrane cures (min 24h)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },
];

// ============================================================================
// MECHANICAL RELATIONSHIPS
// ============================================================================

const MECHANICAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'STR-STP',
    successorCode: 'MEC-PLB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plumbing rough-in starts after structural formwork stripped',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'STR-STP',
    successorCode: 'MEC-HVC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'HVAC ductwork starts after structural formwork stripped',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'MEC-HVC',
    type: 'SS',
    lagDays: 2,
    mandatory: false,
    description: 'HVAC can start 2 days after plumbing rough-in starts (coordination)',
    category: 'preferential',
    configurable: true,
    defaultLagDays: 2,
  },
  {
    predecessorCode: 'MEC-HVC',
    successorCode: 'MEC-FPR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fire sprinklers after HVAC ductwork (needs duct routing first)',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'MEC-PIP',
    type: 'SS',
    lagDays: 3,
    mandatory: true,
    description: 'Piping systems start 3 days after plumbing rough-in starts',
    category: 'logistical',
    configurable: true,
    defaultLagDays: 3,
  },
  {
    predecessorCode: 'MEC-HVC',
    successorCode: 'MEC-EQP',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Mechanical equipment after HVAC ductwork is routed',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-PIP',
    successorCode: 'MEC-EQP',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Mechanical equipment after piping systems are in place',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'MEC-TAB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'HVAC testing & balancing after all equipment installed',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plumbing fixtures after equipment installation',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
];

// ============================================================================
// ELECTRICAL RELATIONSHIPS
// ============================================================================

const ELECTRICAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'STR-STP',
    successorCode: 'ELC-RGH',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Electrical rough-in starts after structural formwork stripped',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ELC-RGH',
    type: 'SS',
    lagDays: 1,
    mandatory: false,
    description: 'Electrical rough-in can start 1 day after plumbing (avoid clashes)',
    category: 'preferential',
    configurable: true,
    defaultLagDays: 1,
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ELC-CTR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Cable tray after conduit rough-in establishes routing',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-CTR',
    successorCode: 'ELC-CBL',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Cable pulling after trays and containment installed',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-CTR',
    successorCode: 'ELC-DAT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Data & communications cables after tray installation',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-SWG',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Switchgear & panels after power cables pulled',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-LGT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Lighting installation after cables pulled',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-FAD',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fire alarm & detection after cables pulled',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-SEC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Security & CCTV after cables pulled',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-SWG',
    successorCode: 'ELC-BMS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'BMS controls after switchgear energized',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-TAB',
    successorCode: 'ELC-BMS',
    type: 'FF',
    lagDays: 0,
    mandatory: true,
    description: 'BMS commissioning finishes with HVAC T&B (integrated testing)',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
];

// ============================================================================
// ARCHITECTURAL RELATIONSHIPS
// ============================================================================

// ---------------------------------------------------------------------------
// ARCHITECTURAL RELATIONSHIPS — Zone-Based Physical Constraints
//
// These constraints model real construction physics within each zone:
// - Material curing/drying times (physical)
// - Construction sequence requirements (logistical)
// - Building envelope dependencies (physical/logistical)
//
// Physical lag values based on:
//   - ACI 347 (concrete/formwork)
//   - BS EN 13914 / ASTM C926 (plaster curing)
//   - BS 6150 / ASTM D6083 (paint drying)
//   - BS EN 12004 / ANSI A108 (tile adhesive curing)
//   - Manufacturer data sheets (typical conditions: 20°C, 50% RH)
//
// All constraints are per-zone: "in Zone X, predecessor must satisfy
// the constraint before successor starts in Zone X."
// ---------------------------------------------------------------------------

const ARCHITECTURAL_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  // ── MASONRY PHASE ──────────────────────────────────────────────────────
  {
    predecessorCode: 'STR-STP',
    successorCode: 'ARC-MSN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Masonry/blockwork starts after structure is exposed in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },

  // ── PLASTERING PHASE ───────────────────────────────────────────────────
  // Plaster cannot start until masonry mortar has cured (2 days min)
  {
    predecessorCode: 'ARC-MSN',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 2,
    mandatory: true,
    description: 'Plastering after masonry mortar cures in zone (min 2 days per BS EN 1996)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 2,
  },
  // MEP rough-in must be complete and concealed before wet plaster
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plastering after plumbing rough-in — pipes must be concealed in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plastering after electrical rough-in — conduits must be concealed in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Building envelope must be weather-tight before wet interior works
  {
    predecessorCode: 'ARC-FAC',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Interior plastering after facade/envelope is weather-tight in zone',
    category: 'physical',
    configurable: false,
    defaultLagDays: 0,
  },

  // ── DRYWALL PHASE ─────────────────────────────────────────────────────
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ARC-DRW',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drywall after plumbing rough-in behind walls in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ARC-DRW',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drywall after electrical rough-in behind walls in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Insulation must be in place behind drywall
  {
    predecessorCode: 'STR-INS',
    successorCode: 'ARC-DRW',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drywall after insulation installed behind wall cavities in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },

  // ── FACADE / ENVELOPE ─────────────────────────────────────────────────
  {
    predecessorCode: 'STR-STP',
    successorCode: 'ARC-FAC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Facade starts after structural formwork stripped in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },

  // ── WINDOWS ────────────────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-MSN',
    successorCode: 'ARC-WND',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Windows after masonry openings ready and lintel mortar cured (1 day)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },
  // Windows should be in before interior plastering around reveals
  {
    predecessorCode: 'ARC-WND',
    successorCode: 'ARC-PLS',
    type: 'FS',
    lagDays: 0,
    mandatory: false,
    description: 'Plaster window reveals after window frames installed in zone',
    category: 'preferential',
    configurable: true,
    defaultLagDays: 0,
  },

  // ── TILING PHASE ───────────────────────────────────────────────────────
  // Plaster must cure sufficiently before tile adhesive application
  {
    predecessorCode: 'ARC-PLS',
    successorCode: 'ARC-TIL',
    type: 'FS',
    lagDays: 3,
    mandatory: true,
    description: 'Tiling after plaster cures in zone (min 3 days per BS EN 12004)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 3,
  },
  {
    predecessorCode: 'MEC-PLB',
    successorCode: 'ARC-TIL',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Tiling after plumbing rough-in — floor drains set in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Waterproofing must be tested before tiling wet areas
  {
    predecessorCode: 'STR-WPR',
    successorCode: 'ARC-TIL',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Tiling wet areas after waterproofing membrane cures and tested (1 day)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },

  // ── FLOORING PHASE ─────────────────────────────────────────────────────
  {
    predecessorCode: 'ARC-DRW',
    successorCode: 'ARC-FLR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Flooring after drywall partitions define room boundaries in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Self-leveling screed needs curing before finish flooring
  {
    predecessorCode: 'ARC-PLS',
    successorCode: 'ARC-FLR',
    type: 'FS',
    lagDays: 2,
    mandatory: true,
    description: 'Flooring after floor screed/plaster cures in zone (min 2 days)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 2,
  },

  // ── SUSPENDED CEILING PHASE ────────────────────────────────────────────
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'ARC-CLG',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Suspended ceiling after above-ceiling MEP equipment installed in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-LGT',
    successorCode: 'ARC-CLG',
    type: 'SS',
    lagDays: 0,
    mandatory: true,
    description: 'Ceiling grid starts with lighting rough-in (concurrent install in zone)',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Fire sprinkler heads must be positioned before ceiling closes
  {
    predecessorCode: 'MEC-FPR',
    successorCode: 'ARC-CLG',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Suspended ceiling after sprinkler heads positioned in zone',
    category: 'regulatory',
    configurable: false,
    defaultLagDays: 0,
  },

  // ── PAINTING PHASE ─────────────────────────────────────────────────────
  // CRITICAL: Plaster must fully cure before painting — physical constraint
  {
    predecessorCode: 'ARC-PLS',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 5,
    mandatory: true,
    description: 'Painting after plaster fully cures in zone (min 5 days — cement plaster per ASTM C926)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 5,
  },
  // Drywall joint compound must dry before painting
  {
    predecessorCode: 'ARC-DRW',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 2,
    mandatory: true,
    description: 'Painting after drywall joint compound cures in zone (min 2 days per USG specs)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 2,
  },
  {
    predecessorCode: 'ARC-CLG',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Painting after ceiling installed in zone — avoid overspray damage',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Windows must be in for weather-tight painting environment
  {
    predecessorCode: 'ARC-WND',
    successorCode: 'ARC-PNT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Painting after windows installed — zone must be weather-tight for proper curing',
    category: 'physical',
    configurable: false,
    defaultLagDays: 0,
  },

  // ── DOORS & HARDWARE ──────────────────────────────────────────────────
  // Paint must dry before door frames and hardware installed
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ARC-DOR',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Doors after paint dries in zone (min 1 day per paint manufacturer specs)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },
  // Floor level must be set for proper door clearance
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'ARC-DOR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Door hanging after flooring — finished floor level determines clearance in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },

  // ── CABINETRY & MILLWORK ──────────────────────────────────────────────
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ARC-CAB',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Cabinetry after paint dries in zone (min 1 day)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },
  // Floor level for base cabinet alignment
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'ARC-CAB',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Base cabinets after flooring — finished floor level required in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Tile grout must cure before wet-area cabinet mounting
  {
    predecessorCode: 'ARC-TIL',
    successorCode: 'ARC-CAB',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Cabinets in wet areas after tile grout cures in zone (min 1 day)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },

  // ── FF&E (FURNITURE, FIXTURES & EQUIPMENT) ─────────────────────────────
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'ARC-FFE',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Furniture after flooring complete in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ARC-FFE',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Furniture after painting dries in zone (min 1 day)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },
  // Tile grout must cure before placing furniture in tiled areas
  {
    predecessorCode: 'ARC-TIL',
    successorCode: 'ARC-FFE',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'FF&E after tile grout cures in zone (min 1 day per ANSI A108)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
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
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'LND-CLR',
    successorCode: 'LND-DRN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Drainage after site clearing (trench before paving)',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'LND-DRN',
    successorCode: 'LND-HRD',
    type: 'SS',
    lagDays: 2,
    mandatory: false,
    description: 'Paving can start 2 days after drainage starts (different areas)',
    category: 'preferential',
    configurable: true,
    defaultLagDays: 2,
  },
  {
    predecessorCode: 'LND-HRD',
    successorCode: 'LND-ELC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'External electrical after hard landscaping (cable routes)',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'LND-DRN',
    successorCode: 'LND-IRR',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Irrigation after drainage infrastructure in place',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'LND-IRR',
    successorCode: 'LND-PLT',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Planting after irrigation systems installed',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'LND-HRD',
    successorCode: 'LND-FNC',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fencing after hard landscaping (boundary definition)',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'LND-PLT',
    successorCode: 'LND-FRN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'External furniture & signage as last landscape activity',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
];

// ============================================================================
// CROSS-DISCIPLINE RELATIONSHIPS (Hospital Extras)
// ============================================================================

const HOSPITAL_EXTRA_RELATIONSHIPS: ActivityRelationshipTemplate[] = [
  {
    predecessorCode: 'STR-STP',
    successorCode: 'MEC-MED',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Medical gas systems after structure complete',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'MEC-EQP',
    successorCode: 'MEC-CLN',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Clean room systems after MEP equipment installed',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-SWG',
    successorCode: 'ELC-UPS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'UPS / emergency power after switchgear installed',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-CBL',
    successorCode: 'ELC-NCS',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Nurse call systems after cabling pulled',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
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
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  {
    predecessorCode: 'ELC-RGH',
    successorCode: 'ARC-RAF',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Raised access floor after under-floor electrical rough-in',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
];

// ============================================================================
// CROSS-DISCIPLINE FINISHING CONSTRAINTS
// ============================================================================
// These constraints enforce the proper finishing sequence where architectural
// work must be complete before final MEP fixture installation in each zone.

const CROSS_DISCIPLINE_FINISHING: ActivityRelationshipTemplate[] = [
  // Plumbing fixtures (taps, basins, toilets) after painting to avoid paint damage
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Plumbing fixtures after painting dries in zone (protect chrome/porcelain)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },
  // Plumbing fixtures after tiling in wet areas
  {
    predecessorCode: 'ARC-TIL',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 1,
    mandatory: true,
    description: 'Plumbing fixtures after tile grout cures in zone (min 1 day)',
    category: 'physical',
    configurable: true,
    defaultLagDays: 1,
  },
  // Floor must be finished before fixture pedestals/bases
  {
    predecessorCode: 'ARC-FLR',
    successorCode: 'MEC-FIX',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Plumbing fixtures after flooring — pedestal/base alignment in zone',
    category: 'logistical',
    configurable: false,
    defaultLagDays: 0,
  },
  // Fire alarm devices mount on finished ceiling
  {
    predecessorCode: 'ARC-CLG',
    successorCode: 'ELC-FAD',
    type: 'FS',
    lagDays: 0,
    mandatory: true,
    description: 'Fire alarm devices after ceiling grid installed in zone',
    category: 'regulatory',
    configurable: false,
    defaultLagDays: 0,
  },
  // Security devices after painting (wall-mounted sensors/cameras)
  {
    predecessorCode: 'ARC-PNT',
    successorCode: 'ELC-SEC',
    type: 'FS',
    lagDays: 1,
    mandatory: false,
    description: 'Security devices after painting dries in zone (wall-mounted equipment)',
    category: 'preferential',
    configurable: true,
    defaultLagDays: 1,
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
// CATEGORY-BASED QUERIES
// ============================================================================

/**
 * Get only physical constraints (material curing, drying, chemical reactions).
 * These have scientifically-determined lag times that serve as minimums.
 */
export function getPhysicalConstraints(
  relationships: ActivityRelationshipTemplate[],
): ActivityRelationshipTemplate[] {
  return relationships.filter((r) => r.category === 'physical');
}

/**
 * Get relationships filtered by one or more categories.
 */
export function getRelationshipsByCategory(
  relationships: ActivityRelationshipTemplate[],
  categories: ConstraintCategory[],
): ActivityRelationshipTemplate[] {
  const categorySet = new Set(categories);
  return relationships.filter((r) => categorySet.has(r.category));
}

/**
 * Get only configurable relationships (those whose lag can be modified per project).
 * Returns relationships with their defaultLagDays for UI display.
 */
export function getConfigurableRelationships(
  relationships: ActivityRelationshipTemplate[],
): ActivityRelationshipTemplate[] {
  return relationships.filter((r) => r.configurable);
}

/**
 * Apply project-level overrides to template relationships.
 * Overrides only change lagDays — type, mandatory, and category are preserved.
 *
 * @param templates - Base relationship templates
 * @param overrides - Map of "predecessorCode:successorCode:type" → lagDays
 * @returns New relationship array with overrides applied
 */
export function applyLagOverrides(
  templates: ActivityRelationshipTemplate[],
  overrides: Map<string, number>,
): ActivityRelationshipTemplate[] {
  return templates.map((r) => {
    const key = `${r.predecessorCode}:${r.successorCode}:${r.type}`;
    const overrideLag = overrides.get(key);
    if (overrideLag !== undefined && r.configurable) {
      return { ...r, lagDays: overrideLag };
    }
    return r;
  });
}

/**
 * Reset a relationship's lag back to its factory default.
 */
export function resetToDefaultLag(
  relationship: ActivityRelationshipTemplate,
): ActivityRelationshipTemplate {
  return { ...relationship, lagDays: relationship.defaultLagDays };
}

/**
 * Get a summary of all physical constraint lag times for display/reporting.
 * Groups by successor code showing all physical predecessors and their curing times.
 */
export function getPhysicalConstraintSummary(
  relationships: ActivityRelationshipTemplate[],
): Map<string, { predecessorCode: string; lagDays: number; defaultLagDays: number; description: string }[]> {
  const summary = new Map<string, { predecessorCode: string; lagDays: number; defaultLagDays: number; description: string }[]>();

  for (const r of relationships) {
    if (r.category !== 'physical' || r.lagDays === 0) continue;
    const list = summary.get(r.successorCode) || [];
    list.push({
      predecessorCode: r.predecessorCode,
      lagDays: r.lagDays,
      defaultLagDays: r.defaultLagDays,
      description: r.description,
    });
    summary.set(r.successorCode, list);
  }

  return summary;
}
