import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every page must be reachable without knowing its address.
 *
 * `/community/experiences` existed and worked for weeks with nothing linking to it, so the only way
 * in was to already know the URL — which meant a verification task asking for a log to be opened
 * "from the public pool" could not be performed at all (#253). `/suggestions` was the same: an
 * author could make a suggestion and had no way back to read it.
 *
 * This is the same idea as `admin-pages-reachable.test.ts`, which exists because `/admin/suggestions`
 * was built and linked from nowhere, extended past `(admin)` to the rest of the app.
 *
 * ⚠️ **It checks REACHABILITY, not findability, and the difference is real.** `/resources` is
 * linked from the bottom of one other page — a page about something else — and passes here. That
 * is a genuine gap this test does not close, and naming it otherwise would let somebody believe
 * the problem was solved. Whether such a page belongs in the navigation is #24.
 */
const WEB = process.cwd();
const APP = join(WEB, 'app');

/**
 * Routes that are unreachable on purpose, each with the reason.
 *
 * Kept as data rather than as a loosened rule: adding one is a deliberate act that shows up in a
 * diff and has to be justified there.
 */
const REACHED_BY_EMAIL_OR_REDIRECT: Record<string, string> = {
  '/': 'redirects to /login',
  '/verify-email': 'arrives by the emailed verification link',
  '/reset-password': 'arrives by the emailed reset link',
  '/set-password': 'arrives by the emailed set-password link (#196)',
  '/link-account': 'arrives by the emailed account-link token',
  '/confirm-email-change': 'arrives by the emailed confirmation link',
  '/invitations/[token]/accept': 'arrives by the invitation link',
  '/settings/data-export/[token]': 'arrives by the emailed export link',
};

const isGroup = (n: string) => n.startsWith('(') && n.endsWith(')');

function routes(dir = APP, parts: string[] = []): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const full = join(dir, e.name);
    if (isGroup(e.name)) {
      out.push(...routes(full, parts));
      continue;
    }
    if (e.name.startsWith('_') || e.name === 'api') continue;
    const next = [...parts, e.name];
    if (existsSync(join(full, 'page.tsx'))) out.push('/' + next.join('/'));
    out.push(...routes(full, next));
  }
  return out;
}

/**
 * Files that can hold a PAGE link.
 *
 * `lib/api/**` is excluded deliberately: those strings are API endpoints that happen to look like
 * page routes, and counting them made an earlier version of this check report every content route
 * as linked when several were orphans.
 */
function linkSources(dir = WEB, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.next', 'dist', 'coverage', 'api'].includes(e.name)) continue;
      linkSources(full, acc);
    } else if (/\.(tsx|ts)$/.test(e.name) && !/\.(spec|test)\./.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function linksTo(src: string, url: string): boolean {
  if (url.includes('[')) {
    const prefix = url.split('/[')[0];
    // A template building a child URL. Note this does NOT make the parent list reachable — that
    // conflation is why `/community/experiences` looked fine while being an orphan.
    return new RegExp(`href=\\{?\`${prefix}/[^\`]*\\$\\{`).test(src);
  }
  return (
    src.includes(`href="${url}"`) ||
    src.includes(`href='${url}'`) ||
    src.includes(`href={\`${url}\`}`) ||
    src.includes(`href: '${url}'`) ||
    src.includes(`href="${url}?`) ||
    src.includes(`href={\`${url}?`) ||
    src.includes(`push('${url}')`) ||
    src.includes(`replace('${url}')`) ||
    src.includes(`redirect('${url}')`)
  );
}

function unreachable(extraRoutes: string[] = []): string[] {
  const sources = linkSources().map((f) => readFileSync(f, 'utf8'));
  return [...routes(), ...extraRoutes]
    .filter((r) => !(r in REACHED_BY_EMAIL_OR_REDIRECT))
    .filter((r) => !sources.some((src) => linksTo(src, r)));
}

describe('every page can be reached without typing its URL', () => {
  it('has no orphans outside the named exceptions', () => {
    expect(
      unreachable(),
      'These pages exist and nothing links to them, so the only way in is to already know the ' +
        'address. Either link them, or add them to REACHED_BY_EMAIL_OR_REDIRECT with a reason.',
    ).toEqual([]);
  });

  it('reaches the two that prompted this test', () => {
    const orphans = unreachable();
    expect(orphans).not.toContain('/community/experiences');
    expect(orphans).not.toContain('/suggestions');
  });

  it('catches a new orphan — otherwise this test proves nothing', () => {
    // A fixture page nothing links to. Without this, a check that always returned [] would pass
    // every assertion above while catching nothing at all.
    //
    // ⚠️ No leading underscore in the name. `_foo` is a Next.js PRIVATE folder and is not a route,
    // so a fixture called `__fixture__` is correctly ignored — the first version of this test used
    // one and failed, which was the route enumerator being right rather than wrong.
    const dir = join(APP, '(content)', 'zz-reachability-fixture');
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'page.tsx'), 'export default function P() { return null; }\n');
      expect(unreachable()).toContain('/zz-reachability-fixture');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('every exception names a reason', () => {
    for (const [route, reason] of Object.entries(REACHED_BY_EMAIL_OR_REDIRECT)) {
      expect(reason.length, `${route} needs a reason, not an empty string`).toBeGreaterThan(10);
    }
  });

  it('no exception is stale — each still names a real page', () => {
    // An exception for a deleted route quietly becomes permission for a future one with the same
    // name to be unreachable.
    const all = new Set(routes());
    for (const route of Object.keys(REACHED_BY_EMAIL_OR_REDIRECT)) {
      if (route === '/') continue;
      expect(all.has(route), `${route} is on the exception list but no longer exists`).toBe(true);
    }
  });
});
