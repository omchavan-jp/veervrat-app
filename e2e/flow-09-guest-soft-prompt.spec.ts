import { test, expect } from '@playwright/test';

// Flow 9: a guest browses public content (weaknesses, Pothi), hits a sign-in prompt when
// attempting a gated action, and can reach the signup page. All guest-accessible content
// routes live in the (content) route group and must render without a session.
test.describe('Flow 9: guest browse → soft prompt → signup', () => {
  test('guest can browse the virtues & weaknesses browser', async ({ page }) => {
    await page.goto('/virtues');
    await expect(page).toHaveURL(/\/virtues/); // not redirected to /login
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
  });

  test('guest can browse the Pothi', async ({ page }) => {
    await page.goto('/pothi');
    await expect(page).toHaveURL(/\/pothi/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
  });

  test('guest can browse the public blogs', async ({ page }) => {
    await page.goto('/community/blogs');
    await expect(page).toHaveURL(/\/community\/blogs/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
  });

  test('a gated action sends the guest to login, from which they can reach signup', async ({ page }) => {
    // Hitting an app-only route as a guest is redirected to login (the soft gate).
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    // From login a guest can navigate to signup (link targeted by href — label is localised).
    const signupLink = page.locator('a[href="/signup"]').first();
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/, { timeout: 15_000 });
    // The signup form is present (display name + password fields).
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
