import { test, expect } from '@playwright/test';
import { VM } from './helpers/global-setup';
import { makeUser, registerAndOnboard, loginApi, apiHeaders } from './helpers/auth';
import { deleteUserByEmail, sampleSentenceWeakness, latestInvitationToken, scalar, lit } from './helpers/db';

// Flow 3: VM invitation (journey-scoped) → VM accepts → VA selects + submits an ERC for
// closure → assigned VM approves it. Exercises the full VA↔VM approval loop end to end via
// the real API (invitation accept, ERC status transitions, scoped approval).
test.describe('Flow 3: VM invite → accept → submit → VM approves', () => {
  const va = makeUser('f3va');
  let journeyId: string;
  let resolutionId: string;

  test.beforeAll(async () => {
    await registerAndOnboard(va);
  });

  test.afterAll(() => {
    deleteUserByEmail(va.email);
  });

  test('VA starts a journey and invites a journey VM, who accepts', async () => {
    const { sentenceId, weaknessId } = sampleSentenceWeakness();
    const { ctx, csrf } = await loginApi(va);

    // Journey + a selected resolution.
    journeyId = (await (await ctx.post('/api/v1/journeys', { headers: apiHeaders(csrf), data: { sentenceId, weaknessId, title: 'E2E Flow 3 Journey' } })).json()).data.id;
    const pool = (await (await ctx.get(`/api/v1/journeys/${journeyId}/resolutions/pool`)).json()).data as { id: string }[];
    resolutionId = (await (await ctx.post(`/api/v1/journeys/${journeyId}/resolutions`, { headers: apiHeaders(csrf), data: { poolItemId: pool[0].id } })).json()).data.id;

    // Invite the shared VM to this journey (VM_JOURNEY scoped to the journey).
    const invite = await ctx.post('/api/v1/invitations', {
      headers: apiHeaders(csrf),
      data: { type: 'VM_JOURNEY', inviteeUsername: VM.username, scopeId: journeyId },
    });
    expect(invite.ok(), `invite: ${invite.status()} ${await invite.text()}`).toBeTruthy();
    await ctx.dispose();

    // VM accepts the invitation.
    const token = latestInvitationToken(VM.email);
    expect(token, 'invitation token for VM').toBeTruthy();
    const vm = await loginApi(VM);
    const accept = await vm.ctx.post(`/api/v1/invitations/${token}/accept`, { headers: apiHeaders(vm.csrf) });
    expect(accept.ok(), `accept: ${accept.status()} ${await accept.text()}`).toBeTruthy();
    await vm.ctx.dispose();

    // The journey VM assignment is now active.
    const active = scalar(
      `SELECT count(*) FROM journey_vm_assignments WHERE journey_id = ${lit(journeyId)} AND state = 'active' AND ended_at IS NULL`,
    );
    expect(active).toBe('1');
  });

  test('VA submits the ERC for closure and the assigned VM approves it', async () => {
    // VA: start the resolution then submit for closure.
    const va2 = await loginApi(va);
    await va2.ctx.patch(`/api/v1/journeys/${journeyId}/resolutions/${resolutionId}/status`, { headers: apiHeaders(va2.csrf), data: { status: 'in_progress' } });
    const submit = await va2.ctx.patch(`/api/v1/journeys/${journeyId}/resolutions/${resolutionId}/status`, { headers: apiHeaders(va2.csrf), data: { status: 'submitted' } });
    expect(submit.ok(), `submit for closure: ${submit.status()} ${await submit.text()}`).toBeTruthy();
    await va2.ctx.dispose();

    // VM: approve the submitted item (scoped approval — assigned journey VM).
    const vm = await loginApi(VM);
    const approve = await vm.ctx.post(`/api/v1/journeys/${journeyId}/resolutions/${resolutionId}/approve`, { headers: apiHeaders(vm.csrf) });
    expect(approve.ok(), `approve: ${approve.status()} ${await approve.text()}`).toBeTruthy();
    await vm.ctx.dispose();

    // The item is now approved.
    const status = scalar(`SELECT status FROM journey_resolutions WHERE id = ${lit(resolutionId)}`);
    expect(status).toBe('approved');
  });
});
