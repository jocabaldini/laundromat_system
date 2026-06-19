// apps/web/src/lib/api/client.ts
type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

async function apiFetch(path: string, opts: ApiOptions = {}) {
  const url = path.startsWith('/') ? `/api${path}` : `/api/${path}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
    },
    cache: 'no-store',
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');
    throw new Error(
      `API ${res.status} ${res.statusText}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`,
    );
  }

  return isJson ? res.json() : res.text();
}

export const api = {
  get: (path: string, opts?: ApiOptions) => apiFetch(path, { ...opts, method: 'GET' }),
  post: (path: string, body?: unknown, opts?: ApiOptions) =>
    apiFetch(path, {
      ...opts,
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(opts?.headers ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: (path: string, body?: unknown, opts?: ApiOptions) =>
    apiFetch(path, {
      ...opts,
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...(opts?.headers ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: (path: string, body?: unknown, opts?: ApiOptions) =>
    apiFetch(path, {
      ...opts,
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...(opts?.headers ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: (path: string, opts?: ApiOptions) => apiFetch(path, { ...opts, method: 'DELETE' }),
};
