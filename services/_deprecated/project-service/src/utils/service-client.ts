import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Internal service URLs — used for cross-module data flow.
 * Per architecture: cross-module data flows through hub-service,
 * but direct calls are used for tightly-coupled operations (BOQ→CostPilot).
 */
const SERVICE_URLS = {
  costService: process.env.COST_SERVICE_URL || 'http://localhost:3011',
  hubService: process.env.HUB_SERVICE_URL || 'http://localhost:3018',
  taktEngine: process.env.TAKT_ENGINE_URL || 'http://localhost:8001',
};

interface ServiceCallResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make best-effort HTTP call to another service.
 * Returns success/failure without throwing — callers decide how to handle.
 */
async function callService<T = unknown>(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'POST',
  body?: unknown,
  authHeader?: string,
): Promise<ServiceCallResult<T>> {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      logger.warn({ path, status: res.status, errBody }, 'Service call failed');
      return { success: false, error: errBody.error || `HTTP ${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data: data as T };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn({ path, error: message }, 'Service call error (service may be offline)');
    return { success: false, error: message };
  }
}

/**
 * Transfer BOQ items to CostPilot as WorkItems.
 * Creates individual work items in cost-service.
 */
export async function transferBoqToCostPilot(
  projectId: string,
  items: Array<{
    code: string;
    name: string;
    unit: string;
    quantity: number;
    unitPrice?: number;
    category?: string;
    wbsCode?: string;
  }>,
  authHeader?: string,
): Promise<ServiceCallResult<{ created: number; failed: number }>> {
  let created = 0;
  let failed = 0;

  for (const item of items) {
    const result = await callService(
      SERVICE_URLS.costService,
      '/cost/work-items',
      'POST',
      {
        projectId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        category: item.category || 'general',
        source: 'boq_import',
      },
      authHeader,
    );

    if (result.success) {
      created++;
    } else {
      failed++;
    }
  }

  logger.info({ projectId, created, failed }, 'BOQ→CostPilot transfer complete');
  return { success: failed === 0, data: { created, failed } };
}

/**
 * Transfer CBS nodes to CostPilot as budget structure.
 * Creates budget items from CBS leaf nodes.
 */
export async function transferCbsToCostPilot(
  projectId: string,
  cbsNodes: Array<{
    code: string;
    name: string;
    wbsNodeId?: string | null;
    level: number;
  }>,
  budgetId: string,
  authHeader?: string,
): Promise<ServiceCallResult<{ created: number }>> {
  // Only transfer leaf-level CBS nodes as budget items
  const leafNodes = cbsNodes.filter(
    (node) => !cbsNodes.some((other) => other.code.startsWith(node.code + '_') || other.code.startsWith(node.code + '/')),
  );

  const budgetItems = leafNodes.map((node) => ({
    wbsCode: node.code,
    description: node.name,
    plannedAmount: 0, // To be filled during cost estimation
    category: 'subcontract' as const,
  }));

  if (budgetItems.length === 0) {
    return { success: true, data: { created: 0 } };
  }

  const result = await callService(
    SERVICE_URLS.costService,
    `/cost/budgets/${budgetId}/items`,
    'POST',
    { items: budgetItems },
    authHeader,
  );

  return {
    success: result.success,
    data: { created: result.success ? budgetItems.length : 0 },
    error: result.error,
  };
}

/**
 * Notify hub-service about project setup completion.
 * Hub recalculates Project Health Score with new data.
 */
export async function notifyHubSetupComplete(
  projectId: string,
  summary: {
    drawings: number;
    wbsNodes: number;
    cbsNodes: number;
    trades: number;
    boqUploaded: boolean;
    standard: string;
  },
  authHeader?: string,
): Promise<ServiceCallResult> {
  return callService(
    SERVICE_URLS.hubService,
    '/hub/events',
    'POST',
    {
      type: 'PROJECT_SETUP_COMPLETE',
      projectId,
      payload: summary,
      timestamp: new Date().toISOString(),
    },
    authHeader,
  );
}

export { callService, SERVICE_URLS };
