// services/project-service/src/services/project-setup.service.ts

import { PrismaClient, Prisma } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../errors/app-error'
import logger from '../utils/logger'

const prisma = new PrismaClient()

// ══════════════════════════════════════
// ZOD SCHEMAS — Runtime Validation
// ══════════════════════════════════════

export const CreateObsNodeSchema = z.object({
  parentId: z.string().uuid().optional(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  uniclassCode: z.string().max(30).optional(),
  omniclassCode: z.string().max(30).optional(),
  nodeType: z.enum(['company', 'department', 'team', 'individual']).default('company'),
  companyName: z.string().max(255).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  wbsResponsibility: z.array(z.string().uuid()).default([]),
  metadata: z.record(z.unknown()).default({}),
})

export const CreateBoqItemSchema = z.object({
  cbsNodeId: z.string().uuid().optional(),
  wbsNodeId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  uniclassCode: z.string().max(30).optional(),
  omniclassCode: z.string().max(30).optional(),
  itemCode: z.string().min(1).max(50),
  description: z.string().min(1).max(1000),
  specification: z.string().optional(),
  unit: z.string().min(1).max(20),
  quantity: z.number().positive(),
  unitRate: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  sourceRowRef: z.string().max(50).optional(),
  itemType: z.enum(['firm', 'provisional', 'prime_cost', 'daywork']).default('firm'),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.unknown()).default({}),
})

export const BulkImportBoqSchema = z.object({
  items: z.array(CreateBoqItemSchema).min(1).max(10000),
  replaceExisting: z.boolean().default(false),
})

export const CreateProjectDocumentSchema = z.object({
  documentType: z.enum([
    'contract',
    'master_program',
    'cash_flow',
    'specification',
    'method_statement',
    'insurance',
    'permit',
    'correspondence',
    'other',
  ]),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  contractValue: z.number().nonnegative().optional(),
  contractType: z.string().max(50).optional(),
  contractForm: z.enum(['FIDIC', 'NEC3', 'NEC4', 'JCT', 'bespoke', 'other']).optional(),
  programBaseline: z.string().datetime().optional(),
  version: z.string().max(20).default('1.0'),
  revision: z.string().max(10).optional(),
  revisionDate: z.string().datetime().optional(),
  fileName: z.string().min(1).max(500),
  originalName: z.string().min(1).max(500),
  fileType: z.string().min(1).max(20),
  fileSize: z.number().int().positive(),
  filePath: z.string().min(1).max(1000),
  isConfidential: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
})

