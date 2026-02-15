// Uniclass Offline Cache Service
// Wraps UniclassApiService with local DB caching for offline access

import { prisma } from '../utils/prisma';
import { UniclassApiService, uniclassApiService } from './uniclass-api.service';
import { logger } from '../utils/logger';

interface CachedNode {
  code: string;
  title: string;
  description?: string | null;
  tableName: string;
  parentCode?: string | null;
  level: number;
  children?: CachedNode[];
}

export class UniclassCacheService {
  private api: UniclassApiService;
  private cacheTtlMs: number;

  constructor(api?: UniclassApiService, cacheTtlHours = 168) { // Default: 7 days
    this.api = api || uniclassApiService;
    this.cacheTtlMs = cacheTtlHours * 60 * 60 * 1000;
  }

  /**
   * Get classification by code — cache-first, then API fallback
   */
  async getClassification(code: string): Promise<CachedNode | null> {
    // Try cache first
    const cached = await prisma.uniclassCache.findUnique({ where: { code } });
    if (cached && !this.isStale(cached.syncedAt)) {
      return this.toCachedNode(cached);
    }

    // Try API
    try {
      const apiResult = await this.api.getClassification(code);
      if (apiResult) {
        await this.upsertCache({
          code: apiResult.code,
          title: apiResult.title,
          description: apiResult.description,
          tableName: this.inferTable(apiResult.code),
          parentCode: this.inferParentCode(apiResult.code),
          level: this.inferLevel(apiResult.code),
        });
        return {
          code: apiResult.code,
          title: apiResult.title,
          description: apiResult.description,
          tableName: this.inferTable(apiResult.code),
          parentCode: this.inferParentCode(apiResult.code),
          level: this.inferLevel(apiResult.code),
        };
      }
    } catch (error) {
      logger.warn({ message: 'Uniclass API unavailable, using cache', code, error: String(error) });
    }

    // Return stale cache if available
    if (cached) {
      return this.toCachedNode(cached);
    }

    return null;
  }

  /**
   * Get children of a code — cache-first, then API fallback
   */
  async getChildren(code: string): Promise<CachedNode[]> {
    // Try cache first
    const cached = await prisma.uniclassCache.findMany({
      where: { parentCode: code },
      orderBy: { code: 'asc' },
    });

    if (cached.length > 0 && !this.isStale(cached[0].syncedAt)) {
      return cached.map(c => this.toCachedNode(c));
    }

    // Try API
    try {
      const apiResults = await this.api.getChildren(code);
      if (apiResults.length > 0) {
        const tableName = this.inferTable(code);
        const parentLevel = this.inferLevel(code);
        await Promise.all(
          apiResults.map(item =>
            this.upsertCache({
              code: item.code,
              title: item.title,
              description: item.description,
              tableName,
              parentCode: code,
              level: parentLevel + 1,
            })
          )
        );
        return apiResults.map(item => ({
          code: item.code,
          title: item.title,
          description: item.description,
          tableName,
          parentCode: code,
          level: parentLevel + 1,
        }));
      }
    } catch (error) {
      logger.warn({ message: 'Uniclass API unavailable for children, using cache', code, error: String(error) });
    }

    // Return stale cache
    return cached.map(c => this.toCachedNode(c));
  }

  /**
   * Search classifications — cache-first, then API fallback
   */
  async search(query: string, table?: string): Promise<CachedNode[]> {
    // Try API first (for freshest results)
    try {
      const apiResults = await this.api.search(query, table);
      if (apiResults.length > 0) {
        // Cache the results
        await Promise.all(
          apiResults.map(item =>
            this.upsertCache({
              code: item.code,
              title: item.title,
              description: item.description,
              tableName: this.inferTable(item.code),
              parentCode: this.inferParentCode(item.code),
              level: this.inferLevel(item.code),
            })
          )
        );
        return apiResults.map(item => ({
          code: item.code,
          title: item.title,
          description: item.description,
          tableName: this.inferTable(item.code),
          parentCode: this.inferParentCode(item.code),
          level: this.inferLevel(item.code),
        }));
      }
    } catch (error) {
      logger.warn({ message: 'Uniclass API unavailable for search, falling back to cache', query, error: String(error) });
    }

    // Fallback: search local cache
    const where: any = {
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };
    if (table) {
      where.tableName = table;
    }

    const cached = await prisma.uniclassCache.findMany({
      where,
      orderBy: { code: 'asc' },
      take: 50,
    });

    return cached.map(c => this.toCachedNode(c));
  }

