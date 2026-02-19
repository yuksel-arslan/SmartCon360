// Cross-Standard Classification Mapping Engine
// Maps between: Uniclass 2015 (UK) ↔ OmniClass (International)
//
// Reference mapping based on:
// - NBS Uniclass 2015 Systems/Products tables
// - OmniClass construction classification
// - ISO 12006-2 framework alignment

import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface MappingResult {
  uniclassCode?: string | null;
  masterformatCode?: string | null;
  uniformatCode?: string | null;
  description: string;
  category: string;
  confidence: number;
  source: string;
}

export class ClassificationMappingService {

  /**
   * Look up equivalent codes from any standard
   */
  async findMappings(opts: {
    uniclassCode?: string;
    masterformatCode?: string;
    uniformatCode?: string;
  }): Promise<MappingResult[]> {
    const where: any = {};
    if (opts.uniclassCode) where.uniclassCode = opts.uniclassCode;
    if (opts.masterformatCode) where.masterformatCode = opts.masterformatCode;
    if (opts.uniformatCode) where.uniformatCode = opts.uniformatCode;

    const results = await prisma.classificationMapping.findMany({
      where,
      orderBy: { confidence: 'desc' },
    });

    return results.map(r => ({
      uniclassCode: r.uniclassCode,
      masterformatCode: r.masterformatCode,
      uniformatCode: r.uniformatCode,
      description: r.description,
      category: r.category,
      confidence: Number(r.confidence),
      source: r.source,
    }));
  }

  /**
   * Find equivalent codes by category keyword
   */
  async searchByCategory(category: string): Promise<MappingResult[]> {
    const results = await prisma.classificationMapping.findMany({
      where: {
        OR: [
          { category: { contains: category, mode: 'insensitive' } },
          { description: { contains: category, mode: 'insensitive' } },
        ],
      },
      orderBy: { category: 'asc' },
      take: 50,
    });

    return results.map(r => ({
      uniclassCode: r.uniclassCode,
      masterformatCode: r.masterformatCode,
      uniformatCode: r.uniformatCode,
      description: r.description,
      category: r.category,
      confidence: Number(r.confidence),
      source: r.source,
    }));
  }

  /**
   * Add or update a mapping
   */
  async upsertMapping(data: {
    uniclassCode?: string;
    masterformatCode?: string;
    uniformatCode?: string;
    description: string;
    category: string;
    confidence?: number;
    source?: string;
  }): Promise<MappingResult> {
    // Find existing mapping with same code combination
    const existing = await prisma.classificationMapping.findFirst({
      where: {
        uniclassCode: data.uniclassCode || null,
        masterformatCode: data.masterformatCode || null,
        uniformatCode: data.uniformatCode || null,
      },
    });

    const result = existing
      ? await prisma.classificationMapping.update({
          where: { id: existing.id },
          data: {
            description: data.description,
            category: data.category,
            confidence: data.confidence ?? 1.0,
            source: data.source || 'manual',
          },
        })
      : await prisma.classificationMapping.create({
          data: {
            uniclassCode: data.uniclassCode || null,
            masterformatCode: data.masterformatCode || null,
            uniformatCode: data.uniformatCode || null,
            description: data.description,
            category: data.category,
            confidence: data.confidence ?? 1.0,
            source: data.source || 'manual',
          },
        });

    return {
      uniclassCode: result.uniclassCode,
      masterformatCode: result.masterformatCode,
      uniformatCode: result.uniformatCode,
      description: result.description,
      category: result.category,
      confidence: Number(result.confidence),
      source: result.source,
    };
  }

