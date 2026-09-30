import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sourcePath = path.resolve(process.cwd(), '../01-product-model/diagrams/product-foundation.d2');

export function GET() {
  try {
    const svg = execFileSync('d2', ['--theme', '0', '--dark-theme', '200', '--no-xml-tag', sourcePath, '-'], {
      encoding: 'utf8',
      timeout: 30_000,
    });

    return new Response(svg, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Content-Type': 'image/svg+xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Unable to render the canonical product-foundation.d2 source.', error);
    return new Response('Diagram rendering failed. Check that the D2 CLI is installed.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
