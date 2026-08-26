import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from './helpers/app.helper';

/**
 * Ending a vratmitra relationship must end the access it granted.
 *
 * `VmRelationshipState` has only PENDING and ACTIVE — there is no ENDED. A relationship ends by
 * having `endedAt` set **while its state stays ACTIVE**. So any query that filters on
 * `state: ACTIVE` and forgets `endedAt: null` treats an ended relationship as a live one, and
 * `isGlobalVmForJourney` / `isActiveJourneyVm` both decide on `state` alone.
 *
 * That combination meant removing your vratmitra did not take away what they could see. These
 * tests exist so it cannot come back: the whole point of removing a vratmitra is that they stop
 * reading your material.
 */
describe('Access after a vratmitra relationship ends — integration', () => {
  const prisma = () => getTestPrisma();
  let vaId: string;
  let journeyId: string;
  let globalVmSession: string;
  let journeyVmSession: string;
  let globalRelId: string;
  let journeyAssignmentId: string;

  const makeUser = async (username: string, roles: ('VRATARTHI' | 'VRATMITRA')[]) => {
    const user = await prisma().user.create({
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
    await prisma().session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 86400000) },
    });
    return { user, token };
  };

  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();

    const va = await makeUser('rev_va', ['VRATARTHI']);
    const globalVm = await makeUser('rev_global_vm', ['VRATMITRA']);
    const journeyVm = await makeUser('rev_journey_vm', ['VRATMITRA']);
    vaId = va.user.id;
    globalVmSession = globalVm.token;
    journeyVmSession = journeyVm.token;

    const virtue = await prisma().virtue.create({ data: { nameEn: 'Courage' } });
    const subvirtue = await prisma().subvirtue.create({
      data: { virtueId: virtue.id, nameEn: 'Steadfastness' },
    });
    const sentence = await prisma().sentence.create({
      data: { subvirtueId: subvirtue.id, textEn: 'Hold the line.' },
    });
    const journey = await prisma().journey.create({
      data: { vratarthiId: vaId, sentenceId: sentence.id, title: 'Private journey' },
    });
    journeyId = journey.id;

    const rel = await prisma().vmRelationship.create({
      data: { vmId: globalVm.user.id, vratarthiId: vaId, state: 'ACTIVE', acceptedAt: new Date() },
    });
    globalRelId = rel.id;

    const assignment = await prisma().journeyVmAssignment.create({
      data: {
        journeyId,
        vmId: journeyVm.user.id,
        state: 'ACTIVE',
        acceptedAt: new Date(),
      },
    });
    journeyAssignmentId = assignment.id;
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  const viewJourney = (session: string) =>
    getRequest().get(`/api/v1/journeys/${journeyId}`).set('Cookie', `veervrat_session=${session}`);

  it('a current global vratmitra can read the journey', async () => {
    const res = await viewJourney(globalVmSession);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });

  it('a current journey vratmitra can read the journey', async () => {
    const res = await viewJourney(journeyVmSession);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });

  it('a global vratmitra who has been removed CANNOT read the journey', async () => {
    // Exactly what endGlobalVm does: set endedAt, leave state ACTIVE.
    await prisma().vmRelationship.update({
      where: { id: globalRelId },
      data: { endedAt: new Date() },
    });

    const res = await viewJourney(globalVmSession);
    expect(res.status, `an ex-vratmitra read the journey: ${JSON.stringify(res.body)}`).not.toBe(
      200,
    );
  });

  it('a journey vratmitra whose assignment ended CANNOT read the journey', async () => {
    // Exactly what endJourneyAssignment does.
    await prisma().journeyVmAssignment.update({
      where: { id: journeyAssignmentId },
      data: { endedAt: new Date() },
    });

    const res = await viewJourney(journeyVmSession);
    expect(res.status, `an ex-vratmitra read the journey: ${JSON.stringify(res.body)}`).not.toBe(
      200,
    );
  });
});
