import type { NextRequest } from 'next/server';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { internalApiBase, publicApiBase, readServerRuntimeConfig } from '@/lib/runtime-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = '/product-docs';
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

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

  const pathname = request.nextUrl.pathname;
  if (pathname !== PREFIX && !pathname.startsWith(`${PREFIX}/`))
    return privateResponse(404, 'Not found');
  let root: string;
  try {
    root = await realpath(
      path.resolve(
        process.env.PRODUCT_DOCS_STATIC_ROOT ??
          path.join(process.cwd(), '../../product-design/tooling/out'),
      ),
    );
  } catch {
    return privateResponse(503, 'Product docs unavailable');
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname.slice(PREFIX.length));
  } catch {
    return privateResponse(404, 'Not found');
  }
  const relative = decoded.split('/').filter(Boolean);
  if (
    relative.some(
      (part) =>
        part === '.' ||
        part === '..' ||
        part.includes('\\') ||
        part.includes('\0') ||
        part.includes('%'),
    )
  )
    return privateResponse(404, 'Not found');
  const requested = path.resolve(root, ...relative);
  if (requested !== root && !requested.startsWith(root + path.sep))
    return privateResponse(404, 'Not found');
  let file = requested;
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const actual = await realpath(file);
    if (!actual.startsWith(root + path.sep)) return privateResponse(404, 'Not found');
    if (!(await stat(actual)).isFile()) return privateResponse(404, 'Not found');
    const content = request.method === 'HEAD' ? null : await readFile(actual);
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type':
          pathname === '/product-docs/api/search'
            ? TYPES['.json']
            : (TYPES[path.extname(actual)] ?? 'application/octet-stream'),
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        Vary: 'Cookie',
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return privateResponse(404, 'Not found');
    console.error('Product docs static file unavailable', error);
    return privateResponse(503, 'Product docs unavailable');
  }
}

export const GET = handle;
export const HEAD = handle;