export const CreateCashFlowPeriodSchema = z.object({
  periodType: z.enum(['monthly', 'quarterly', 'weekly']).default('monthly'),
  periodNumber: z.number().int().positive(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  plannedIncome: z.number().nonnegative().default(0),
  plannedExpense: z.number().nonnegative().default(0),
  currency: z.string().length(3).default('USD'),
  notes: z.string().optional(),
})

export const GenerateCashFlowSchema = z.object({
  periodType: z.enum(['monthly', 'quarterly', 'weekly']).default('monthly'),
  currency: z.string().length(3).default('USD'),
})

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

export type CreateObsNodeInput = z.infer<typeof CreateObsNodeSchema>
export type CreateBoqItemInput = z.infer<typeof CreateBoqItemSchema>
export type BulkImportBoqInput = z.infer<typeof BulkImportBoqSchema>
export type CreateProjectDocumentInput = z.infer<typeof CreateProjectDocumentSchema>
export type CreateCashFlowPeriodInput = z.infer<typeof CreateCashFlowPeriodSchema>
export type GenerateCashFlowInput = z.infer<typeof GenerateCashFlowSchema>

// ══════════════════════════════════════
// OBS SERVICE
// ══════════════════════════════════════

export class ObsService {
  async create(projectId: string, input: CreateObsNodeInput) {
    const validated = CreateObsNodeSchema.parse(input)

    // Parent kontrolü
    if (validated.parentId) {
      const parent = await prisma.obsNode.findFirst({
        where: { id: validated.parentId, projectId },
      })
      if (!parent) {
        throw new AppError('Parent OBS node not found', 404, 'OBS_PARENT_NOT_FOUND')
      }
    }

    // Code unique kontrolü
    const existing = await prisma.obsNode.findFirst({
      where: { projectId, code: validated.code },
    })
    if (existing) {
      throw new AppError('OBS code already exists in this project', 409, 'OBS_CODE_DUPLICATE')
    }

    // Level ve path hesaplama
    let level = 1
    let path = validated.code

    if (validated.parentId) {
      const parent = await prisma.obsNode.findUniqueOrThrow({
        where: { id: validated.parentId },
      })
      level = parent.level + 1
      path = `${parent.path}.${validated.code}`
    }

    const node = await prisma.obsNode.create({
      data: {
        projectId,
        ...validated,
        level,
        path,
      },
    })

    // Setup güncelle
    await this.updateSetupCount(projectId)

    logger.info({ projectId, obsNodeId: node.id }, 'OBS node created')
    return node
  }

  async getTree(projectId: string) {
    const nodes = await prisma.obsNode.findMany({
      where: { projectId, isActive: true },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
    return this.buildTree(nodes)
  }

  async update(projectId: string, nodeId: string, input: Partial<CreateObsNodeInput>) {
    const node = await prisma.obsNode.findFirst({
      where: { id: nodeId, projectId },
    })
    if (!node) {
      throw new AppError('OBS node not found', 404, 'OBS_NOT_FOUND')
    }

    const updated = await prisma.obsNode.update({
      where: { id: nodeId },
      data: { ...input, updatedAt: new Date() },
    })

    logger.info({ projectId, obsNodeId: nodeId }, 'OBS node updated')
    return updated
  }

  async delete(projectId: string, nodeId: string) {
    const node = await prisma.obsNode.findFirst({
      where: { id: nodeId, projectId },
    })
    if (!node) {
      throw new AppError('OBS node not found', 404, 'OBS_NOT_FOUND')
    }

    // Çocuk kontrol
    const childCount = await prisma.obsNode.count({
      where: { parentId: nodeId },
    })
    if (childCount > 0) {
      throw new AppError(
        'Cannot delete OBS node with children. Delete children first.',
        409,
        'OBS_HAS_CHILDREN'
      )
    }

    await prisma.obsNode.delete({ where: { id: nodeId } })
    await this.updateSetupCount(projectId)

    logger.info({ projectId, obsNodeId: nodeId }, 'OBS node deleted')
  }

  private buildTree(nodes: Awaited<ReturnType<typeof prisma.obsNode.findMany>>) {
    const map = new Map<string, (typeof nodes)[0] & { children: typeof nodes }>()
    const roots: (typeof nodes)[0][] = []

    nodes.forEach((node) => {
      map.set(node.id, { ...node, children: [] })
    })

    nodes.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(map.get(node.id)!)
      } else {
        roots.push(map.get(node.id)!)
      }
    })

    return roots
  }

  private async updateSetupCount(projectId: string) {
    const count = await prisma.obsNode.count({ where: { projectId, isActive: true } })
    await prisma.projectSetup.upsert({
      where: { projectId },
      update: { obsNodeCount: count, obsGenerated: count > 0 },
      create: { projectId, obsNodeCount: count, obsGenerated: count > 0 },
    })
  }
}

// ══════════════════════════════════════
// BOQ SERVICE
// ══════════════════════════════════════

export class BoqService {
  async create(projectId: string, input: CreateBoqItemInput) {
    const validated = CreateBoqItemSchema.parse(input)
    const totalAmount = validated.quantity * validated.unitRate

    const item = await prisma.boqItem.create({
      data: {
        projectId,
        ...validated,
        quantity: new Prisma.Decimal(validated.quantity),
        unitRate: new Prisma.Decimal(validated.unitRate),
        totalAmount: new Prisma.Decimal(totalAmount),
      },
      include: {
        cbsNode: { select: { id: true, code: true, name: true } },
        wbsNode: { select: { id: true, code: true, name: true } },
        location: { select: { id: true, code: true, name: true } },
      },
    })

    await this.updateSetupCount(projectId)
    logger.info({ projectId, boqItemId: item.id }, 'BOQ item created')
    return item
  }

  async bulkImport(projectId: string, input: BulkImportBoqInput) {
    const validated = BulkImportBoqSchema.parse(input)

    return await prisma.$transaction(async (tx) => {
      if (validated.replaceExisting) {
        await tx.boqItem.deleteMany({ where: { projectId } })
        logger.info({ projectId }, 'Existing BOQ items cleared for reimport')
      }

      const items = validated.items.map((item) => ({
        projectId,
        ...item,
        quantity: new Prisma.Decimal(item.quantity),
        unitRate: new Prisma.Decimal(item.unitRate),
        totalAmount: new Prisma.Decimal(item.quantity * item.unitRate),
      }))

      const result = await tx.boqItem.createMany({ data: items })

      // Setup güncelle
      const count = await tx.boqItem.count({ where: { projectId, isActive: true } })
      await tx.projectSetup.upsert({
        where: { projectId },
        update: { boqItemCount: count },
        create: { projectId, boqItemCount: count },
      })

      logger.info({ projectId, count: result.count }, 'BOQ bulk import completed')
      return { imported: result.count }
    })
  }

