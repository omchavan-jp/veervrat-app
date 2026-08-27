import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VmRelationshipState } from '@prisma/client';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from './helpers/app.helper';

/**
 * The roster a vratmitra sees (#193). These run against real Prisma because the questions that
 * matter here are query questions — which scopes are counted, which states are excluded — and a
 * mocked repository answers all of them "yes" regardless of what the query actually says.
 */
describe('GET /vm-relationships/my-vratarthis — integration', () => {
  let globalVmToken: string;
  let journeyVmToken: string;
  let lonelyVmToken: string;
  let vaAToken: string;

  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();
    const prisma = getTestPrisma();

    const makeUser = async (username: string, roles: ('VRATARTHI' | 'VRATMITRA')[]) => {
      const user = await prisma.user.create({
        data: {
          dob: new Date('1990-01-01'),
          email: `${username}@test.com`,
          displayName: username.toUpperCase(),
          username,
          emailVerifiedAt: new Date(),
          roles: { create: roles.map((role) => ({ role })) },
        },
      });
      const token = `session-token-${user.id}`;
      await prisma.session.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 86400000) },
      });
      return { user, token };
    };

    const globalVm = await makeUser('global_vm', ['VRATMITRA']);
    const journeyVm = await makeUser('journey_vm', ['VRATMITRA']);
    const lonelyVm = await makeUser('lonely_vm', ['VRATMITRA']);
    const vaA = await makeUser('va_a', ['VRATARTHI']);
    const vaB = await makeUser('va_b', ['VRATARTHI']);
    const vaEnded = await makeUser('va_ended', ['VRATARTHI']);

    globalVmToken = globalVm.token;
    journeyVmToken = journeyVm.token;
    lonelyVmToken = lonelyVm.token;
    vaAToken = vaA.token;

    // Active global relationship, plus one that has ended — the ended one must not appear.
    await prisma.vmRelationship.create({
      data: {
        vmId: globalVm.user.id,
        vratarthiId: vaA.user.id,
        state: 'ACTIVE',
        acceptedAt: new Date('2026-08-01'),
      },
    });
    await prisma.vmRelationship.create({
      data: {
        vmId: globalVm.user.id,
        vratarthiId: vaEnded.user.id,
        state: VmRelationshipState.ENDED,
        acceptedAt: new Date('2026-01-01'),
        endedAt: new Date('2026-06-01'),
      },
    });

    const virtue = await prisma.virtue.create({ data: { nameEn: 'Courage' } });
    const subvirtue = await prisma.subvirtue.create({
      data: { virtueId: virtue.id, nameEn: 'Steadfastness' },
    });
    const sentence = await prisma.sentence.create({
      data: { subvirtueId: subvirtue.id, textEn: 'Hold the line.' },
    });
    const journey = await prisma.journey.create({
      data: { vratarthiId: vaB.user.id, sentenceId: sentence.id, title: 'B journey' },
    });
    await prisma.journeyVmAssignment.create({
      data: {
        journeyId: journey.id,
        vmId: journeyVm.user.id,
        state: 'ACTIVE',
        acceptedAt: new Date('2026-08-10'),
      },
    });
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  const get = (token: string) =>
    getRequest()
      .get('/api/v1/vm-relationships/my-vratarthis')
      .set('Cookie', `veervrat_session=${token}`);

  it('NEGATIVE: requires authentication', async () => {
    const res = await getRequest().get('/api/v1/vm-relationships/my-vratarthis');
    expect(res.status).toBe(401);
  });

  it('lists the vratarthi of an active global relationship', async () => {
    const res = await get(globalVmToken);
    expect(res.status).toBe(200);
    expect(res.body.data.map((v: { username: string }) => v.username)).toEqual(['va_a']);
    expect(res.body.data[0].scope).toBe('GLOBAL');
  });

  it('excludes a relationship that has ended', async () => {
    const res = await get(globalVmToken);
    expect(res.body.data.map((v: { username: string }) => v.username)).not.toContain('va_ended');
  });

  // The gate that makes this page reachable counts journey assignments too. If the roster query
  // only looked at global relationships, this vratmitra would see the nav item and an empty page.
  it('lists a journey-scoped vratarthi, not only global ones', async () => {
    const res = await get(journeyVmToken);
    expect(res.status).toBe(200);
    expect(res.body.data.map((v: { username: string }) => v.username)).toEqual(['va_b']);
    expect(res.body.data[0].scope).toBe('JOURNEY');
    expect(res.body.data[0].assignedJourneys).toHaveLength(1);
  });

  it('returns an empty list — not an error — for someone who mentors nobody', async () => {
    const res = await get(lonelyVmToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('does not show a vratarthi themselves on it; the roster is keyed on being the vratmitra', async () => {
    const res = await get(vaAToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('discloses identity and counts only, never journey content', async () => {
    const res = await get(globalVmToken);
    const entry = res.body.data[0];
    expect(Object.keys(entry).sort()).toEqual(
      [
        'assignedJourneys',
        'avatarUrl',
        'displayName',
        'id',
        'joinedAt',
        'journeyCount',
        'relationshipId',
        'scope',
        'since',
        'username',
      ].sort(),
    );
  });
});
