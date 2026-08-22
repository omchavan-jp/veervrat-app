import { test, expect } from '@playwright/test';
import { makeUser, registerAndOnboard, loginApi, apiHeaders } from './helpers/auth';
import {
  deleteUserByEmail,
  sampleWeaknessWithSentences,
  sentenceIdsForWeakness,
} from './helpers/db';

// Flow 10: draft test → exit → resume from draft → complete → submit → report.
// Drives the test lifecycle through the real API: createOrResume returns the same draft on
// re-entry (resume), partial answers persist, then full answers → submit → report.
test.describe('Flow 10: draft test → resume → complete', () => {
  const va = makeUser('f10');

  test.beforeAll(async () => {
    await registerAndOnboard(va);
  });

  test.afterAll(() => deleteUserByEmail(va.email));

  test('a started test resumes from draft and completes to a report', async () => {
    const weaknessId = sampleWeaknessWithSentences();
    const sentenceIds = sentenceIdsForWeakness(weaknessId);
    expect(sentenceIds.length).toBeGreaterThanOrEqual(2);

    const { ctx, csrf } = await loginApi(va);

    // Start a draft test.
    const create = await ctx.post('/api/v1/tests', {
      headers: apiHeaders(csrf),
      data: { weaknessId },
    });
    expect(create.ok(), `create test: ${create.status()}`).toBeTruthy();
    const draft = await create.json();
    const testId = draft.data.id;
    expect(draft.data.isDraft).toBe(true);

    // Answer the first half (partial save).
    const half = Math.max(1, Math.floor(sentenceIds.length / 2));
    const firstHalf = sentenceIds.slice(0, half).map((sid) => ({ sentenceId: sid, score: 3 }));
    const save1 = await ctx.patch(`/api/v1/tests/${testId}/answers`, {
      headers: apiHeaders(csrf),
      data: { answers: firstHalf },
    });
    expect(save1.ok(), `save half: ${save1.status()}`).toBeTruthy();

    // --- "Exit" then resume: createOrResume returns the SAME draft with answers preserved ---
    const resume = await ctx.post('/api/v1/tests', {
      headers: apiHeaders(csrf),
      data: { weaknessId },
    });
    const resumed = await resume.json();
    expect(resumed.data.id, 'resume returns the same draft').toBe(testId);
    expect(resumed.data.existed).toBe(true);
    expect(resumed.data.answeredCount).toBe(half);

    // Answer the rest.
    const rest = sentenceIds.slice(half).map((sid) => ({ sentenceId: sid, score: 2 }));
    if (rest.length > 0) {
      const save2 = await ctx.patch(`/api/v1/tests/${testId}/answers`, {
        headers: apiHeaders(csrf),
        data: { answers: rest },
      });
      expect(save2.ok(), `save rest: ${save2.status()}`).toBeTruthy();
    }

    // Submit → no longer a draft.
    const submit = await ctx.post(`/api/v1/tests/${testId}/submit`, { headers: apiHeaders(csrf) });
    expect(submit.ok(), `submit: ${submit.status()} ${await submit.text()}`).toBeTruthy();
    expect((await submit.json()).data.isDraft).toBe(false);

    // Report is available with a submitted timestamp.
    const report = await ctx.get(`/api/v1/tests/${testId}/report`);
    expect(report.ok(), `report: ${report.status()}`).toBeTruthy();
    const r = (await report.json()).data;
    expect(r.submittedAt).toBeTruthy();
    expect(r.answeredCount).toBe(sentenceIds.length);
    await ctx.dispose();
  });
});
