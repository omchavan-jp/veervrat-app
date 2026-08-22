import { test, expect } from '@playwright/test';
import { ADMIN } from './helpers/global-setup';
import { loginApi, apiHeaders, loginUI } from './helpers/auth';
import { sql, scalar, latestAuditEvent, journeyState } from './helpers/db';

// Flow 8: admin overrides a journey's state → the change is applied AND an audit event is
// written. The override UI uses window.prompt for the reason (awkward to automate), so the
// override is driven through the real admin API; the audit trail is asserted in the DB and
// the admin audit dashboard is asserted in the UI.
test.describe('Flow 8: admin override journey state → audit log', () => {
  let journeyId: string;
  let priorState: string;

  test.beforeAll(() => {
    // Pick any existing journey (the seeded VA has several).
    journeyId = scalar(
      `SELECT id FROM journeys WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`,
    )!;
    priorState = journeyState(journeyId)!;
  });

  test.afterAll(() => {
    // Restore the journey's original state.
    if (journeyId && priorState) {
      sql(`UPDATE journeys SET state = '${priorState}' WHERE id = '${journeyId}'`);
    }
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
