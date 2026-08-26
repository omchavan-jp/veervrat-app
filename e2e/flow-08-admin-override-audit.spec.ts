import { test, expect } from '@playwright/test';
import { ADMIN } from './helpers/global-setup';
import { loginApi, apiHeaders, loginUI, makeUser, registerAndOnboard } from './helpers/auth';
import {
  latestAuditEvent,
  journeyState,
  sampleSentenceWeakness,
  deleteUserByEmail,
} from './helpers/db';

// Flow 8: admin overrides a journey's state → the change is applied AND an audit event is
// written. The override UI uses window.prompt for the reason (awkward to automate), so the
// override is driven through the real admin API; the audit trail is asserted in the DB and
// the admin audit dashboard is asserted in the UI.
test.describe('Flow 8: admin override journey state → audit log', () => {
  const va = makeUser('f8va');
  let journeyId: string;
  let priorState: string;

  // This used to pick "any existing journey (the seeded VA has several)" out of the database.
  // That is true of a long-lived dev database and false of a freshly seeded one: the content
  // seed creates virtues and sentences, not journeys. In CI the query returned null, the
  // non-null assertion lied, and the flow died in a helper with
  // "Cannot read properties of null (reading 'replace')" — a data assumption surfacing as a
  // type error three calls away. The flow now creates the journey it overrides.
  test.beforeAll(async () => {
    await registerAndOnboard(va);
    const { sentenceId, weaknessId } = sampleSentenceWeakness();
    const { ctx, csrf } = await loginApi(va);
    const jr = await ctx.post('/api/v1/journeys', {
      headers: apiHeaders(csrf),
      data: { sentenceId, weaknessId, title: 'E2E Flow 8 Journey' },
    });
    journeyId = (await jr.json()).data.id;
    await ctx.dispose();
    priorState = journeyState(journeyId)!;
  });

  test.afterAll(() => {
    deleteUserByEmail(va.email);
  });

  test('admin overrides journey state via API and an audit event is recorded', async () => {
    expect(journeyId, 'a journey must exist to override').toBeTruthy();
    const target = priorState === 'paused' ? 'ACTIVE' : 'PAUSED';

    const { ctx, csrf } = await loginApi(ADMIN);
    const res = await ctx.patch(`/api/v1/admin/journeys/${journeyId}/state`, {
      headers: apiHeaders(csrf),
      data: { state: target, reason: 'E2E override audit check' },
    });
    expect(res.ok(), `override: ${res.status()}`).toBeTruthy();
    await ctx.dispose();

    // State applied.
    expect(journeyState(journeyId)?.toLowerCase()).toBe(target.toLowerCase());

    // Audit event written with the journey as resource + reason in metadata.
    const audit = latestAuditEvent('admin.override_journey_state');
    expect(audit, 'override audit event must exist').toBeTruthy();
    expect(audit!.resourceId).toBe(journeyId);
    expect(audit!.metadata ?? '').toContain('E2E override audit check');
  });

  test('admin can view the audit dashboard and see override actions', async ({ page }) => {
    await loginUI(page, ADMIN);
    await page.goto('/admin/audit');
    // The override action appears in the audit list.
    await expect(page.getByText(/override_journey_state|override journey/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
