import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every admin page must be reachable from the admin dashboard.
 *
 * `/admin/suggestions` was built and linked from nowhere. It existed, worked, was covered by
 * tests — and an admin looking for it found nothing, because the only way in was knowing the
 * URL. That is the same defect as an endpoint with no button (#217) and a notification that
 * leads to the wrong page (#22): **the backend is right and the way in is missing.**
 *
 * This is the mechanism instead of the reminder. A new admin page now fails here until someone
 * links it.
 */
const ADMIN_DIR = join(process.cwd(), 'app', '(admin)', 'admin');

function adminRoutes(): string[] {
  return (
    readdirSync(ADMIN_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      // Dynamic segments are reached from their parent list, not from the dashboard.
      .filter((e) => !e.name.startsWith('[') && !e.name.startsWith('('))
      .filter((e) => existsSync(join(ADMIN_DIR, e.name, 'page.tsx')))
      .map((e) => `/admin/${e.name}`)
  );
}

describe('the admin dashboard links every admin page', () => {
  it('has a card for each one', () => {
    const dashboard = readFileSync(join(ADMIN_DIR, 'page.tsx'), 'utf8');

    const unreachable = adminRoutes().filter(
      // `/admin/dashboard` is the dashboard itself under another name; it does not link to itself.
      (route) => route !== '/admin/dashboard' && !dashboard.includes(`'${route}'`),
    );

    expect(
      unreachable,
      'admin pages that exist but nothing links to — reachable only by typing the URL',
    ).toEqual([]);
  });

  it('finds the pages it is meant to be checking', () => {
    // Guards the guard: an empty result from a broken directory read would pass the test above
    // while checking nothing. An empty result is not a pass.
    expect(adminRoutes().length).toBeGreaterThan(5);
    expect(adminRoutes()).toContain('/admin/suggestions');
  });
});
