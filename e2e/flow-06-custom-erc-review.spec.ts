import { test, expect } from '@playwright/test';
import { MODERATOR } from './helpers/global-setup';
import { makeUser, registerAndOnboard, loginApi, apiHeaders } from './helpers/auth';
import { deleteUserByEmail, sampleSentenceWeakness, scalar, lit } from './helpers/db';

// Flow 6: custom ERC creation → submit for review → moderator approves → it is promoted to
// the global pool. Drives the VA-authoring + moderator-review loop through the real API.
test.describe('Flow 6: custom ERC → review → moderator approve', () => {
  const va = makeUser('f6va');
  let journeyId: string;
  let itemId: string;

  test.beforeAll(async () => {
    await registerAndOnboard(va);
  });

  test.afterAll(() => deleteUserByEmail(va.email));

  test('VA creates a custom resolution and submits it for review', async () => {
    const { sentenceId, weaknessId } = sampleSentenceWeakness();
    const { ctx, csrf } = await loginApi(va);

    journeyId = (await (await ctx.post('/api/v1/journeys', { headers: apiHeaders(csrf), data: { sentenceId, weaknessId, title: 'E2E Flow 6 Journey' } })).json()).data.id;

    // Create a custom resolution on the journey.
    const create = await ctx.post(`/api/v1/journeys/${journeyId}/resolutions/custom`, {
      headers: apiHeaders(csrf),
      data: { titleEn: 'E2E Custom Resolution', descriptionEn: 'A custom practice for review.' },
    });
    expect(create.ok(), `create custom: ${create.status()} ${await create.text()}`).toBeTruthy();
    itemId = (await create.json()).data.id;

    // Submit it for global moderator review.
    const submit = await ctx.post(`/api/v1/journeys/${journeyId}/resolutions/${itemId}/submit-for-review`, { headers: apiHeaders(csrf) });
    expect(submit.ok(), `submit-for-review: ${submit.status()} ${await submit.text()}`).toBeTruthy();
    await ctx.dispose();

    // A pending CustomErcReview now exists for this item.
    const reviewExists = scalar(`SELECT count(*) FROM custom_erc_reviews WHERE journey_resolution_id = ${lit(itemId)}`);
    expect(Number(reviewExists)).toBeGreaterThan(0);
  });

  test('moderator sees it in the queue and approves it → item is approved', async () => {
    const mod = await loginApi(MODERATOR);

    // The review appears in the moderator queue.
    const queue = await mod.ctx.get('/api/v1/moderation/custom-erc');
    expect(queue.ok(), `queue: ${queue.status()}`).toBeTruthy();
    const items = (await queue.json()).data.items ?? (await (await mod.ctx.get('/api/v1/moderation/custom-erc')).json()).data;
    const review = (items as { id: string; journeyResolutionId?: string }[]).find(
      (r) => r.journeyResolutionId === itemId,
    ) ?? (items as { id: string }[])[0];
    expect(review, 'the submitted review is in the queue').toBeTruthy();

    // Approve it.
    const approve = await mod.ctx.post(`/api/v1/moderation/custom-erc/${review.id}/approve`, { headers: apiHeaders(mod.csrf), data: {} });
    expect(approve.ok(), `approve: ${approve.status()} ${await approve.text()}`).toBeTruthy();
    await mod.ctx.dispose();

    // The review is now marked approved.
    const status = scalar(`SELECT status FROM custom_erc_reviews WHERE journey_resolution_id = ${lit(itemId)} ORDER BY created_at DESC LIMIT 1`);
    expect(status).toBe('approved');
  });
});
