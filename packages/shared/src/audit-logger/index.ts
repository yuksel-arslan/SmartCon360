/**
 * SmartCon360 Audit Logger
 *
 * Records all significant actions for governance and compliance.
 * Every AI recommendation, plan change, baseline modification, and
 * user permission change is logged with full before/after snapshots.
 *
 * Usage:
 *   const logger = new AuditLogger(prisma, eventBus);
 *   await logger.log({
 *     actor: { userId: 'abc', role: 'pm', source: 'human' },
 *     action: 'plan.update',
 *     entity: { type: 'schedule', id: 'xyz', projectId: 'p1' },
 *     before: { status: 'draft' },
 *     after: { status: 'active' },
 *   });
 */

import type { EventBus } from '../event-bus';
import { EventType } from '../event-bus';

// ── Types ──

export type ActorSource = 'human' | 'ai' | 'system';

export interface AuditActor {
  userId: string;
  role: string;
  source: ActorSource;
}

export interface AuditEntity {
  type: string;
  id: string;
  projectId: string;
}

export interface AuditMetadata {
  version?: number;
  approvedBy?: string;
  aiConfidence?: number;
  aiExplanation?: string;
  aiModelVersion?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  tenantId?: string;
  actor: AuditActor;
  action: string;
  entity: AuditEntity;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  metadata: AuditMetadata;
}

export interface AuditLogInput {
  tenantId?: string;
  actor: AuditActor;
  action: string;
  entity: AuditEntity;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: AuditMetadata;
}

export interface AuditQueryOptions {
  projectId?: string;
  tenantId?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorSource?: ActorSource;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ── Prisma-compatible interface ──

interface PrismaAuditClient {
  auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
  };
}

// ── Audit Logger ──

export class AuditLogger {
  constructor(
    private readonly prisma: PrismaAuditClient,
    private readonly eventBus?: EventBus,
    private readonly serviceName: string = 'unknown'
  ) {}

  async log(input: AuditLogInput): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: input.tenantId,
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      before: input.before || {},
      after: input.after || {},
      metadata: {
        version: 1,
        ...input.metadata,
      },
    };

    // Persist to database
    await this.prisma.auditLog.create({
      data: {
        id: entry.id,
        timestamp: new Date(entry.timestamp),
        tenantId: entry.tenantId,
        actorUserId: entry.actor.userId,
        actorRole: entry.actor.role,
        actorSource: entry.actor.source,
        action: entry.action,
        entityType: entry.entity.type,
        entityId: entry.entity.id,
        projectId: entry.entity.projectId,
        before: entry.before,
        after: entry.after,
        metadata: entry.metadata as Record<string, unknown>,
      },
    });

    // Publish event (non-blocking)
    if (this.eventBus?.isConnected()) {
      this.eventBus
        .publish({
          type: EventType.AUDIT_ENTRY_CREATED,
          projectId: entry.entity.projectId,
          tenantId: entry.tenantId,
          userId: entry.actor.userId,
          payload: { auditEntryId: entry.id, action: entry.action, entityType: entry.entity.type },
        })
        .catch((err) =>
          console.error(`[AuditLogger:${this.serviceName}] Failed to publish audit event:`, err)
        );
    }

    return entry;
  }

  async query(options: AuditQueryOptions): Promise<{ data: AuditEntry[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 50;

    const where: Record<string, unknown> = {};
    if (options.projectId) where.projectId = options.projectId;
    if (options.tenantId) where.tenantId = options.tenantId;
    if (options.entityType) where.entityType = options.entityType;
    if (options.entityId) where.entityId = options.entityId;
    if (options.actorId) where.actorUserId = options.actorId;
    if (options.actorSource) where.actorSource = options.actorSource;
    if (options.action) where.action = { contains: options.action };
    if (options.startDate || options.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (options.startDate) dateFilter.gte = options.startDate;
      if (options.endDate) dateFilter.lte = options.endDate;
      where.timestamp = dateFilter;
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data: AuditEntry[] = (rows as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      timestamp: (row.timestamp as Date).toISOString(),
      tenantId: row.tenantId as string | undefined,
      actor: {
        userId: row.actorUserId as string,
        role: row.actorRole as string,
        source: row.actorSource as ActorSource,
      },
      action: row.action as string,
      entity: {
        type: row.entityType as string,
        id: row.entityId as string,
        projectId: row.projectId as string,
      },
      before: row.before as Record<string, unknown>,
      after: row.after as Record<string, unknown>,
      metadata: row.metadata as AuditMetadata,
    }));

    return { data, total };
  }
}

// ── Mandatory Events (helpers) ──

export const MANDATORY_AUDIT_ACTIONS = [
  'ai.recommendation.created',
  'ai.recommendation.approved',
  'ai.recommendation.rejected',
  'plan.created',
  'plan.updated',
  'plan.deleted',
  'baseline.created',
  'baseline.changed',
  'user.role.changed',
  'user.permission.changed',
  'feature_flag.changed',
  'risk.assessed',
  'risk.threshold_exceeded',
] as const;
