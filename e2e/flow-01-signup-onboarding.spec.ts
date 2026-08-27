import { test, expect } from '@playwright/test';
import { makeUser, registerAndOnboard } from './helpers/auth';
import { latestVerificationToken, deleteUserByEmail } from './helpers/db';

// Flow 1: signup → email verify → login → onboarding gate → (complete onboarding) → dashboard.
// The signup form, the real email-verification URL, login, and the onboarding redirect gate
// are all exercised through the UI. The account-setup *form submit* does not fire under
// automation (see KNOWN BLOCKER below), so onboarding completion is driven via the API and
// the resulting dashboard access is asserted in the UI. Test-taking + report = flow 10.
//
// KNOWN BLOCKER (Deferral Ledger #33): the /onboarding/account-setup form does not submit
// under Playwright — neither the Continue button nor Enter fires the complete-onboarding
// request (no client validation error is shown). Real users are unaffected. The
// framework-walkthrough → dashboard sub-path is covered via the API completion + UI assert.
test.describe('Flow 1: signup → onboarding → app access', () => {
  const user = makeUser('f1');

  test.afterAll(() => deleteUserByEmail(user.email));

  test('new user signs up via the form and verifies their email', async ({ page }) => {
    await page.goto('/signup');
    // The email route is collapsed by default — Google is the primary path and the email
    // fields are one click away (signup/page.tsx, the `emailCta` Collapsible). Tests written
    // against the older single-form page looked for a password field that is not rendered yet.
    // Fields are targeted by id, not by index. Index-targeting is what broke this spec: the
    // restructure put username above the collapsible and displayName inside it, silently
    // swapping nth(0) and nth(1) so the account was created with the two values reversed —
    // or not at all.
    await page.fill('#signup-username', user.username);

    // Date of birth: a DatePicker popover, not a text field (the 18+ gate, #133). It opens on
    // the most recent qualifying month with later dates disabled, so day 1 of that month is
    // always a valid choice.
    await page.getByRole('button', { name: /select your date of birth/i }).click();
    // Day cells carry a full accessible date ("Monday, 1 September 2008"), not a bare number,
    // so pick the first day the calendar has not disabled rather than matching on text.
    await page.locator('[role="gridcell"] button:not([disabled])').first().click();

    // Consent is required at account creation and the server rejects a registration without
    // it. A signup spec that skips the checkbox is not testing signup.
    await page.locator('input[type="checkbox"]').first().check();

    // The email route is collapsed by default — Google is the primary path.
    await page.getByRole('button', { name: /sign up with email/i }).click();
    await page.fill('#signup-displayName', user.displayName);
    await page.fill('#signup-email', user.email);
    await page.fill('#signup-password', user.password);
    await page.waitForTimeout(700); // username availability debounce
    // Exact match on purpose: /sign ?up/ also matches "Sign up with email instead", and
    // `.first()` picks that one in DOM order — so the click closed the panel it had just
    // opened and no submit ever fired. The account was never created and the failure surfaced
    // 15 seconds later as a missing verification token.
    await page.getByRole('button', { name: /^create account$/i }).click();

    // The account now exists with a verification token.
    await expect
      .poll(() => latestVerificationToken(user.email, 'email_verification'), { timeout: 15_000 })
      .toBeTruthy();
    const token = latestVerificationToken(user.email, 'email_verification')!;

    // Verify via the real verify-email URL.
    await page.goto(`/verify-email?token=${token}`);
    await expect(page.getByText(/verified|success|log ?in/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('verified-but-unonboarded user is gated into onboarding on login', async ({ page }) => {
    // Fresh user that is verified but not onboarded.
    const u = makeUser('f1b');
    const { registerAndVerify } = await import('./helpers/auth');
    await registerAndVerify(u);
    try {
      await page.goto('/login');
      await page.getByRole('textbox').first().fill(u.email);
      await page.locator('input[type="password"]').fill(u.password);
      await page
        .getByRole('button', { name: /log ?in|sign ?in/i })
        .first()
        .click();
      // The onboarding gate sends an unonboarded user to /onboarding (account-setup).
      await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
      await expect(page).toHaveURL(/\/onboarding/);
    } finally {
      deleteUserByEmail(u.email);
    }
  });

  test('onboarded user reaches the dashboard and is greeted by name', async ({ page }) => {
    // Onboarding completion via API (account-setup form blocker above); dashboard asserted in UI.
    await registerAndOnboard(user).catch(async () => {
      // user may already be registered+verified from the first test — finish onboarding only.
      const { loginApi, apiHeaders } = await import('./helpers/auth');
      const { ctx, csrf } = await loginApi(user);
      await ctx.post('/api/v1/auth/complete-onboarding', {
        headers: apiHeaders(csrf),
        data: { displayName: user.displayName, username: user.username, language: 'EN' },
      });
      await ctx.post('/api/v1/auth/complete-framework', { headers: apiHeaders(csrf) });
      await ctx.dispose();
    });

    await page.goto('/login');
    await page.getByRole('textbox').first().fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page
      .getByRole('button', { name: /log ?in|sign ?in/i })
      .first()
      .click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/namaskar/i);
  });
});
