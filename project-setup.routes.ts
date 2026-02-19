// services/project-service/src/routes/project-setup.routes.ts

import { Router, Request, Response, NextFunction } from 'express'
import { ObsService, BoqService, ProjectDocumentService, CashFlowService } from '../services/project-setup.service'
import { authenticate } from '../middleware/auth.middleware'
import { requireProjectAccess } from '../middleware/project-access.middleware'
import { AppError } from '../errors/app-error'
import logger from '../utils/logger'

const router = Router({ mergeParams: true }) // projectId mergeParams ile gelir

const obsService = new ObsService()
const boqService = new BoqService()
const documentService = new ProjectDocumentService()
const cashFlowService = new CashFlowService()

// Tüm route'lar auth + proje erişim kontrolü gerektirir
router.use(authenticate)
router.use(requireProjectAccess)

// ══════════════════════════════════════
// OBS ROUTES
// GET    /api/v1/projects/:projectId/obs         → OBS tree
// POST   /api/v1/projects/:projectId/obs         → OBS node oluştur
// PATCH  /api/v1/projects/:projectId/obs/:nodeId → OBS node güncelle
// DELETE /api/v1/projects/:projectId/obs/:nodeId → OBS node sil
// ══════════════════════════════════════

router.get('/obs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const tree = await obsService.getTree(projectId)
    res.json({ data: tree, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

router.post('/obs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const node = await obsService.create(projectId, req.body)
    res.status(201).json({ data: node, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

router.patch('/obs/:nodeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, nodeId } = req.params
    const node = await obsService.update(projectId, nodeId, req.body)
    res.json({ data: node, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

router.delete('/obs/:nodeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, nodeId } = req.params
    await obsService.delete(projectId, nodeId)
    res.json({ data: { deleted: true }, meta: { projectId, nodeId } })
  } catch (err) {
    next(err)
  }
})

// ══════════════════════════════════════
// BOQ ROUTES
// GET    /api/v1/projects/:projectId/boq              → BOQ listesi (paginated)
// POST   /api/v1/projects/:projectId/boq              → Tekil BOQ kalemi
// POST   /api/v1/projects/:projectId/boq/import       → Toplu import
// GET    /api/v1/projects/:projectId/boq/summary/cbs  → CBS bazlı özet
// ══════════════════════════════════════

router.get('/boq', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const { cbsNodeId, wbsNodeId, locationId, itemType, page, limit } = req.query

    const result = await boqService.list(projectId, {
      cbsNodeId: cbsNodeId as string | undefined,
      wbsNodeId: wbsNodeId as string | undefined,
      locationId: locationId as string | undefined,
      itemType: itemType as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    })

    res.json({
      data: result.items,
      meta: {
        projectId,
        total: result.total,
        totalAmount: result.totalAmount,
        page: result.page,
        limit: result.limit,
        pages: result.pages,
      },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/boq', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const item = await boqService.create(projectId, req.body)
    res.status(201).json({ data: item, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

router.post('/boq/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const result = await boqService.bulkImport(projectId, req.body)
    res.json({ data: result, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

router.get('/boq/summary/cbs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const summary = await boqService.getSummaryByCbs(projectId)
    res.json({ data: summary, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

// ══════════════════════════════════════
// DOCUMENT ROUTES
// GET    /api/v1/projects/:projectId/documents              → Doküman listesi
// POST   /api/v1/projects/:projectId/documents              → Doküman yükle
// PATCH  /api/v1/projects/:projectId/documents/:docId/approve    → Onayla
// PATCH  /api/v1/projects/:projectId/documents/:docId/supersede  → Yeni revizyon
// ══════════════════════════════════════

router.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const { documentType, status } = req.query

    const docs = await documentService.list(projectId, {
      documentType: documentType as string | undefined,
      status: status as string | undefined,
    })

    res.json({ data: docs, meta: { projectId, count: docs.length } })
  } catch (err) {
    next(err)
  }
})

router.post('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) throw new AppError('Unauthorized', 401, 'AUTH_REQUIRED')

    const doc = await documentService.create(projectId, userId, req.body)
    res.status(201).json({ data: doc, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

router.patch('/documents/:docId/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, docId } = req.params
    const userId = (req as Request & { user?: { id: string } }).user?.id

    if (!userId) throw new AppError('Unauthorized', 401, 'AUTH_REQUIRED')

    const doc = await documentService.approve(projectId, docId, userId)
    res.json({ data: doc, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

router.patch('/documents/:docId/supersede', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, docId } = req.params
    const doc = await documentService.supersede(projectId, docId)
    res.json({ data: doc, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

// ══════════════════════════════════════
// CASH FLOW ROUTES
// GET    /api/v1/projects/:projectId/cashflow          → Dönem listesi
// POST   /api/v1/projects/:projectId/cashflow/generate → S-curve ile üret
// PATCH  /api/v1/projects/:projectId/cashflow/:periodId/actuals → Gerçekleşen güncelle
// ══════════════════════════════════════

router.get('/cashflow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const periods = await cashFlowService.list(projectId)
    res.json({ data: periods, meta: { projectId, count: periods.length } })
  } catch (err) {
    next(err)
  }
})

router.post('/cashflow/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params
    const periods = await cashFlowService.generate(projectId, req.body)
    res.json({ data: periods, meta: { projectId, count: periods.length } })
  } catch (err) {
    next(err)
  }
})

router.patch('/cashflow/:periodId/actuals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, periodId } = req.params
    const { actualIncome, actualExpense } = req.body

    const period = await cashFlowService.updateActuals(projectId, periodId, {
      actualIncome,
      actualExpense,
    })
    res.json({ data: period, meta: { projectId } })
  } catch (err) {
    next(err)
  }
})

export default router