  async list(
    projectId: string,
    options: {
      cbsNodeId?: string
      wbsNodeId?: string
      locationId?: string
      itemType?: string
      page?: number
      limit?: number
    } = {}
  ) {
    const { page = 1, limit = 50, ...filters } = options
    const skip = (page - 1) * limit

    const where: Prisma.BoqItemWhereInput = {
      projectId,
      isActive: true,
      ...(filters.cbsNodeId && { cbsNodeId: filters.cbsNodeId }),
      ...(filters.wbsNodeId && { wbsNodeId: filters.wbsNodeId }),
      ...(filters.locationId && { locationId: filters.locationId }),
      ...(filters.itemType && { itemType: filters.itemType }),
    }

    const [items, total] = await Promise.all([
      prisma.boqItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { itemCode: 'asc' }],
        include: {
          cbsNode: { select: { id: true, code: true, name: true } },
          wbsNode: { select: { id: true, code: true, name: true } },
          location: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.boqItem.count({ where }),
    ])

    // Toplam tutar hesapla
    const aggregate = await prisma.boqItem.aggregate({
      where,
      _sum: { totalAmount: true },
    })

    return {
      items,
      total,
      totalAmount: aggregate._sum.totalAmount ?? new Prisma.Decimal(0),
      page,
      limit,
      pages: Math.ceil(total / limit),
    }
  }

  async getSummaryByCbs(projectId: string) {
    return await prisma.boqItem.groupBy({
      by: ['cbsNodeId'],
      where: { projectId, isActive: true },
      _sum: { totalAmount: true },
      _count: { id: true },
    })
  }

  private async updateSetupCount(projectId: string) {
    const count = await prisma.boqItem.count({ where: { projectId, isActive: true } })
    await prisma.projectSetup.upsert({
      where: { projectId },
      update: { boqItemCount: count },
      create: { projectId, boqItemCount: count },
    })
  }
}

// ══════════════════════════════════════
// PROJECT DOCUMENT SERVICE
// ══════════════════════════════════════

export class ProjectDocumentService {
  async create(projectId: string, uploadedBy: string, input: CreateProjectDocumentInput) {
    const validated = CreateProjectDocumentSchema.parse(input)

    const doc = await prisma.projectDocument.create({
      data: {
        projectId,
        uploadedBy,
        ...validated,
        programBaseline: validated.programBaseline
          ? new Date(validated.programBaseline)
          : undefined,
        revisionDate: validated.revisionDate ? new Date(validated.revisionDate) : undefined,
      },
    })

    await this.updateSetupCount(projectId)
    logger.info({ projectId, documentId: doc.id, type: doc.documentType }, 'Document uploaded')
    return doc
  }

