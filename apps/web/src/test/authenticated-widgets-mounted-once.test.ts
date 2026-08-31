import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The widgets every signed-in person should have are mounted on the shell they all share, not on
 * one route group's layout.
 *
 * `ActionLauncher`, `ConsentGate` and `ContentEditor` were mounted in `(app)/layout-client.tsx`,
 * whose comment said they covered "all four authenticated route groups". Four of the five:
 * `(vratmitra)`, `(moderation)` and `(admin)` import `AppLayoutClient` and inherited them — but
 * `(content)` has its own client, because it is the one group that must also render for guests,
 * and so inherited none of them.
 *
 * Each consequence was precisely inverted (#278):
 *
 *   - a CONTENT_SUGGEST grantee could not suggest anything on a virtue, weakness, sentence or the
 *     pothi — the content the feature is named for
 *   - a CONTENT_EDIT grantee could not edit the content pages
 *   - a signed-in person reading the catalogue was never re-prompted when a policy was
 *     republished, which is a hole in a consent mechanism exactly where somebody sits and reads
 *
 * None of it raised an error. The button was simply absent, and nothing distinguished a missing
 * grant from a missing mount.
 *
 * This is the mechanism rather than the reminder: a sixth route group gets the widgets by
 * construction, and re-mounting one in a single layout fails here.
 */

const WEB = process.cwd();
const APP_DIR = join(WEB, 'app');
const SHELL = join(WEB, 'components', 'layout', 'app-shell.tsx');

const WIDGETS = ['ActionLauncher', 'ConsentGate', 'ContentEditor'] as const;

/** Route-group directories: `app/(app)`, `app/(content)`, and so on. */
function routeGroups(): string[] {
  return readdirSync(APP_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')'))
    .map((e) => e.name);
}

/** Every layout file in a group — both the server `layout.tsx` and any `layout-client.tsx`. */
function layoutFiles(group: string): string[] {
  return ['layout.tsx', 'layout-client.tsx']
    .map((f) => join(APP_DIR, group, f))
    .filter((f) => existsSync(f));
}

describe('the authenticated widgets are mounted on the shared shell', () => {
  it('mounts all three in AppShell', () => {
    const shell = readFileSync(SHELL, 'utf8');
    for (const w of WIDGETS) {
      expect(shell, `${w} must be rendered by AppShell`).toContain(`<${w}`);
    }
  });

  it('mounts none of them in an individual route-group layout', () => {
    const offenders: string[] = [];

    for (const group of routeGroups()) {
      for (const file of layoutFiles(group)) {
        const src = readFileSync(file, 'utf8');
        for (const w of WIDGETS) {
          // `<Widget` as JSX, not the word in a comment — the old mount site left an explanatory
          // comment behind that names all three, and a substring match would flag it forever.
          if (new RegExp(`<${w}[\\s/>]`).test(src)) {
            offenders.push(`${group}/${file.split('/').pop()} renders <${w}>`);
          }
        }
      }
    }

    expect(
      offenders,
      'Mounting one of these in a single layout is what caused #278: the groups that import that ' +
        'layout inherit it and the ones with their own client silently do not. Render it in ' +
        'AppShell, which every authenticated group shares.',
    ).toEqual([]);
  });

  it('reaches (content) — the group that had none of them', () => {
    // The specific regression. `(content)` renders AppShell for a signed-in reader and its own
    // minimal bar for a guest, so the widgets must arrive via the shell and must NOT be added to
    // its guest branch.
    const client = readFileSync(join(APP_DIR, '(content)', 'layout-client.tsx'), 'utf8');
    expect(client, '(content) must render AppShell for signed-in readers').toContain('<AppShell');
    for (const w of WIDGETS) {
      expect(client, `${w} must come from AppShell, not be re-added here`).not.toContain(`<${w}`);
    }
  });

  it('every group that renders AppShell therefore gets them', () => {
    const viaShell = routeGroups().filter((g) =>
      layoutFiles(g).some((f) => readFileSync(f, 'utf8').includes('<AppShell')),
    );
    // Guards against the opposite failure: someone "fixes" a future gap by giving a group its own
    // chrome instead of the shared shell, which would put us back where #278 started.
    expect(viaShell).toContain('(app)');
    expect(viaShell).toContain('(content)');
  });
});
