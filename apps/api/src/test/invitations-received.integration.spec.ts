import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from './helpers/app.helper';

/**
 * The half of the invitation flow nobody could see (#22, reported 2026-07-18).
 *
 * The API could only answer "what did I send". An invited person had no way to see their own
 * invitation, so the notification pointed at the sender's page — a link corrected twice and wrong
 * both times, because there was nowhere right to point.
 */
describe('Received invitations — integration', () => {
  const prisma = () => getTestPrisma();
  const CSRF = 'test-csrf-received';

  let vaSession: string;
  let inviteeSession: string;
  let strangerSession: string;
  let inviteeId: string;
  let token: string;

  const makeUser = async (username: string) => {
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
    const t = `session-token-${user.id}`;
    await prisma().session.create({
      data: { userId: user.id, token: t, expiresAt: new Date(Date.now() + 86400000) },
    });
    return { user, token: t };
  };

  const get = (path: string, session?: string) => {
    const r = getRequest().get(path);
    return session ? r.set('Cookie', `veervrat_session=${session}`) : r;
  };

  const post = (path: string, session: string) =>
    getRequest()
      .post(path)
      .set('Cookie', `veervrat_session=${session}; csrf-token=${CSRF}`)
      .set('X-CSRF-Token', CSRF);

  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();

    const va = await makeUser('recv_va');
    const invitee = await makeUser('recv_invitee');
    const stranger = await makeUser('recv_stranger');
    vaSession = va.token;
    inviteeSession = invitee.token;
    inviteeId = invitee.user.id;
    strangerSession = stranger.token;

    const sent = await post('/api/v1/invitations', vaSession).send({
      type: 'VM_GLOBAL',
      inviteeUsername: 'recv_invitee',
    });
    expect(sent.status, JSON.stringify(sent.body)).toBe(201);
    token = (await prisma().invitation.findUnique({ where: { id: sent.body.data.id } }))!.token;
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  // ── The ordering guard ─────────────────────────────────────────────────────
  // `GET /invitations/received` and `GET /invitations/:token` are both
  // `GET /invitations/<something>`, in two different controllers. Nest matches in registration
  // order, so listing the public controller first makes "received" parse as a token — a 404 on a
  // URL that looks entirely correct, with nothing in the logs to explain it. Reordering an array
  // is the most innocent-looking edit there is, so this is a test and not a comment.
  it('/invitations/received is its own route, not matched as a token', async () => {
    const res = await get('/api/v1/invitations/received', inviteeSession);

    expect(res.status, 'if this is 404, :token was registered before received').not.toBe(404);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('lists an invitation addressed to you, and says who sent it', async () => {
    const res = await get('/api/v1/invitations/received', inviteeSession);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].inviter).toMatchObject({
      username: 'recv_va',
      displayName: 'RECV_VA',
    });
    expect(res.body.data[0].type).toBe('VM_GLOBAL');
  });

  it('NEGATIVE: does not list invitations addressed to someone else', async () => {
    const res = await get('/api/v1/invitations/received', strangerSession);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('the sent list still means "what I sent" — no existing caller changed', async () => {
    const mine = await get('/api/v1/invitations', vaSession);
    expect(mine.body.data).toHaveLength(1);

    const theirs = await get('/api/v1/invitations', inviteeSession);
    expect(theirs.body.data, 'the invitee sent nothing').toEqual([]);
  });

  // ── The public token route ─────────────────────────────────────────────────
  it('reads an invitation by token WITHOUT a session — the invitee may have no account', async () => {
    const res = await get(`/api/v1/invitations/${token}`);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.inviter).toMatchObject({ username: 'recv_va' });
    expect(res.body.data.expiresAt).toBeTruthy();
  });

  it('says NOTHING about the invitee — it is readable by anyone holding the token', async () => {
    const res = await get(`/api/v1/invitations/${token}`);
    const serialised = JSON.stringify(res.body);

    for (const leak of ['inviteeEmail', 'inviteeId', 'recv_invitee@test.com', inviteeId]) {
      expect(serialised, `leaked ${leak}`).not.toContain(leak);
    }
  });

  // The endpoint is public, so it is enumerable. If a real-but-expired token answered differently
  // from a guess, the difference would confirm which strings are real invitations.
  it('a guessed token is indistinguishable from an expired one', async () => {
    const expired = await post('/api/v1/invitations', strangerSession).send({
      type: 'VM_GLOBAL',
      inviteeEmail: 'someone-else@test.com',
    });
    const expiredToken = (await prisma().invitation.findUnique({
      where: { id: expired.body.data.id },
    }))!.token;
    await prisma().invitation.update({
      where: { token: expiredToken },
      data: { status: 'EXPIRED' },
    });

    const guessed = await get('/api/v1/invitations/definitely-not-a-real-token');
    const real = await get(`/api/v1/invitations/${expiredToken}`);

    expect(guessed.status).toBe(404);
    // An expired invitation IS readable — the page needs `status` to say so before offering
    // buttons. What must not differ is a guess versus a token that never existed.
    const alsoGuessed = await get('/api/v1/invitations/0000000000000000000000000000000000000000');
    expect(alsoGuessed.status).toBe(guessed.status);
    expect(real.status).toBe(200);
    expect(real.body.data.status).toBe('EXPIRED');
  });
});
