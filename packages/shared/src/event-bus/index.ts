/**
 * SmartCon360 Event Bus — Redis Pub/Sub wrapper
 *
 * Provides event-driven communication between microservices.
 * All cross-module data flows through events, not direct service calls.
 *
 * Usage:
 *   const bus = new EventBus(redisUrl);
 *   await bus.connect();
 *   bus.subscribe('schedule.updated', handler);
 *   await bus.publish({ type: EventType.SCHEDULE_UPDATED, ... });
 */

import { createClient, RedisClientType } from 'redis';

// ── Event Types ──

export enum EventType {
  // Schedule Events
  SCHEDULE_UPDATED = 'schedule.updated',
  BASELINE_CHANGED = 'baseline.changed',
  ACTIVITY_DELAYED = 'activity.delayed',
  TAKT_PLAN_CREATED = 'takt.plan.created',
  TAKT_PLAN_UPDATED = 'takt.plan.updated',

  // Progress Events
  PROGRESS_RECORDED = 'progress.recorded',
  PPC_CALCULATED = 'ppc.calculated',

  // Risk Events
  RISK_ASSESSED = 'risk.assessed',
  RISK_THRESHOLD_EXCEEDED = 'risk.threshold_exceeded',

  // AI Events
  AI_RECOMMENDATION_CREATED = 'ai.recommendation.created',
  AI_RECOMMENDATION_APPROVED = 'ai.recommendation.approved',
  AI_RECOMMENDATION_REJECTED = 'ai.recommendation.rejected',

  // Scenario Events
  SCENARIO_GENERATED = 'scenario.generated',
  SCENARIO_PROPOSED = 'scenario.proposed',
  SCENARIO_APPROVED = 'scenario.approved',

  // Quality Events
  NCR_CREATED = 'quality.ncr.created',
  INSPECTION_COMPLETED = 'quality.inspection.completed',

  // Safety Events
  INCIDENT_REPORTED = 'safety.incident.reported',
  PTW_ISSUED = 'safety.ptw.issued',

  // Cost Events
  BUDGET_UPDATED = 'cost.budget.updated',
  EVM_CALCULATED = 'cost.evm.calculated',

  // Resource Events
  RESOURCE_CONFLICT_DETECTED = 'resource.conflict.detected',
  CREW_ASSIGNED = 'resource.crew.assigned',

  // Program Events
  KPI_THRESHOLD_BREACHED = 'kpi.threshold.breached',

  // Audit Events
  AUDIT_ENTRY_CREATED = 'audit.entry.created',
}

// ── Event Model ──

export interface SmartConEvent<T = Record<string, unknown>> {
  id: string;
  type: EventType;
  timestamp: string;
  tenantId?: string;
  projectId?: string;
  userId?: string;
  payload: T;
  sourceService: string;
  correlationId?: string;
}

export type EventHandler<T = Record<string, unknown>> = (
  event: SmartConEvent<T>
) => void | Promise<void>;

// ── Event Bus ──

export class EventBus {
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private connected = false;

  constructor(
    private readonly redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
    private readonly serviceName: string = 'unknown'
  ) {}

  async connect(): Promise<void> {
    if (this.connected) return;

    this.publisher = createClient({ url: this.redisUrl }) as RedisClientType;
    this.subscriber = this.publisher.duplicate() as RedisClientType;

    this.publisher.on('error', (err) =>
      console.error(`[EventBus:${this.serviceName}] Publisher error:`, err.message)
    );
    this.subscriber.on('error', (err) =>
      console.error(`[EventBus:${this.serviceName}] Subscriber error:`, err.message)
    );

    await this.publisher.connect();
    await this.subscriber.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.publisher?.quit();
    await this.subscriber?.quit();
    this.publisher = null;
    this.subscriber = null;
    this.connected = false;
    this.handlers.clear();
  }

  async publish<T = Record<string, unknown>>(
    event: Omit<SmartConEvent<T>, 'id' | 'timestamp' | 'sourceService'> & {
      id?: string;
      timestamp?: string;
      sourceService?: string;
    }
  ): Promise<void> {
    if (!this.publisher || !this.connected) {
      throw new Error('[EventBus] Not connected. Call connect() first.');
    }

    const fullEvent: SmartConEvent<T> = {
      id: event.id || crypto.randomUUID(),
      timestamp: event.timestamp || new Date().toISOString(),
      sourceService: event.sourceService || this.serviceName,
      type: event.type,
      tenantId: event.tenantId,
      projectId: event.projectId,
      userId: event.userId,
      payload: event.payload,
      correlationId: event.correlationId,
    };

    const channel = `smartcon360:${event.type}`;
    await this.publisher.publish(channel, JSON.stringify(fullEvent));
  }

  async subscribe<T = Record<string, unknown>>(
    eventType: EventType | string,
    handler: EventHandler<T>
  ): Promise<void> {
    if (!this.subscriber || !this.connected) {
      throw new Error('[EventBus] Not connected. Call connect() first.');
    }

    const channel = `smartcon360:${eventType}`;
    const existing = this.handlers.get(channel) || [];
    existing.push(handler as EventHandler);
    this.handlers.set(channel, existing);

    await this.subscriber.subscribe(channel, (message) => {
      try {
        const event = JSON.parse(message) as SmartConEvent<T>;
        const handlers = this.handlers.get(channel) || [];
        for (const h of handlers) {
          Promise.resolve(h(event as SmartConEvent)).catch((err) =>
            console.error(`[EventBus:${this.serviceName}] Handler error for ${eventType}:`, err)
          );
        }
      } catch (err) {
        console.error(`[EventBus:${this.serviceName}] Failed to parse event on ${channel}:`, err);
      }
    });
  }

  async unsubscribe(eventType: EventType | string): Promise<void> {
    if (!this.subscriber) return;
    const channel = `smartcon360:${eventType}`;
    await this.subscriber.unsubscribe(channel);
    this.handlers.delete(channel);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ── Factory ──

let defaultBus: EventBus | null = null;

export function getEventBus(serviceName?: string): EventBus {
  if (!defaultBus) {
    defaultBus = new EventBus(
      process.env.REDIS_URL || 'redis://localhost:6379',
      serviceName || process.env.SERVICE_NAME || 'unknown'
    );
  }
  return defaultBus;
}
