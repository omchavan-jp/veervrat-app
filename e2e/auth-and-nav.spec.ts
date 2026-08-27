import { test, expect } from '@playwright/test';
import { makeUser, registerAndOnboard } from './helpers/auth';
import { deleteUserByEmail } from './helpers/db';

// Critical-path smoke flows against the running stack (web :3000 + api :3001).
// Resilient selectors (role/label/url) over brittle DOM structure. Covers: guest redirect,
// login, authenticated navigation, language persistence — the flows that gate every other
// feature.
//
// The account is created by the suite. It used to be a hardcoded real personal address and
// its plaintext password, which was wrong twice over: a live credential committed to the
// repository, and a test whose outcome depended on the state of one human's account. It
// failed for exactly that reason — the account predates the consent gate, so a blocking
// consent dialog intercepted every click and no navigation assertion could run. A registered
// account consents during registration and starts clean.
const VA = makeUser('nav');

test.beforeAll(async () => {
  await registerAndOnboard(VA);
});

test.afterAll(() => {
  deleteUserByEmail(VA.email);
});

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('textbox').first().fill(VA.email);
  await page.locator('input[type="password"]').fill(VA.password);
  await page
    .getByRole('button', { name: /log ?in|sign ?in/i })
    .first()
    .click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Auth & navigation', () => {
  test('guest hitting a protected route is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('VA can log in and land on the dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    // Dashboard greets the user by name.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/namaskar/i);
  });

  test('authenticated VA can navigate Practice + Guidance sections', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: /^Study$/ }).click();
    await expect(page).toHaveURL(/\/study/);

    await page.getByRole('link', { name: /^Journeys$/ }).click();
    await expect(page).toHaveURL(/\/journeys/);

    await page.getByRole('link', { name: /My Vratmitras/i }).click();
    await expect(page).toHaveURL(/\/my-vratmitras/);
  });

  test('My Vratmitras renders inside the app shell (sidebar present)', async ({ page }) => {
    await login(page);
    await page.goto('/my-vratmitras');
    // The shell's left rail nav is present on this page (regression guard: it used to
    // live in a shell-less route group).
    await expect(page.getByRole('link', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /My Vratmitras/i })).toBeVisible();
  });
});
