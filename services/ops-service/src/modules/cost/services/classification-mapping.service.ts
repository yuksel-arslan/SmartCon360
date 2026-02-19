// Cross-Standard Classification Mapping Engine
// Maps between: Uniclass 2015 (UK) ↔ MasterFormat (US CSI) ↔ UNIFORMAT II (US)
//
// Reference mapping based on:
// - NBS Uniclass 2015 Systems/Products tables
// - CSI MasterFormat 2018 divisions (01-49)
// - ASTM UNIFORMAT II elements (A-G)
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
// COMMON MAPPING DATA — Uniclass ↔ MasterFormat ↔ UNIFORMAT
// Based on ISO 12006-2 alignment
// ──────────────────────────────────────────────────────────────────────────────

const COMMON_MAPPINGS = [
  // ── CONCRETE ──
  { uniclassCode: 'Ss_25_30', masterformatCode: '03-00-00', uniformatCode: 'A1010', description: 'Concrete structures', category: 'Concrete', confidence: 0.95, source: 'iso12006' },
  { uniclassCode: 'Ss_25_30_27', masterformatCode: '03-30-00', uniformatCode: 'A1010', description: 'In-situ concrete structures (cast-in-place)', category: 'Concrete', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_30_60', masterformatCode: '03-40-00', uniformatCode: 'A1010', description: 'Precast concrete structures', category: 'Concrete', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Pr_20_93_28', masterformatCode: '03-20-00', uniformatCode: null, description: 'Concrete reinforcement products', category: 'Concrete', confidence: 0.85, source: 'iso12006' },

  // ── MASONRY ──
  { uniclassCode: 'Ss_25_10_50', masterformatCode: '04-00-00', uniformatCode: 'B2010', description: 'Masonry wall systems', category: 'Masonry', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Pr_20_76_13', masterformatCode: '04-20-00', uniformatCode: null, description: 'Concrete masonry units (blocks)', category: 'Masonry', confidence: 0.85, source: 'iso12006' },

  // ── STRUCTURAL STEEL ──
  { uniclassCode: 'Ss_25_30_95', masterformatCode: '05-10-00', uniformatCode: 'B1010', description: 'Structural steel framing', category: 'Metals', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_30_30', masterformatCode: '05-20-00', uniformatCode: 'B1010', description: 'Steel joist framing', category: 'Metals', confidence: 0.85, source: 'iso12006' },

  // ── WOOD / TIMBER ──
  { uniclassCode: 'Ss_25_30_97', masterformatCode: '06-10-00', uniformatCode: 'B1010', description: 'Timber frame structures', category: 'Wood & Plastics', confidence: 0.85, source: 'iso12006' },

  // ── THERMAL & MOISTURE ──
  { uniclassCode: 'Ss_25_10_28', masterformatCode: '07-20-00', uniformatCode: 'B2010', description: 'Insulation systems', category: 'Thermal & Moisture', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_20_72', masterformatCode: '07-50-00', uniformatCode: 'B3010', description: 'Roofing membrane systems', category: 'Thermal & Moisture', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_16_90', masterformatCode: '07-90-00', uniformatCode: 'B2010', description: 'Sealant and waterproofing', category: 'Thermal & Moisture', confidence: 0.80, source: 'iso12006' },

  // ── DOORS & WINDOWS ──
  { uniclassCode: 'Ss_25_50_20', masterformatCode: '08-10-00', uniformatCode: 'B2020', description: 'Door systems', category: 'Openings', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_50_95', masterformatCode: '08-50-00', uniformatCode: 'B2020', description: 'Window systems', category: 'Openings', confidence: 0.90, source: 'iso12006' },
  { uniclassCode: 'Ss_25_10_30', masterformatCode: '08-44-00', uniformatCode: 'B2010', description: 'Curtain wall systems', category: 'Openings', confidence: 0.90, source: 'iso12006' },

  // ── FINISHES ──
  { uniclassCode: 'Ss_25_40_60', masterformatCode: '09-20-00', uniformatCode: 'C3010', description: 'Plaster and gypsum board finishes', category: 'Finishes', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_40_94', masterformatCode: '09-30-00', uniformatCode: 'C3020', description: 'Tiling systems', category: 'Finishes', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_13_30', masterformatCode: '09-60-00', uniformatCode: 'C3030', description: 'Flooring systems', category: 'Finishes', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_25_40_56', masterformatCode: '09-90-00', uniformatCode: 'C3010', description: 'Painting and coating', category: 'Finishes', confidence: 0.85, source: 'iso12006' },

  // ── MECHANICAL (HVAC) ──
  { uniclassCode: 'Ss_55_40', masterformatCode: '23-00-00', uniformatCode: 'D3010', description: 'HVAC systems', category: 'HVAC', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_55_40_25', masterformatCode: '23-30-00', uniformatCode: 'D3030', description: 'Air distribution systems', category: 'HVAC', confidence: 0.80, source: 'iso12006' },
  { uniclassCode: 'Ss_55_40_10', masterformatCode: '23-20-00', uniformatCode: 'D3020', description: 'Heating systems', category: 'HVAC', confidence: 0.80, source: 'iso12006' },

  // ── PLUMBING ──
  { uniclassCode: 'Ss_55_70', masterformatCode: '22-00-00', uniformatCode: 'D2010', description: 'Plumbing systems', category: 'Plumbing', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_55_70_80', masterformatCode: '22-10-00', uniformatCode: 'D2010', description: 'Sanitary piping', category: 'Plumbing', confidence: 0.80, source: 'iso12006' },

  // ── ELECTRICAL ──
  { uniclassCode: 'Ss_60', masterformatCode: '26-00-00', uniformatCode: 'D5010', description: 'Electrical systems', category: 'Electrical', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_60_40_36', masterformatCode: '26-20-00', uniformatCode: 'D5020', description: 'Electrical distribution', category: 'Electrical', confidence: 0.80, source: 'iso12006' },
  { uniclassCode: 'Ss_60_40_47', masterformatCode: '26-50-00', uniformatCode: 'D5030', description: 'Lighting systems', category: 'Electrical', confidence: 0.80, source: 'iso12006' },

  // ── FIRE PROTECTION ──
  { uniclassCode: 'Ss_55_10', masterformatCode: '21-00-00', uniformatCode: 'D4010', description: 'Fire protection systems', category: 'Fire Protection', confidence: 0.85, source: 'iso12006' },

  // ── ELEVATOR / CONVEYING ──
  { uniclassCode: 'Ss_70_80_33', masterformatCode: '14-20-00', uniformatCode: 'D1010', description: 'Elevator systems', category: 'Conveying', confidence: 0.90, source: 'iso12006' },

  // ── EARTHWORKS ──
  { uniclassCode: 'Ss_20_05', masterformatCode: '31-00-00', uniformatCode: 'G1010', description: 'Earthwork systems', category: 'Earthworks', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_20_05_25', masterformatCode: '31-20-00', uniformatCode: 'G1010', description: 'Excavation and backfill', category: 'Earthworks', confidence: 0.80, source: 'iso12006' },

  // ── FOUNDATIONS ──
  { uniclassCode: 'Ss_20_10', masterformatCode: '31-60-00', uniformatCode: 'A1010', description: 'Foundation systems', category: 'Foundations', confidence: 0.85, source: 'iso12006' },
  { uniclassCode: 'Ss_20_10_58', masterformatCode: '31-62-00', uniformatCode: 'A1030', description: 'Piling systems', category: 'Foundations', confidence: 0.85, source: 'iso12006' },

  // ── SITE WORK ──
  { uniclassCode: 'Ss_34', masterformatCode: '32-10-00', uniformatCode: 'G2010', description: 'Paving and surfacing', category: 'Site Work', confidence: 0.80, source: 'iso12006' },
  { uniclassCode: 'Ss_34_20', masterformatCode: '32-30-00', uniformatCode: 'G2010', description: 'Site improvements', category: 'Site Work', confidence: 0.80, source: 'iso12006' },

  // ── LANDSCAPING ──
  { uniclassCode: 'Ss_34_50', masterformatCode: '32-90-00', uniformatCode: 'G2050', description: 'Landscaping systems', category: 'Landscaping', confidence: 0.80, source: 'iso12006' },
];

export const classificationMappingService = new ClassificationMappingService();
