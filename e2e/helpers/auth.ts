import { APIRequestContext, Page, request as pwRequest, expect } from '@playwright/test';
import { latestVerificationToken } from './db';

export const API = process.env.E2E_API_URL ?? 'http://localhost:3001';
export const API_V1 = `${API}/api/v1`;

export type TestUser = { email: string; password: string; displayName: string; username: string };

// A unique, valid (lowercase/underscore) username + email for an ephemeral account.
export function makeUser(prefix: string): TestUser {
  const suffix =
    `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`.toLowerCase();
  const slug = `${prefix}_${suffix}`.replace(/[^a-z0-9_]/g, '');
  return {
    email: `${slug}@e2e.local`,
    password: 'E2ePass!2345',
    displayName: `E2E ${prefix}`,
    username: slug.slice(0, 28),
  };
}

// CSRF-aware API context: GET /csrf-token to seed the cookie, then read it back so we can
// send the x-csrf-token header on mutations (double-submit). Returns a context with the
// csrf token attached for reuse.
export async function apiContext(): Promise<{ ctx: APIRequestContext; csrf: string }> {
  const ctx = await pwRequest.newContext({ baseURL: API });
  await ctx.get('/api/v1/csrf-token');
  const state = await ctx.storageState();
  const csrf = state.cookies.find((c) => c.name === 'csrf-token')?.value ?? '';
  return { ctx, csrf };
}

function headers(csrf: string) {
  return { 'x-csrf-token': csrf, 'Content-Type': 'application/json' };
}

// Register a user through the real API, then verify their email using the token from the DB.
// Leaves them email-verified but NOT yet onboarded (use registerAndOnboard for a ready user).
export async function registerAndVerify(user: TestUser): Promise<void> {
  const { ctx, csrf } = await apiContext();
  const reg = await ctx.post('/api/v1/auth/register', {
    headers: headers(csrf),
    // Date of birth and consent are required at account creation since the 18+ gate landed.
    // Fixtures go through the real endpoint deliberately — a fixture that bypasses the gate
    // would let the suite keep passing while the gate was broken.
    data: {
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      username: user.username,
      dob: '1990-01-01',
      consents: [
        { documentKey: 'terms', version: 1 },
        { documentKey: 'privacy', version: 1 },
      ],
    },
  });
  expect(reg.ok(), `register ${user.email}: ${reg.status()}`).toBeTruthy();

  // DB stores the @map value (lowercase) for the verification_type enum.
  const token = latestVerificationToken(user.email, 'email_verification');
  expect(token, `no verification token for ${user.email}`).toBeTruthy();
  const verify = await ctx.post('/api/v1/auth/verify-email', {
    headers: headers(csrf),
    data: { token },
  });
  expect(verify.ok(), `verify ${user.email}: ${verify.status()}`).toBeTruthy();
  await ctx.dispose();
}

// Full path to an app-ready account: register → verify → login → complete-onboarding →
// complete-framework. Returns nothing; the account can then be logged into via the UI.
export async function registerAndOnboard(user: TestUser): Promise<void> {
  await registerAndVerify(user);
  const { ctx, csrf } = await apiContext();
  const login = await ctx.post('/api/v1/auth/login', {
    headers: headers(csrf),
    data: { email: user.email, password: user.password },
  });
  expect(login.ok(), `login ${user.email}: ${login.status()}`).toBeTruthy();
  // login may rotate csrf — re-read.
  const csrf2 =
    (await ctx.storageState()).cookies.find((c) => c.name === 'csrf-token')?.value ?? csrf;
  const onb = await ctx.post('/api/v1/auth/complete-onboarding', {
    headers: headers(csrf2),
    data: { displayName: user.displayName, username: user.username, language: 'EN' },
  });
  expect(onb.ok(), `complete-onboarding ${user.email}: ${onb.status()}`).toBeTruthy();
  const fw = await ctx.post('/api/v1/auth/complete-framework', { headers: headers(csrf2) });
  expect(fw.ok(), `complete-framework ${user.email}: ${fw.status()}`).toBeTruthy();
  await ctx.dispose();
}

// Log in through the UI and land on the dashboard. Resilient selectors.
export async function loginUI(
  page: Page,
  user: { email: string; password: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox').first().fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page
    .getByRole('button', { name: /log ?in|sign ?in/i })
    .first()
    .click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

// Authenticated API context for a user (for flows that drive setup via API then assert in UI).
export async function loginApi(user: {
  email: string;
  password: string;
}): Promise<{ ctx: APIRequestContext; csrf: string }> {
  const { ctx, csrf } = await apiContext();
  const login = await ctx.post('/api/v1/auth/login', {
    headers: headers(csrf),
    data: { email: user.email, password: user.password },
  });
  expect(login.ok(), `loginApi ${user.email}: ${login.status()}`).toBeTruthy();
  const csrf2 =
    (await ctx.storageState()).cookies.find((c) => c.name === 'csrf-token')?.value ?? csrf;
  return { ctx, csrf: csrf2 };
}

export { headers as apiHeaders };
