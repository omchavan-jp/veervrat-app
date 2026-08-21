import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Guard for conventions §17 and the defect that motivated it.
 *
 * One web image is promoted from UAT to prod without rebuilding, so anything the bundler inlines
 * — every `NEXT_PUBLIC_*` — is identical in both environments. A `NEXT_PUBLIC_*` flag therefore
 * CANNOT gate a feature that must differ between them.
 *
 * This has now bitten three times:
 *   - `API_ORIGIN` baked into `rewrites()`, so prod's web tier addressed UAT's database (O22)
 *   - `NEXT_PUBLIC_SITE_URL`, so prod's link previews pointed at UAT
 *   - `NEXT_PUBLIC_CONTENT_EDIT`, which compiled the content editor out of every deployed build,
 *     so granting CONTENT_EDIT to a user did nothing anywhere
 *
 * The allowed list is deliberately tiny. The test is: does the value describe the IMAGE, or the
 * ENVIRONMENT the image runs in? Only the former may be baked.
 */
const ALLOWED = new Set([
  // Describes the image itself — correctly baked.
  'NEXT_PUBLIC_COMMIT_SHA',
]);

const WEB_ROOT = resolve(__dirname, '../..');
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '.turbo']);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry) && !full.includes('no-build-time-env-gates')) acc.push(full);
  }
  return acc;
}

describe('no per-environment behaviour is gated on a build-time flag', () => {
  it('reads no NEXT_PUBLIC_* beyond the allowed list', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(WEB_ROOT)) {
      // Matches actual reads, not prose. Naming the variable in a comment explaining why it
      // was removed is exactly the documentation this guard wants to keep.
      const matches = (
        readFileSync(file, 'utf8').match(/process\.env\.NEXT_PUBLIC_[A-Z0-9_]+/g) ?? []
      ).map((m) => m.replace('process.env.', ''));
      for (const name of new Set(matches)) {
        if (!ALLOWED.has(name)) offenders.push(`${name} in ${file.replace(WEB_ROOT, '')}`);
      }
    }

    expect(
      offenders,
      'Per-environment config must be read at runtime (lib/runtime-config.ts), not baked ' +
        'into the image. See documentation/21_Infrastructure-Conventions.md §17.',
    ).toEqual([]);
  });
});
