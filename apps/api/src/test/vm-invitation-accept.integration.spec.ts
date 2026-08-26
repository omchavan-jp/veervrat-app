import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from './helpers/app.helper';

/**
 * Becoming a vratmitra, exactly the way a real person must.
 *
 * Every other test in this repo — unit, integration, and the Playwright e2e suite — hands out
 * `Role.VRATMITRA` in a fixture (`e2e/helpers/global-setup.ts` inserts it with raw SQL). Nothing
 * exercised the path an invited person actually walks: sign up, receive an invitation, accept it.
 *
 * That path was deadlocked. `vm_invitation.accept` required `isVm(user)` — you had to already be
 * a vratmitra to accept an invitation to become one — and no production code granted the role
 * except an admin editing the user by hand. So the invite flow sent emails, rendered an accept
 * page, and could not succeed for anyone. Found on UAT on 2026-08-27 by a person clicking Accept.
 *
 * These tests hold that path open. Nothing here may grant a role directly.
 */
describe('Accepting a vratmitra invitation — integration', () => {
  const prisma = () => getTestPrisma();
  let vaToken: string;
  let inviteeToken: string;
  let inviteeId: string;
  let strangerToken: string;

  // Deliberately mirrors what signup produces: VRATARTHI and nothing else.
  const makeSignedUpUser = async (username: string) => {
    const user = await prisma().user.create({
      data: {
        dob: new Date('1990-01-01'),
        email: `${username}@test.com`,
        displayName: username.toUpperCase(),
        username,
        emailVerifiedAt: new Date(),
        roles: { create: { role: 'VRATARTHI' } },
      },
    });
    const token = `session-token-${user.id}`;
    await prisma().session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 86400000) },
    });
    return { user, token };
  };

  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();

    const va = await makeSignedUpUser('accept_va');
    const invitee = await makeSignedUpUser('accept_invitee');
    const stranger = await makeSignedUpUser('accept_stranger');

    vaToken = va.token;
    inviteeToken = invitee.token;
    inviteeId = invitee.user.id;
    strangerToken = stranger.token;
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  // Double-submit CSRF: the same value in the cookie and the header.
  const CSRF = 'test-csrf-vm-invite';
  const post = (path: string, session: string) =>
    getRequest()
      .post(path)
      .set('Cookie', `veervrat_session=${session}; csrf-token=${CSRF}`)
      .set('X-CSRF-Token', CSRF);

  // A vratarthi may hold only one pending global invite, so each test invites from a fresh one
  // rather than tripping over the previous test's.
  let vaSeq = 0;
  const sendInvite = async () => {
    const inviter = vaSeq === 0 ? { token: vaToken } : await makeSignedUpUser(`accept_va${vaSeq}`);
    vaSeq += 1;
    const res = await post('/api/v1/invitations', inviter.token).send({
      type: 'VM_GLOBAL',
      inviteeUsername: 'accept_invitee',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const row = await prisma().invitation.findUnique({ where: { id: res.body.data.id } });
    return row!.token;
  };

  it('a person who signed up normally can accept, and becomes a vratmitra by doing so', async () => {
    const token = await sendInvite();

    const res = await post(`/api/v1/invitations/${token}/accept`, inviteeToken);

    expect(res.status, JSON.stringify(res.body)).toBe(200);

    // The relationship formed...
    const relationship = await prisma().vmRelationship.findFirst({
      where: { vmId: inviteeId, state: 'ACTIVE', endedAt: null },
    });
    expect(relationship).not.toBeNull();

    // ...and the role followed from it. Without this the new vratmitra passes no VM permission
    // check, so their guidance queue, roster and approval powers would all be dead on arrival.
    const roles = await prisma().userRole.findMany({ where: { userId: inviteeId } });
    expect(roles.map((r) => r.role).sort()).toEqual(['VRATARTHI', 'VRATMITRA']);
  });

  it('NEGATIVE: someone who is not the invitee cannot accept, even knowing the token', async () => {
    const token = await sendInvite();

    const res = await post(`/api/v1/invitations/${token}/accept`, strangerToken);

    expect(res.status).toBe(403);
  });

  it('NEGATIVE: accepting twice is refused, and says so rather than failing opaquely', async () => {
    const token = await sendInvite();

    const first = await post(`/api/v1/invitations/${token}/accept`, inviteeToken);
    expect(first.status).toBe(200);

    const second = await post(`/api/v1/invitations/${token}/accept`, inviteeToken);
    expect(second.status).toBe(409);
    expect(String(second.body.message)).toMatch(/pending/i);
  });

  it('NEGATIVE: an expired invitation is refused', async () => {
    const token = await sendInvite();
    await prisma().invitation.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await post(`/api/v1/invitations/${token}/accept`, inviteeToken);

    // 422, not 410: InvitationExpiredException extends UnprocessableEntityException.
    expect(res.status).toBe(422);
    expect(String(res.body.error)).toBe('INVITATION_EXPIRED');
  });
});
