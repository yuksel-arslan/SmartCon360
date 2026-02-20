/**
 * Backend proxy utility for Next.js API routes.
 * Forwards requests to core-service (the real backend).
 * This avoids circular dependencies with the client-side stores.
 *
 * When core-service is unreachable (e.g. on Vercel without Railway),
 * forwardRequest throws — callers should catch and return appropriate fallback.
 */

const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3000/api/v1';

/**
 * Forward a Next.js request to core-service and return the response.
 * Copies auth headers and returns the core-service response as-is.
 * Throws if core-service is unreachable.
 */
export async function forwardRequest(
  path: string,
  method: string,
  body?: unknown,
  authHeader?: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;

  const opts: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  return fetch(`${CORE_SERVICE_URL}${path}`, opts);
}

/**
 * Safe proxy: forwards to core-service but returns a fallback JSON response
 * if core-service is unreachable (503 Service Unavailable).
 */
export async function safeForward(
  path: string,
  method: string,
  body?: unknown,
  authHeader?: string | null,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await forwardRequest(path, method, body, authHeader);
    const json = await res.json();
    return { ok: res.ok, status: res.status, data: json };
  } catch {
    return {
      ok: false,
      status: 503,
      data: {
        data: null,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Core service is not reachable' },
      },
    };
  }
}
