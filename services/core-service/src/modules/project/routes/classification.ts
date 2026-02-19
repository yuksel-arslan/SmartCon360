/**
 * Classification API Routes
 *
 * Provides lookup and search endpoints for:
 * - Uniclass 2015 (12 tables: EF, Ss, Ro, Ac, Co, En, SL, Pr, PM, TE, FI, Zz)
 * - OmniClass (Table 33: Disciplines)
 *
 * Used by project setup wizard for WBS, CBS, OBS, LBS generation
 * and by all modules for classification code assignment.
 */

import { Router } from 'express';
import { classificationService } from '../services/classification.service';

const router = Router();

export default function classificationRoutes() {
  // ══════════════════════════════════════
  // OVERVIEW & STATISTICS
  // ══════════════════════════════════════

  /** GET /classification/statistics — Overview of all loaded classification data */
  router.get('/classification/statistics', (_req, res) => {
    const stats = classificationService.getStatistics();
    res.json({ data: stats, error: null });
  });

  // ══════════════════════════════════════
  // UNICLASS 2015
  // ══════════════════════════════════════

  /** GET /classification/uniclass/tables — List all Uniclass 2015 tables */
  router.get('/classification/uniclass/tables', (_req, res) => {
    const tables = classificationService.getUniclassTables();
    res.json({ data: tables, error: null });
  });

  /** GET /classification/uniclass/:table — Get full Uniclass table data */
  router.get('/classification/uniclass/:table', (req, res) => {
    const tableCode = req.params.table;
    const table = classificationService.getUniclassTable(tableCode);
    if (!table) {
      return res.status(404).json({
        data: null,
        error: { code: 'TABLE_NOT_FOUND', message: `Uniclass table '${tableCode}' not found` },
      });
    }
    res.json({ data: table, error: null });
  });

  /** GET /classification/uniclass/:table/tree — Get Uniclass table as hierarchical tree */
  router.get('/classification/uniclass/:table/tree', (req, res) => {
    const tableCode = req.params.table;
    const tree = classificationService.getUniclassTree(tableCode);
    if (tree.length === 0) {
      return res.status(404).json({
        data: null,
        error: { code: 'TABLE_NOT_FOUND', message: `Uniclass table '${tableCode}' not found` },
      });
    }
    res.json({ data: tree, error: null });
  });

  /** GET /classification/uniclass/item/:code — Get single Uniclass item by code */
  router.get('/classification/uniclass/item/:code', (req, res) => {
    const item = classificationService.getUniclassItem(req.params.code);
    if (!item) {
      return res.status(404).json({
        data: null,
        error: { code: 'ITEM_NOT_FOUND', message: `Uniclass item '${req.params.code}' not found` },
      });
    }
    res.json({ data: item, error: null });
  });

  /** GET /classification/uniclass/item/:code/children — Get children of a Uniclass item */
  router.get('/classification/uniclass/item/:code/children', (req, res) => {
    const children = classificationService.getUniclassChildren(req.params.code);
    res.json({ data: children, meta: { count: children.length }, error: null });
  });

  // ══════════════════════════════════════
  // OMNICLASS
  // ══════════════════════════════════════

  /** GET /classification/omniclass/tables — List all OmniClass tables */
  router.get('/classification/omniclass/tables', (_req, res) => {
    const tables = classificationService.getOmniClassTables();
    res.json({ data: tables, error: null });
  });

  /** GET /classification/omniclass/:table — Get full OmniClass table data */
  router.get('/classification/omniclass/:table', (req, res) => {
    const table = classificationService.getOmniClassTable(req.params.table);
    if (!table) {
      return res.status(404).json({
        data: null,
        error: { code: 'TABLE_NOT_FOUND', message: `OmniClass table '${req.params.table}' not found` },
      });
    }
    res.json({ data: table, error: null });
  });

  /** GET /classification/omniclass/:table/tree — Get OmniClass table as hierarchical tree */
  router.get('/classification/omniclass/:table/tree', (req, res) => {
    const tree = classificationService.getOmniClassTree(req.params.table);
    if (tree.length === 0) {
      return res.status(404).json({
        data: null,
        error: { code: 'TABLE_NOT_FOUND', message: `OmniClass table '${req.params.table}' not found` },
      });
    }
    res.json({ data: tree, error: null });
  });

  // ══════════════════════════════════════
  // SEARCH — Cross-standard
  // ══════════════════════════════════════

  /** GET /classification/search?q=...&standard=...&tables=...&level=...&limit=... */
  router.get('/classification/search', (req, res) => {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      return res.status(400).json({
        data: null,
        error: { code: 'VALIDATION', message: 'Search query (q) must be at least 2 characters' },
      });
    }

    const standard = req.query.standard as string | undefined;
    const tablesParam = req.query.tables as string | undefined;
    const level = req.query.level ? parseInt(req.query.level as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const tables = tablesParam ? tablesParam.split(',') : undefined;

    let results;
    if (standard === 'uniclass') {
      results = classificationService.searchUniclass(q, { tables, maxResults: limit, level });
    } else if (standard === 'omniclass') {
      results = classificationService.searchOmniClass(q, { tables, maxResults: limit, level });
    } else {
      results = classificationService.searchAll(q, { maxResults: limit, level });
    }

    res.json({ data: results, meta: { count: results.length, query: q }, error: null });
  });

  // ══════════════════════════════════════
  // SHORTCUT ENDPOINTS — For specific use cases
  // ══════════════════════════════════════

  /** GET /classification/wbs/uniclass — Uniclass EF tree for WBS generation */
  router.get('/classification/wbs/uniclass', (_req, res) => {
    const tree = classificationService.getWbsUniclassNodes();
    res.json({ data: tree, meta: { standard: 'uniclass2015', table: 'EF', usage: 'WBS' }, error: null });
  });

  /** GET /classification/cbs/uniclass — Uniclass Ss tree for CBS generation */
  router.get('/classification/cbs/uniclass', (_req, res) => {
    const tree = classificationService.getCbsUniclassNodes();
    res.json({ data: tree, meta: { standard: 'uniclass2015', table: 'Ss', usage: 'CBS' }, error: null });
  });

  /** GET /classification/obs/uniclass — Uniclass Ro tree for OBS roles */
  router.get('/classification/obs/uniclass', (_req, res) => {
    const tree = classificationService.getObsUniclassNodes();
    res.json({ data: tree, meta: { standard: 'uniclass2015', table: 'Ro', usage: 'OBS' }, error: null });
  });

  /** GET /classification/obs/omniclass — OmniClass Table 33 for OBS disciplines */
  router.get('/classification/obs/omniclass', (_req, res) => {
    const tree = classificationService.getObsOmniClassNodes();
    res.json({ data: tree, meta: { standard: 'omniclass', table: '33', usage: 'OBS' }, error: null });
  });

  /** GET /classification/lbs/uniclass — Uniclass SL tree for LBS */
  router.get('/classification/lbs/uniclass', (_req, res) => {
    const tree = classificationService.getLbsUniclassNodes();
    res.json({ data: tree, meta: { standard: 'uniclass2015', table: 'SL', usage: 'LBS' }, error: null });
  });

  return router;
}
