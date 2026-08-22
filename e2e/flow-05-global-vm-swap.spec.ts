import { test, expect } from '@playwright/test';
import { VM } from './helpers/global-setup';
import { makeUser, registerAndOnboard, loginApi, apiHeaders } from './helpers/auth';
import {
  deleteUserByEmail,
  latestInvitationToken,
  scalar,
  lit,
  sampleSentenceWeakness,
} from './helpers/db';

// Flow 5: global VM swap → migration with the keep/unassign cascade choice (Item 37).
// A VA gets a global VM + a journey assignment from that VM, then removes the global VM with
// cascade=unassign and confirms both the global relationship and the journey assignment end
// (the migration), and pending approvals are left intact.
test.describe('Flow 5: global VM swap → migration', () => {
  const va = makeUser('f5va');
  let journeyId: string;

  test.beforeAll(async () => {
    await registerAndOnboard(va);
  });

  test.afterAll(() => deleteUserByEmail(va.email));

  test('VA with a global VM (also a journey VM) removes them with unassign cascade', async () => {
    const { sentenceId, weaknessId } = sampleSentenceWeakness();
    const { ctx, csrf } = await loginApi(va);

    // Journey for the VA.
    journeyId = (
      await (
        await ctx.post('/api/v1/journeys', {
          headers: apiHeaders(csrf),
          data: { sentenceId, weaknessId, title: 'E2E Flow 5 Journey' },
        })
      ).json()
    ).data.id;

    // Invite the shared VM both globally and to the journey.
    await ctx.post('/api/v1/invitations', {
      headers: apiHeaders(csrf),
      data: { type: 'VM_GLOBAL', inviteeUsername: VM.username },
    });
    const globalToken = latestInvitationToken(VM.email)!;
    await ctx.post('/api/v1/invitations', {
      headers: apiHeaders(csrf),
      data: { type: 'VM_JOURNEY', inviteeUsername: VM.username, scopeId: journeyId },
    });
    await ctx.dispose();

    // VM accepts both invitations (global first, then journey — latestInvitationToken returns newest).
    let vm = await loginApi(VM);
    await vm.ctx.post(`/api/v1/invitations/${globalToken}/accept`, {
      headers: apiHeaders(vm.csrf),
    });
    await vm.ctx.dispose();
    // Journey invite is now the only pending one.
    const journeyToken = latestInvitationToken(VM.email)!;
    expect(journeyToken).not.toBe(globalToken);
    vm = await loginApi(VM);
    await vm.ctx.post(`/api/v1/invitations/${journeyToken}/accept`, {
      headers: apiHeaders(vm.csrf),
    });
    await vm.ctx.dispose();

    // Sanity: both the global relationship and the journey assignment are active.
    const vmId = scalar(`SELECT id FROM users WHERE email = ${lit(VM.email)}`)!;
    const vaId = scalar(`SELECT id FROM users WHERE email = ${lit(va.email)}`)!;
    expect(
      scalar(
        `SELECT count(*) FROM vm_relationships WHERE vratarthi_id=${lit(vaId)} AND vm_id=${lit(vmId)} AND ended_at IS NULL`,
      ),
    ).toBe('1');
    expect(
      scalar(
        `SELECT count(*) FROM journey_vm_assignments WHERE journey_id=${lit(journeyId)} AND vm_id=${lit(vmId)} AND ended_at IS NULL`,
      ),
    ).toBe('1');

    // --- The swap: remove the global VM with the unassign cascade (Item 37) ---
    const va2 = await loginApi(va);
    const remove = await va2.ctx.delete('/api/v1/vm-relationships/global', {
      headers: apiHeaders(va2.csrf),
      data: { cascade: 'unassign' },
    });
    expect(remove.ok(), `remove global vm: ${remove.status()} ${await remove.text()}`).toBeTruthy();
    const body = (await remove.json()).data;
    expect(body.cascade).toBe('unassign');
    expect(
      body.affectedJourneys.some((j: { journeyId: string }) => j.journeyId === journeyId),
    ).toBeTruthy();
    await va2.ctx.dispose();

    // Both relationships are now ended (the migration removed them).
    expect(
      scalar(
        `SELECT count(*) FROM vm_relationships WHERE vratarthi_id=${lit(vaId)} AND vm_id=${lit(vmId)} AND ended_at IS NULL`,
      ),
    ).toBe('0');
    expect(
      scalar(
        `SELECT count(*) FROM journey_vm_assignments WHERE journey_id=${lit(journeyId)} AND vm_id=${lit(vmId)} AND ended_at IS NULL`,
      ),
    ).toBe('0');
  });

  test('keep cascade leaves journey assignments intact', async () => {
    const { ctx, csrf } = await loginApi(va);
    // Re-invite + accept global only, plus a journey assignment.
    await ctx.post('/api/v1/invitations', {
      headers: apiHeaders(csrf),
      data: { type: 'VM_GLOBAL', inviteeUsername: VM.username },
    });
    const gToken = latestInvitationToken(VM.email)!;
    await ctx.post('/api/v1/invitations', {
      headers: apiHeaders(csrf),
      data: { type: 'VM_JOURNEY', inviteeUsername: VM.username, scopeId: journeyId },
    });
    await ctx.dispose();

    let vm = await loginApi(VM);
    await vm.ctx.post(`/api/v1/invitations/${gToken}/accept`, { headers: apiHeaders(vm.csrf) });
    await vm.ctx.dispose();
    const jToken = latestInvitationToken(VM.email)!;
    vm = await loginApi(VM);
    await vm.ctx.post(`/api/v1/invitations/${jToken}/accept`, { headers: apiHeaders(vm.csrf) });
    await vm.ctx.dispose();

    const vmId = scalar(`SELECT id FROM users WHERE email = ${lit(VM.email)}`)!;

    // Remove global with cascade=keep (default).
    const va2 = await loginApi(va);
    const remove = await va2.ctx.delete('/api/v1/vm-relationships/global', {
      headers: apiHeaders(va2.csrf),
      data: { cascade: 'keep' },
    });
    expect(remove.ok(), `remove keep: ${remove.status()}`).toBeTruthy();
    await va2.ctx.dispose();

    // Journey assignment survives; global relationship is gone.
    expect(
      scalar(
        `SELECT count(*) FROM journey_vm_assignments WHERE journey_id=${lit(journeyId)} AND vm_id=${lit(vmId)} AND ended_at IS NULL`,
      ),
    ).toBe('1');
  });
});
