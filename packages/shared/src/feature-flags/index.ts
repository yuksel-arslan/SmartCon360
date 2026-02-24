/**
 * SmartCon360 Feature Flags
 *
 * Tenant-aware feature flag system for controlled rollout.
 * Supports global flags and per-tenant overrides.
 *
 * Usage:
 *   const ff = new FeatureFlagService(prisma, redis);
 *   const enabled = await ff.isEnabled('ai_risk_engine', tenantId);
 */

// ── Flag Definitions ──

export enum FeatureFlag {
  // Phase A — Infrastructure
  EVENT_BUS = 'event_bus',
  AUDIT_LOGGER = 'audit_logger',

  // Phase B — First Smart Features
  AI_RISK_ENGINE = 'ai_risk_engine',
  PHASE_STRATEGY = 'phase_strategy',
  OFFLINE_PWA = 'offline_pwa',

  // Phase C — Expansion
  SCENARIO_OPTIMIZER = 'scenario_optimizer',
  MULTI_TENANT = 'multi_tenant',
  AI_RISK_ENGINE_ML = 'ai_risk_engine_ml',

  // Phase D — Platform Maturity
  PROGRAM_INTELLIGENCE = 'program_intelligence',
  MULTI_CURRENCY = 'multi_currency',
  I18N = 'i18n',
}

export interface FeatureFlagConfig {
  flag: string;
  enabled: boolean;
  description: string;
  tenantOverrides?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}

// ── Prisma-compatible interface ──

interface PrismaFlagClient {
  featureFlag: {
    findUnique: (args: { where: { flag: string } }) => Promise<Record<string, unknown> | null>;
    findMany: (args?: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
    upsert: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
}

// ── Redis-compatible interface ──

interface RedisCache {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: Record<string, unknown>) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
}

// ── Feature Flag Service ──

const CACHE_PREFIX = 'ff:';
const CACHE_TTL_SECONDS = 60; // 1 minute cache

export class FeatureFlagService {
  constructor(
    private readonly prisma: PrismaFlagClient,
    private readonly redis?: RedisCache
  ) {}

  async isEnabled(flag: string, tenantId?: string): Promise<boolean> {
    // Check cache first
    const cacheKey = tenantId ? `${CACHE_PREFIX}${flag}:${tenantId}` : `${CACHE_PREFIX}${flag}`;
    if (this.redis) {
      const cached = await this.redis.get(cacheKey).catch(() => null);
      if (cached !== null) return cached === 'true';
    }

    // Query database
    const row = await this.prisma.featureFlag.findUnique({ where: { flag } });
    if (!row) {
      await this.cacheResult(cacheKey, false);
      return false;
    }

    const globalEnabled = row.enabled as boolean;

    // Check tenant-specific override
    if (tenantId && row.tenantOverrides) {
      const overrides = row.tenantOverrides as Record<string, boolean>;
      if (tenantId in overrides) {
        const result = overrides[tenantId];
        await this.cacheResult(cacheKey, result);
        return result;
      }
    }

    await this.cacheResult(cacheKey, globalEnabled);
    return globalEnabled;
  }

  async setFlag(
    flag: string,
    enabled: boolean,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { flag },
      create: {
        flag,
        enabled,
        description: description || '',
        metadata: metadata || {},
        tenantOverrides: {},
      },
      update: { enabled, ...(description ? { description } : {}), ...(metadata ? { metadata } : {}) },
    });

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`${CACHE_PREFIX}${flag}`).catch(() => {});
    }
  }

  async setTenantOverride(flag: string, tenantId: string, enabled: boolean): Promise<void> {
    const existing = await this.prisma.featureFlag.findUnique({ where: { flag } });
    if (!existing) {
      throw new Error(`Feature flag '${flag}' does not exist. Create it first.`);
    }

    const overrides = (existing.tenantOverrides as Record<string, boolean>) || {};
    overrides[tenantId] = enabled;

    await this.prisma.featureFlag.upsert({
      where: { flag },
      create: {
        flag,
        enabled: existing.enabled as boolean,
        description: existing.description as string,
        tenantOverrides: overrides,
        metadata: (existing.metadata as Record<string, unknown>) || {},
      },
      update: { tenantOverrides: overrides },
    });

    // Invalidate tenant-specific cache
    if (this.redis) {
      await this.redis.del(`${CACHE_PREFIX}${flag}:${tenantId}`).catch(() => {});
    }
  }

  async removeTenantOverride(flag: string, tenantId: string): Promise<void> {
    const existing = await this.prisma.featureFlag.findUnique({ where: { flag } });
    if (!existing) return;

    const overrides = (existing.tenantOverrides as Record<string, boolean>) || {};
    delete overrides[tenantId];

    await this.prisma.featureFlag.upsert({
      where: { flag },
      create: {
        flag,
        enabled: existing.enabled as boolean,
        description: existing.description as string,
        tenantOverrides: overrides,
        metadata: (existing.metadata as Record<string, unknown>) || {},
      },
      update: { tenantOverrides: overrides },
    });

    if (this.redis) {
      await this.redis.del(`${CACHE_PREFIX}${flag}:${tenantId}`).catch(() => {});
    }
  }

  async getAllFlags(): Promise<FeatureFlagConfig[]> {
    const rows = await this.prisma.featureFlag.findMany({ orderBy: { flag: 'asc' } });
    return rows.map((row) => ({
      flag: row.flag as string,
      enabled: row.enabled as boolean,
      description: (row.description as string) || '',
      tenantOverrides: (row.tenantOverrides as Record<string, boolean>) || {},
      metadata: (row.metadata as Record<string, unknown>) || {},
    }));
  }

  private async cacheResult(key: string, value: boolean): Promise<void> {
    if (!this.redis) return;
    await this.redis.set(key, String(value), { EX: CACHE_TTL_SECONDS }).catch(() => {});
  }
}

// ── Express Middleware ──

export function requireFeatureFlag(flag: string, flagService: FeatureFlagService) {
  return async (
    req: { headers: Record<string, string | string[] | undefined> },
    res: { status: (code: number) => { json: (body: unknown) => void } },
    next: () => void
  ): Promise<void> => {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const enabled = await flagService.isEnabled(flag, tenantId);
    if (!enabled) {
      res.status(404).json({
        data: null,
        error: { code: 'FEATURE_DISABLED', message: `Feature '${flag}' is not available` },
      });
      return;
    }
    next();
  };
}
