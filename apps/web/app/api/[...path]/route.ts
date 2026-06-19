import { getApiUrl } from '@/lib/api/config';

type Params = { path?: string[] };

const RESERVED_PREFIXES = new Set(['internal', 'webhooks']);

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

const STRIP_HEADERS = new Set([
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-real-ip',
]);

function isReserved(path: string[]) {
  const first = path[0];
  return first ? RESERVED_PREFIXES.has(first) : false;
}

function buildTargetUrl(path: string[], reqUrl: string) {
  const base = getApiUrl();
  const url = new URL(reqUrl);
  const cleanPath = path.join('/');
  return `${base}/${cleanPath}${url.search}`;
}

function filterRequestHeaders(incoming: Headers) {
  const headers = new Headers();

  incoming.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (STRIP_HEADERS.has(lower)) return;
    headers.set(key, value);
  });

  return headers;
}

function filterResponseHeaders(incoming: Headers) {
  const headers = new Headers();

  incoming.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    headers.append(key, value);
  });

  return headers;
}

async function proxy(req: Request, ctx: { params: Promise<Params> }) {
  const { path = [] } = await ctx.params;

  if (isReserved(path)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Path reserved for Next.js: /api/${path[0]}`,
      }),
      { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } },
    );
  }

  const target = buildTargetUrl(path, req.url);
  const headers = filterRequestHeaders(req.headers);

  const reqUrl = new URL(req.url);
  headers.set('x-forwarded-proto', reqUrl.protocol.replace(':', ''));
  headers.set('x-forwarded-host', reqUrl.host);
  headers.set('x-forwarded-uri', reqUrl.pathname + reqUrl.search);

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: filterResponseHeaders(upstream.headers),
  });
}

export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  return proxy(req, ctx);
}
export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  return proxy(req, ctx);
}
export async function PUT(req: Request, ctx: { params: Promise<Params> }) {
  return proxy(req, ctx);
}
export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  return proxy(req, ctx);
}
export async function DELETE(req: Request, ctx: { params: Promise<Params> }) {
  return proxy(req, ctx);
}
export async function OPTIONS(req: Request, ctx: { params: Promise<Params> }) {
  return proxy(req, ctx);
}
