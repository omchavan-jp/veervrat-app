import { test, expect } from '@playwright/test';
import {
  makeUser,
  registerAndOnboard,
  registerAndVerify,
  loginApi,
  apiHeaders,
} from './helpers/auth';
import { deleteUserByEmail, latestInvitationToken, scalar, lit } from './helpers/db';

// Flow 4: VM invitation for a non-platform user → they sign up via the invite link → accept
// the VM role.
//
// The send + delivery half is exercised: a VA invites a brand-new email; the invitation is
// created with inviteeId = null (no account yet) and an invite token is issued.
//
// KNOWN BLOCKER (Deferral Ledger #8 / #34): the "signup links the pending invite + grants the
// VRATMITRA role + INVITEE_JOINED_PLATFORM notification" backfill is not implemented. After
// signup the new account has inviteeId still null on the invitation and no VRATMITRA role, so
// `vm_invitation.accept` (which requires `isVm(user) && invitation.inviteeId === user.id`)
// cannot succeed. The accept assertion is therefore skipped, with the gap documented, rather
// than faking a pass. The invite-send + signup sub-path is asserted.
test.describe('Flow 4: non-platform VM invite → signup → accept', () => {
  const inviter = makeUser('f4inviter');
  const newcomer = makeUser('f4newcomer');

  test.beforeAll(async () => {
    await registerAndOnboard(inviter);
  });

  test.afterAll(() => {
    deleteUserByEmail(inviter.email);
    deleteUserByEmail(newcomer.email);
  });

  test('VA invites a brand-new email and an invite token is issued', async () => {
    const { ctx, csrf } = await loginApi(inviter);
    const invite = await ctx.post('/api/v1/invitations', {
      headers: apiHeaders(csrf),
      data: { type: 'VM_GLOBAL', inviteeEmail: newcomer.email },
    });
    expect(invite.ok(), `invite by email: ${invite.status()} ${await invite.text()}`).toBeTruthy();
    await ctx.dispose();

    // The invitation exists and is pending with a usable token for the new email.
    const token = latestInvitationToken(newcomer.email);
    expect(token, 'invite token issued for the new email').toBeTruthy();
  });

  test('the invited person can sign up and verify their account', async () => {
    await registerAndVerify(newcomer);
    const exists = scalar(
      `SELECT count(*) FROM users WHERE email = ${lit(newcomer.email)} AND email_verified_at IS NOT NULL`,
    );
    expect(exists).toBe('1');
  });

  // Re-enabled 2026-08-27. Was skipped as "BLOCKED (Ledger #8): accepting the VM role after
  // signup requires invite→account linking + VRATMITRA role grant that is not yet implemented."
  //
  // That note was correct, and it was the only place the defect was written down. Nothing
  // tracked it into an issue or a beta blocker, so for months the product shipped an invitation
  // flow that returned 403 to every real user while this — the one test that would have caught
  // it — sat skipped. A skipped test is not a record; it is a defect nobody is looking at.
  //
  // Accepting now grants the role (#214), so the path works and this runs.
  test('the new user accepts the VM role via the invite link', async () => {
    const token = latestInvitationToken(newcomer.email)!;
    const nc = await loginApi(newcomer);
    const accept = await nc.ctx.post(`/api/v1/invitations/${token}/accept`, {
      headers: apiHeaders(nc.csrf),
    });
    expect(accept.ok()).toBeTruthy();
    await nc.ctx.dispose();
  });
});
