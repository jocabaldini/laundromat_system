import { getApiUrl } from './config';
import { getSession } from '../auth/session';

// Result type used by all server actions — never throw, always return.
// success: true  → data is available
// success: false → message explains what went wrong, status is the HTTP code (0 = network error)
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; message: string; status: number };

// Mutation result for operations that return no body (delete, logout, etc.)
export type ApiMutationResult =
  | { success: true }
  | { success: false; message: string; status: number };

type ServerFetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

// Core fetch function — injects auth token automatically.
// Always returns ApiResult, never throws (network errors become success: false).
async function serverFetch<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<ApiResult<T>> {
  const token = await getSession();
  const baseUrl = getApiUrl();

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      cache: 'no-store',
    });

    if (res.status === 204) {
      // No content — treat as success with null data
      return { success: true, data: null as T };
    }

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const message =
        (body as { message?: string | string[] } | null)?.message ??
        `Request failed with status ${res.status}`;
      return {
        success: false,
        message: Array.isArray(message) ? message.join('. ') : String(message),
        status: res.status,
      };
    }

    return { success: true, data: body as T };
  } catch {
    return {
      success: false,
      message: 'Serviço indisponível. Tente novamente em instantes.',
      status: 0,
    };
  }
}

// HTTP method helpers
export const serverApi = {
  get: <T>(path: string, opts?: ServerFetchOptions) =>
    serverFetch<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: ServerFetchOptions) =>
    serverFetch<T>(path, {
      ...opts,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, opts?: ServerFetchOptions) =>
    serverFetch<T>(path, {
      ...opts,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = void>(path: string, opts?: ServerFetchOptions) =>
    serverFetch<T>(path, { ...opts, method: 'DELETE' }),
};
