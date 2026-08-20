import { test, expect } from '@playwright/test';

/**
 * Regression guard for a request storm: /auth/me fired ~200 times a second on every page,
 * signed in or out, until the rate limiter cut in. Measured 1311 requests in 8 seconds against
 * a local build, and ~2600 console errors in one UAT session.
 *
 * The mechanism needed two individually reasonable things:
 *   1. a layout that unmounts its children while the auth query is loading
 *   2. any component inside those children also calling useAuth
 * React Query refetches an ERRORED query on every fresh mount regardless of staleTime, so:
 * loading ends -> children mount -> second consumer subscribes -> refetch -> loading starts ->
 * children unmount -> repeat.
 *
 * It lives here rather than in jsdom because it was only ever reproducible in a real browser —
 * component-level tests of each half passed cleanly while the app was unusable.
 */
test.describe('auth query must settle', () => {
  test('anonymous visitor triggers /auth/me once, not continuously', async ({ page }) => {
    let calls = 0;
    page.on('request', (r) => {
      if (r.url().includes('/auth/me')) calls++;
    });

    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    // Long enough for a runaway loop to be unmistakable: the bug produced hundreds here.
    await page.waitForTimeout(5000);

    // Not exactly 1 — a legitimate remount or refocus may add one. Anything in double figures
    // means the loop is back.
    expect(calls, `/auth/me called ${calls} times — expected a small number`).toBeLessThan(5);
  });

  test('the page actually renders rather than spinning', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    // The storm held the layout on its loading spinner, so a rendered form is itself the proof
    // that the query settled into a successful "signed out" result.
    await expect(page.getByRole('button', { name: /send|reset|पाठवा/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
