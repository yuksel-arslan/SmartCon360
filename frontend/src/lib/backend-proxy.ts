/**
 * Backend proxy utility for Next.js API routes.
 * Forwards requests to core-service (the real backend).
 * This avoids circular dependencies with the client-side stores.
 */

const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3000/api/v1';

export async function proxyGet(path: string, headers?: Record<string, string>): Promise<Response> {
  return fetch(`${CORE_SERVICE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function proxyPost(path: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
  return fetch(`${CORE_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

export async function proxyPatch(path: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
  return fetch(`${CORE_SERVICE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

export async function proxyPut(path: string, body: unknown, headers?: Record<string, string>): Promise<Response> {
  return fetch(`${CORE_SERVICE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

export async function proxyDelete(path: string, headers?: Record<string, string>): Promise<Response> {
  return fetch(`${CORE_SERVICE_URL}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * Forward a Next.js request to core-service and return the response.
 * Copies auth headers and returns the core-service response as-is.
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
