import { test, expect } from '@playwright/test';
import { makeUser, registerAndOnboard, loginApi, loginUI, apiHeaders } from './helpers/auth';
import { deleteUserByEmail, sampleSentenceWeakness } from './helpers/db';

// Flow 2: start a journey → select a resolution (ERC) from the pool → start it → log a
// resolution check-in. Setup is driven through the real API (journey create, ERC select,
// status, check-in); the journey is then asserted to render in the UI for the VA.
test.describe('Flow 2: journey start → ERC select → check-in', () => {
  const va = makeUser('f2va');
  let journeyId: string;

  test.beforeAll(async () => {
    await registerAndOnboard(va);
  });

  test.afterAll(() => deleteUserByEmail(va.email));

  test('VA starts a journey, selects a resolution, and logs a check-in', async () => {
    const { sentenceId, weaknessId } = sampleSentenceWeakness();
    const { ctx, csrf } = await loginApi(va);

    // Start a journey from the sentence.
    const jr = await ctx.post('/api/v1/journeys', {
      headers: apiHeaders(csrf),
      data: { sentenceId, weaknessId, title: 'E2E Flow 2 Journey' },
    });
    expect(jr.ok(), `create journey: ${jr.status()} ${await jr.text()}`).toBeTruthy();
    journeyId = (await jr.json()).data.id;

    // Pool of resolutions for this journey.
    const pool = await ctx.get(`/api/v1/journeys/${journeyId}/resolutions/pool`);
    expect(pool.ok(), `pool: ${pool.status()}`).toBeTruthy();
    const poolItems = (await pool.json()).data as { id: string }[];
    expect(poolItems.length, 'resolution pool should not be empty').toBeGreaterThan(0);

    // Select a resolution into the journey.
    const sel = await ctx.post(`/api/v1/journeys/${journeyId}/resolutions`, {
      headers: apiHeaders(csrf),
      data: { poolItemId: poolItems[0].id },
    });
    expect(sel.ok(), `select resolution: ${sel.status()} ${await sel.text()}`).toBeTruthy();
    const resolutionId = (await sel.json()).data.id;

    // Start it (NOT_STARTED → IN_PROGRESS). Status DTO uses lowercase enum values.
    const start = await ctx.patch(
      `/api/v1/journeys/${journeyId}/resolutions/${resolutionId}/status`,
      {
        headers: apiHeaders(csrf),
        data: { status: 'in_progress' },
      },
    );
    expect(start.ok(), `start resolution: ${start.status()} ${await start.text()}`).toBeTruthy();

    // Log a check-in.
    const checkin = await ctx.post(
      `/api/v1/journeys/${journeyId}/resolutions/${resolutionId}/checkins`,
      {
        headers: apiHeaders(csrf),
        data: { status: 'DONE', note: 'E2E check-in' },
      },
    );
    expect(checkin.ok(), `checkin: ${checkin.status()} ${await checkin.text()}`).toBeTruthy();

    // The check-in is listed (response shape: { checkins: [...], streak }).
    const list = await ctx.get(
      `/api/v1/journeys/${journeyId}/resolutions/${resolutionId}/checkins`,
    );
    const checkins = (await list.json()).data.checkins as unknown[];
    expect(checkins.length).toBeGreaterThan(0);
    await ctx.dispose();
  });

  test('the journey renders in the UI for its owner', async ({ page }) => {
    await loginUI(page, va);
    await page.goto(`/journeys/${journeyId}`);
    await expect(page.getByText('E2E Flow 2 Journey').first()).toBeVisible({ timeout: 15_000 });
  });
});