  /**
   * Get root-level items for a Uniclass table — cache-first
   */
  async getTableRoots(table: string): Promise<CachedNode[]> {
    // Try cache first
    const cached = await prisma.uniclassCache.findMany({
      where: { tableName: table, level: 1 },
      orderBy: { code: 'asc' },
    });

    if (cached.length > 0 && !this.isStale(cached[0].syncedAt)) {
      return cached.map(c => this.toCachedNode(c));
    }

    // Try API
    try {
      const apiResult = await this.api.getTable(table as any);
      if (apiResult?.items?.length > 0) {
        await Promise.all(
          apiResult.items.map(item =>
            this.upsertCache({
              code: item.code,
              title: item.title,
              description: item.description,
              tableName: table,
              parentCode: null,
              level: 1,
            })
          )
        );
        return apiResult.items.map(item => ({
          code: item.code,
          title: item.title,
          description: item.description,
          tableName: table,
          parentCode: null,
          level: 1,
        }));
      }
    } catch (error) {
      logger.warn({ message: 'Uniclass API unavailable for table roots, using cache', table, error: String(error) });
    }

    // Return stale cache
    return cached.map(c => this.toCachedNode(c));
  }

  /**
   * Sync a full Uniclass table into cache
   */
  async syncTable(table: string): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const apiResult = await this.api.getTable(table as any);
      if (!apiResult?.items) return { synced: 0, errors: 0 };

      const syncRecursive = async (items: Array<{ code: string; title: string; description?: string; children?: any[] }>, parentCode: string | null, level: number) => {
        for (const item of items) {
          try {
            await this.upsertCache({
              code: item.code,
              title: item.title,
              description: item.description,
              tableName: table,
              parentCode,
              level,
            });
            synced++;

            if (item.children && item.children.length > 0) {
              await syncRecursive(item.children, item.code, level + 1);
            }
          } catch (e) {
            errors++;
            logger.error({ message: 'Failed to cache Uniclass item', code: item.code, error: String(e) });
          }
        }
      };

      await syncRecursive(apiResult.items, null, 1);
    } catch (error) {
      logger.error({ message: 'Failed to sync Uniclass table', table, error: String(error) });
      throw error;
    }

    return { synced, errors };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalCached: number;
    byTable: Array<{ table: string; count: number }>;
    oldestSync: Date | null;
    newestSync: Date | null;
  }> {
    const [totalCached, byTable, oldest, newest] = await Promise.all([
      prisma.uniclassCache.count(),
      prisma.uniclassCache.groupBy({
        by: ['tableName'],
        _count: { id: true },
        orderBy: { tableName: 'asc' },
      }),
      prisma.uniclassCache.findFirst({ orderBy: { syncedAt: 'asc' }, select: { syncedAt: true } }),
      prisma.uniclassCache.findFirst({ orderBy: { syncedAt: 'desc' }, select: { syncedAt: true } }),
    ]);

    return {
      totalCached,
      byTable: byTable.map(b => ({ table: b.tableName, count: b._count.id })),
      oldestSync: oldest?.syncedAt || null,
      newestSync: newest?.syncedAt || null,
    };
  }

  // ── Helpers ──

  private isStale(syncedAt: Date): boolean {
    return Date.now() - syncedAt.getTime() > this.cacheTtlMs;
  }

  private async upsertCache(data: {
    code: string;
    title: string;
    description?: string | null;
    tableName: string;
    parentCode: string | null | undefined;
    level: number;
  }) {
    await prisma.uniclassCache.upsert({
      where: { code: data.code },
      update: {
        title: data.title,
        description: data.description || null,
        tableName: data.tableName,
        parentCode: data.parentCode || null,
        level: data.level,
        syncedAt: new Date(),
      },
      create: {
        code: data.code,
        title: data.title,
        description: data.description || null,
        tableName: data.tableName,
        parentCode: data.parentCode || null,
        level: data.level,
      },
    });
  }

  private toCachedNode(row: any): CachedNode {
    return {
      code: row.code,
      title: row.title,
      description: row.description,
      tableName: row.tableName,
      parentCode: row.parentCode,
      level: row.level,
    };
  }

  /**
   * Infer Uniclass table from code prefix (e.g. "Ss_25" → "Ss")
   */
  private inferTable(code: string): string {
    const match = code.match(/^([A-Z][a-z]?)[-_]/);
    return match ? match[1] : 'Ss';
  }

  /**
   * Infer parent code by removing last segment
   * e.g. "Ss_25_10_30" → "Ss_25_10", "Ss_25_10" → "Ss_25", "Ss_25" → null
   */
  private inferParentCode(code: string): string | null {
    const parts = code.split('_');
    if (parts.length <= 2) return null; // Root level (e.g. "Ss_25")
    return parts.slice(0, -1).join('_');
  }

  /**
   * Infer hierarchy level from code structure
   * Ss_25 = 1, Ss_25_10 = 2, Ss_25_10_30 = 3, Ss_25_10_30_25 = 4
   */
  private inferLevel(code: string): number {
    const parts = code.split('_');
    return Math.max(1, parts.length - 1);
  }
}

export const uniclassCacheService = new UniclassCacheService();
