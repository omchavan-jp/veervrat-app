import type { NextRequest } from 'next/server';
import {
  internalApiBase,
  productDocsInternalUrl,
  publicApiBase,
  readServerRuntimeConfig,
} from '@/lib/runtime-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = '/product-docs';
const FORWARD_HEADERS = [
  'accept',
  'accept-language',
  'if-modified-since',
  'if-none-match',
  'next-router-prefetch',
  'next-router-state-tree',
  'next-url',
  'purpose',
  'range',
  'rsc',
  'user-agent',
  'x-nextjs-data',
];

function privateResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

function loginRedirect(request: NextRequest): Response {
  const url = new URL('/login', request.url);
  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  if (acceptsHtml)
    url.searchParams.set('returnTo', request.nextUrl.pathname + request.nextUrl.search);
  return new Response(null, {
    status: 307,
    headers: {
      Location: url.pathname + url.search,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

async function handle(request: NextRequest): Promise<Response> {
  if (readServerRuntimeConfig().productDocsMode !== 'granted') {
    return privateResponse(404, 'Not found');
  }

  const session = request.cookies.get('veervrat_session')?.value;
  if (!session) return loginRedirect(request);

  const api = internalApiBase() ?? publicApiBase();
  let access: Response;
  try {
    access = await fetch(`${api}/auth/product-docs-access`, {
      headers: { Cookie: `veervrat_session=${session}` },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return privateResponse(503, 'Access check unavailable');
  }
  if (access.status === 401) return loginRedirect(request);
  if (access.status === 403) return privateResponse(403, 'Forbidden');
  if (!access.ok) return privateResponse(503, 'Access check unavailable');

  const configured = productDocsInternalUrl();
  if (!configured) return privateResponse(503, 'Product docs unavailable');

  let origin: URL;
  try {
    origin = new URL(configured);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/'
    ) {
      return privateResponse(503, 'Product docs unavailable');
    }
  } catch {
    return privateResponse(503, 'Product docs unavailable');
  }

  const path = request.nextUrl.pathname;
  if (path !== PREFIX && !path.startsWith(`${PREFIX}/`)) return privateResponse(404, 'Not found');
  const target = new URL(path + request.nextUrl.search, origin);
  const forwarded = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) forwarded.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: forwarded,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return privateResponse(503, 'Product docs unavailable');
  }

  const headers = new Headers(upstream.headers);
  for (const name of [
    'set-cookie',
    'content-encoding',
    'content-length',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'upgrade',
    'server',
    'x-powered-by',
  ]) {
    headers.delete(name);
  }
  const location = headers.get('location');
  if (location) {
    const destination = new URL(location, origin);
    if (
      destination.origin !== origin.origin ||
      (destination.pathname !== PREFIX && !destination.pathname.startsWith(`${PREFIX}/`))
    ) {
      return privateResponse(502, 'Invalid product docs redirect');
    }
    headers.set('location', destination.pathname + destination.search + destination.hash);
  }
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Vary', [headers.get('Vary'), 'Cookie'].filter(Boolean).join(', '));
  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export const GET = handle;
export const HEAD = handle;