  async list(
    projectId: string,
    options: { documentType?: string; status?: string } = {}
  ) {
    return await prisma.projectDocument.findMany({
      where: {
        projectId,
        ...(options.documentType && { documentType: options.documentType }),
        ...(options.status && { status: options.status }),
      },
      orderBy: [{ documentType: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async approve(projectId: string, documentId: string, approvedBy: string) {
    const doc = await prisma.projectDocument.findFirst({
      where: { id: documentId, projectId },
    })
    if (!doc) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
    }

    return await prisma.projectDocument.update({
      where: { id: documentId },
      data: { approvedBy, approvedAt: new Date(), status: 'active' },
    })
  }

  async supersede(projectId: string, documentId: string) {
    const doc = await prisma.projectDocument.findFirst({
      where: { id: documentId, projectId },
    })
    if (!doc) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
    }

    return await prisma.projectDocument.update({
      where: { id: documentId },
      data: { status: 'superseded' },
    })
  }

  private async updateSetupCount(projectId: string) {
    const count = await prisma.projectDocument.count({
      where: { projectId, status: { not: 'archived' } },
    })
    await prisma.projectSetup.upsert({
      where: { projectId },
      update: { documentCount: count },
      create: { projectId, documentCount: count },
    })
  }
}

// ══════════════════════════════════════
// CASH FLOW SERVICE
// ══════════════════════════════════════

export class CashFlowService {
  async generate(projectId: string, input: GenerateCashFlowInput) {
    const validated = GenerateCashFlowSchema.parse(input)

    // Proje tarihlerini al
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { plannedStart: true, plannedFinish: true, budget: true, currency: true },
    })

    if (!project?.plannedStart || !project?.plannedFinish) {
      throw new AppError(
        'Project must have planned start and finish dates to generate cash flow',
        422,
        'CASHFLOW_MISSING_DATES'
      )
    }

    const periods = this.calculatePeriods(
      project.plannedStart,
      project.plannedFinish,
      validated.periodType
    )

    // Mevcut period'ları sil
    await prisma.cashFlowPeriod.deleteMany({ where: { projectId } })

    // S-curve dağılımı — Gaussian bell curve yaklaşımı
    const totalBudget = project.budget ? Number(project.budget) : 0
    const distributed = this.distributeSCurve(periods.length, totalBudget)

    const data = periods.map((period, index) => ({
      projectId,
      periodType: validated.periodType,
      periodNumber: index + 1,
      periodStart: period.start,
      periodEnd: period.end,
      plannedExpense: new Prisma.Decimal(distributed[index]),
      plannedCumExpense: new Prisma.Decimal(
        distributed.slice(0, index + 1).reduce((a, b) => a + b, 0)
      ),
      plannedIncome: new Prisma.Decimal(0),
      plannedCumIncome: new Prisma.Decimal(0),
      currency: validated.currency || project.currency,
    }))

    await prisma.cashFlowPeriod.createMany({ data })

    // Setup güncelle
    await prisma.projectSetup.upsert({
      where: { projectId },
      update: { cashFlowGenerated: true, cashFlowPeriodCount: periods.length },
      create: { projectId, cashFlowGenerated: true, cashFlowPeriodCount: periods.length },
    })

    logger.info({ projectId, periods: periods.length }, 'Cash flow generated')
    return await this.list(projectId)
  }

  async list(projectId: string) {
    return await prisma.cashFlowPeriod.findMany({
      where: { projectId },
      orderBy: { periodNumber: 'asc' },
    })
  }

  async updateActuals(
    projectId: string,
    periodId: string,
    actuals: { actualIncome?: number; actualExpense?: number }
  ) {
    const period = await prisma.cashFlowPeriod.findFirst({
      where: { id: periodId, projectId },
    })
    if (!period) {
      throw new AppError('Cash flow period not found', 404, 'CASHFLOW_PERIOD_NOT_FOUND')
    }

    // Kümülatif değerleri yeniden hesapla
    const allPeriods = await prisma.cashFlowPeriod.findMany({
      where: { projectId },
      orderBy: { periodNumber: 'asc' },
    })

    const updatedPeriod = await prisma.cashFlowPeriod.update({
      where: { id: periodId },
      data: {
        ...(actuals.actualIncome !== undefined && {
          actualIncome: new Prisma.Decimal(actuals.actualIncome),
        }),
        ...(actuals.actualExpense !== undefined && {
          actualExpense: new Prisma.Decimal(actuals.actualExpense),
        }),
      },
    })

    // Kümülatif değerleri güncelle (bu period ve sonrası)
    let cumIncome = 0
    let cumExpense = 0

    for (const p of allPeriods) {
      const income =
        p.id === periodId
          ? actuals.actualIncome ?? Number(p.actualIncome)
          : Number(p.actualIncome)
      const expense =
        p.id === periodId
          ? actuals.actualExpense ?? Number(p.actualExpense)
          : Number(p.actualExpense)

      cumIncome += income
      cumExpense += expense

      if (p.id === periodId || Number(p.actualCumIncome) > 0 || Number(p.actualCumExpense) > 0) {
        await prisma.cashFlowPeriod.update({
          where: { id: p.id },
          data: {
            actualCumIncome: new Prisma.Decimal(cumIncome),
            actualCumExpense: new Prisma.Decimal(cumExpense),
          },
        })
      }
    }

    return updatedPeriod
  }

  // Proje tarihlerine göre period listesi oluştur
  private calculatePeriods(
    start: Date,
    finish: Date,
    periodType: string
  ): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = []
    let current = new Date(start)

    while (current < finish) {
      const periodStart = new Date(current)
      let periodEnd: Date

      if (periodType === 'weekly') {
        periodEnd = new Date(current)
        periodEnd.setDate(periodEnd.getDate() + 6)
      } else if (periodType === 'quarterly') {
        periodEnd = new Date(current)
        periodEnd.setMonth(periodEnd.getMonth() + 3)
        periodEnd.setDate(periodEnd.getDate() - 1)
      } else {
        // monthly (default)
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
      }

      if (periodEnd > finish) periodEnd = new Date(finish)

      periods.push({ start: periodStart, end: periodEnd })

      if (periodType === 'weekly') {
        current.setDate(current.getDate() + 7)
      } else if (periodType === 'quarterly') {
        current.setMonth(current.getMonth() + 3)
      } else {
        current.setMonth(current.getMonth() + 1)
        current.setDate(1)
      }
    }

    return periods
  }

  // S-curve (Gaussian) dağılım — inşaat harcamalarının tipik dağılımı
  private distributeSCurve(periodCount: number, total: number): number[] {
    if (periodCount === 0 || total === 0) return []

    const values: number[] = []
    const mean = periodCount / 2
    const sigma = periodCount / 5

    let sum = 0
    for (let i = 0; i < periodCount; i++) {
      const x = i + 0.5
      const gaussian = Math.exp(-Math.pow(x - mean, 2) / (2 * sigma * sigma))
      values.push(gaussian)
      sum += gaussian
    }

    // Normalize et ve toplam budget'a oranla
    return values.map((v) => Math.round((v / sum) * total * 100) / 100)
  }
}
