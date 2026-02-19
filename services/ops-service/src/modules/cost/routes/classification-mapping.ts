// Cross-Standard Classification Mapping Routes
// Uniclass 2015 (UK) ↔ MasterFormat (US CSI) ↔ UNIFORMAT II (US)

import { Router } from 'express';
import { classificationMappingService } from '../services/classification-mapping.service';

const router = Router();

/**
 * GET /cost/mappings/lookup
 * Find mappings by any code
 * Query: ?uniclass=Ss_25_30 or ?masterformat=03-00-00 or ?uniformat=A1010
 */
router.get('/lookup', async (req, res, next) => {
  try {
    const { uniclass, masterformat, uniformat } = req.query;

    if (!uniclass && !masterformat && !uniformat) {
      return res.status(400).json({
        error: 'Provide at least one query parameter: uniclass, masterformat, or uniformat',
      });
    }

    const results = await classificationMappingService.findMappings({
      uniclassCode: uniclass as string,
      masterformatCode: masterformat as string,
      uniformatCode: uniformat as string,
    });

    res.json({ data: results });
  } catch (e) { next(e); }
});

/**
 * GET /cost/mappings/search?q=concrete
 * Search mappings by category or description
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await classificationMappingService.searchByCategory(q);
    res.json({ data: results });
  } catch (e) { next(e); }
});

/**
 * GET /cost/mappings
 * Get all mappings grouped by category
 */
router.get('/', async (req, res, next) => {
  try {
    const grouped = await classificationMappingService.getAllGrouped();
    res.json({ data: grouped });
  } catch (e) { next(e); }
});

/**
 * POST /cost/mappings
 * Create or update a mapping
 */
router.post('/', async (req, res, next) => {
  try {
    const { uniclassCode, masterformatCode, uniformatCode, description, category, confidence, source } = req.body;

    if (!description || !category) {
      return res.status(400).json({ error: 'description and category are required' });
    }

    if (!uniclassCode && !masterformatCode && !uniformatCode) {
      return res.status(400).json({ error: 'At least one classification code is required' });
    }

    const result = await classificationMappingService.upsertMapping({
      uniclassCode,
      masterformatCode,
      uniformatCode,
      description,
      category,
      confidence,
      source,
    });

    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

/**
 * POST /cost/mappings/seed
 * Seed common construction mappings (Uniclass ↔ MasterFormat ↔ UNIFORMAT)
 */
router.post('/seed', async (req, res, next) => {
  try {
    const result = await classificationMappingService.seedCommonMappings();
    res.json({ data: result });
  } catch (e) { next(e); }
});

export default router;
