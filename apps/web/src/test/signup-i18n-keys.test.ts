import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import en from '../../messages/en.json';
import mr from '../../messages/mr.json';

/**
 * Every `t('key')` must exist in the namespace the component actually asks for.
 *
 * Missing keys render as the raw path — `auth.signup.dob` appeared verbatim in the signup form
 * on a deployed environment, because keys were added to `auth.login` while the page reads
 * `auth.signup`. En/mr parity did not catch it: both locales had them in the same wrong place.
 *
 * Parity checks that the two languages agree. This checks that either of them is *usable*.
 */
const WEB = resolve(__dirname, '../..');
const SKIP = new Set(['node_modules', '.next', 'dist', 'coverage', '.turbo']);

function files(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files(full, acc);
    else if (/\.tsx$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function lookup(messages: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
}

describe('translation keys resolve in the namespace the component uses', () => {
  it('has no missing keys in en or mr', () => {
    const missing: string[] = [];

    for (const file of files(join(WEB, 'app')).concat(files(join(WEB, 'components')))) {
      const src = readFileSync(file, 'utf8');
      const ns = src.match(/useTranslations\(\s*['"]([^'"]+)['"]\s*\)/)?.[1];
      if (!ns) continue;

      // Literal keys only. Computed ones (`t(\`role.${x}\`)`) cannot be checked statically, and
      // guessing at them would produce false failures.
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
        const full = `${ns}.${m[1]}`;
        for (const [loc, messages] of [
          ['en', en],
          ['mr', mr],
        ] as const) {
          if (typeof lookup(messages as Record<string, unknown>, full) !== 'string') {
            missing.push(`${loc}: ${full}  (${file.replace(WEB, '')})`);
          }
        }
      }
    }

    expect(missing, 'Keys used by a component but absent from that namespace').toEqual([]);
  });
});
