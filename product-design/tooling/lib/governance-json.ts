import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function governanceJson(file: string): Promise<Response> {
  try {
    const body = await readFile(path.join(process.cwd(), '..', '00-governance', file));
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