  /**
   * Get all mappings grouped by category
   */
  async getAllGrouped(): Promise<Record<string, MappingResult[]>> {
    const all = await prisma.classificationMapping.findMany({
      orderBy: [{ category: 'asc' }, { description: 'asc' }],
    });

    const grouped: Record<string, MappingResult[]> = {};
    for (const r of all) {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push({
        uniclassCode: r.uniclassCode,
        masterformatCode: r.masterformatCode,
        uniformatCode: r.uniformatCode,
        description: r.description,
        category: r.category,
        confidence: Number(r.confidence),
        source: r.source,
      });
    }
    return grouped;
  }

  /**
   * Seed common construction mappings
   * Based on ISO 12006-2 framework alignment between the three systems
   */
  async seedCommonMappings(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const mapping of COMMON_MAPPINGS) {
      const existing = await prisma.classificationMapping.findFirst({
        where: {
          uniclassCode: mapping.uniclassCode || null,
          masterformatCode: mapping.masterformatCode || null,
          uniformatCode: mapping.uniformatCode || null,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.classificationMapping.create({ data: mapping });
      created++;
    }

    logger.info({ message: 'Classification mappings seeded', created, skipped });
    return { created, skipped };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// COMMON MAPPING DATA — Uniclass category mappings
// Based on ISO 12006-2 alignment
// ──────────────────────────────────────────────────────────────────────────────

const COMMON_MAPPINGS = [
  // ── CONCRETE ──
  { uniclassCode: 'Ss_25_30', masterformatCode: null, uniformatCode: null, description: 'Concrete structures', category: 'Concrete', confidence: 0.95, source: 'iso12006' },
  { uniclassCode: 'Ss_25_30_27', masterformatCode: null, uniformatCode: null, description: 'In-situ concrete structures (cast-in-place)', category: 'Concrete', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_30_60', masterformatCode: null, uniformatCode: null, description: 'Precast concrete structures', category: 'Concrete', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Pr_20_93_28', masterformatCode: null, uniformatCode: null, description: 'Concrete reinforcement products', category: 'Concrete', confidence: 0.85, source: 'iso12006' },

  // ── MASONRY ──
  { uniclassCode: 'Ss_25_10_50', masterformatCode: null, uniformatCode: null, description: 'Masonry wall systems', category: 'Masonry', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Pr_20_76_13', masterformatCode: null, uniformatCode: null, description: 'Concrete masonry units (blocks)', category: 'Masonry', confidence: 0.85, source: 'iso12006' },

  // ── STRUCTURAL STEEL ──
  { uniclassCode: 'Ss_25_30_95', masterformatCode: null, uniformatCode: null, description: 'Structural steel framing', category: 'Metals', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_30_30', masterformatCode: null, uniformatCode: null, description: 'Steel joist framing', category: 'Metals', confidence: 0.85, source: 'iso12006' },

  // ── WOOD / TIMBER ──
  { uniclassCode: 'Ss_25_30_97', masterformatCode: null, uniformatCode: null, description: 'Timber frame structures', category: 'Wood & Plastics', confidence: 0.85, source: 'iso12006' },

  // ── THERMAL & MOISTURE ──
  { uniclassCode: 'Ss_25_10_28', masterformatCode: null, uniformatCode: null, description: 'Insulation systems', category: 'Thermal & Moisture', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_20_72', masterformatCode: null, uniformatCode: null, description: 'Roofing membrane systems', category: 'Thermal & Moisture', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_16_90', masterformatCode: null, uniformatCode: null, description: 'Sealant and waterproofing', category: 'Thermal & Moisture', confidence: 0.80, source: 'iso12006' },

  // ── DOORS & WINDOWS ──
  { uniclassCode: 'Ss_25_50_20', masterformatCode: null, uniformatCode: null, description: 'Door systems', category: 'Openings', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_50_95', masterformatCode: null, uniformatCode: null, description: 'Window systems', category: 'Openings', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_10_30', masterformatCode: null, uniformatCode: null, description: 'Curtain wall systems', category: 'Openings', confidence: 0.90, source: 'iso12006' },

  // ── FINISHES ──
  { uniclassCode: 'Ss_25_40_60', masterformatCode: null, uniformatCode: null, description: 'Plaster and gypsum board finishes', category: 'Finishes', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_40_94', masterformatCode: null, uniformatCode: null, description: 'Tiling systems', category: 'Finishes', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_13_30', masterformatCode: null, uniformatCode: null, description: 'Flooring systems', category: 'Finishes', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_40_56', masterformatCode: null, uniformatCode: null, description: 'Painting and coating', category: 'Finishes', confidence: 0.85, source: 'iso12006' },

  // ── MECHANICAL (HVAC) ──
  { uniclassCode: 'Ss_55_40', masterformatCode: null, uniformatCode: null, description: 'HVAC systems', category: 'HVAC', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_55_40_25', masterformatCode: null, uniformatCode: null, description: 'Air distribution systems', category: 'HVAC', confidence: 0.80, source: 'iso12006' },
  { uniclassCode: 'Ss_55_40_10', masterformatCode: null, uniformatCode: null, description: 'Heating systems', category: 'HVAC', confidence: 0.80, source: 'iso12006' },

  // ── PLUMBING ──
  { uniclassCode: 'Ss_55_70', masterformatCode: null, uniformatCode: null, description: 'Plumbing systems', category: 'Plumbing', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_55_70_80', masterformatCode: null, uniformatCode: null, description: 'Sanitary piping', category: 'Plumbing', confidence: 0.80, source: 'iso12006' },

  // ── ELECTRICAL ──
  { uniclassCode: 'Ss_60', masterformatCode: null, uniformatCode: null, description: 'Electrical systems', category: 'Electrical', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_60_40_36', masterformatCode: null, uniformatCode: null, description: 'Electrical distribution', category: 'Electrical', confidence: 0.80, source: 'iso12006' },
  { uniclassCode: 'Ss_60_40_47', masterformatCode: null, uniformatCode: null, description: 'Lighting systems', category: 'Electrical', confidence: 0.80, source: 'iso12006' },

  // ── FIRE PROTECTION ──
  { uniclassCode: 'Ss_55_10', masterformatCode: null, uniformatCode: null, description: 'Fire protection systems', category: 'Fire Protection', confidence: 0.85, source: 'iso12006' },

  // ── ELEVATOR / CONVEYING ──
  { uniclassCode: 'Ss_70_80_33', masterformatCode: null, uniformatCode: null, description: 'Elevator systems', category: 'Conveying', confidence: 0.90, source: 'iso12006' },

  // ── EARTHWORKS ──
  { uniclassCode: 'Ss_20_05', masterformatCode: null, uniformatCode: null, description: 'Earthwork systems', category: 'Earthworks', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_20_05_25', masterformatCode: null, uniformatCode: null, description: 'Excavation and backfill', category: 'Earthworks', confidence: 0.80, source: 'iso12006' },

  // ── FOUNDATIONS ──
  { uniclassCode: 'Ss_20_10', masterformatCode: null, uniformatCode: null, description: 'Foundation systems', category: 'Foundations', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_20_10_58', masterformatCode: null, uniformatCode: null, description: 'Piling systems', category: 'Foundations', confidence: 0.85, source: 'iso12006' },

  // ── SITE WORK ──
  { uniclassCode: 'Ss_34', masterformatCode: null, uniformatCode: null, description: 'Paving and surfacing', category: 'Site Work', confidence: 0.80, source: 'iso12006' },
  { uniclassCode: 'Ss_34_20', masterformatCode: null, uniformatCode: null, description: 'Site improvements', category: 'Site Work', confidence: 0.80, source: 'iso12006' },

  // ── LANDSCAPING ──
  { uniclassCode: 'Ss_34_50', masterformatCode: null, uniformatCode: null, description: 'Landscaping systems', category: 'Landscaping', confidence: 0.80, source: 'iso12006' },
];

export const classificationMappingService = new ClassificationMappingService();
