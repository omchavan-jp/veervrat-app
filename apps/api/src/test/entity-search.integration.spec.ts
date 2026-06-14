import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from './helpers/app.helper';

describe('Entity search — integration', () => {
  let token: string;

  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();
    const prisma = getTestPrisma();

    const user = await prisma.user.create({
      data: {
        email: 'searcher@test.com',
        displayName: 'Searcher',
        username: 'searcher',
        emailVerifiedAt: new Date(),
        roles: { create: { role: 'VRATARTHI' } },
      },
    });
    token = 'session-token-' + user.id;
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 86400000) },
    });

    await prisma.weakness.create({
      data: { nameEn: 'Over laziness', nameMr: 'आळस', category: 'discipline' },
    });
    await prisma.weakness.create({
      data: { nameEn: 'Indecisiveness', nameMr: null, category: 'discipline' },
    });
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  it('NEGATIVE: requires authentication', async () => {
    const res = await getRequest().get('/api/v1/entity-search?q=lazi');
    expect(res.status).toBe(401);
  });

  it('finds an entity by substring match', async () => {
    const res = await getRequest()
      .get('/api/v1/entity-search?q=lazi&scope=concept')
      .set('Cookie', `veervrat_session=${token}`);
    expect(res.status).toBe(200);
    const labels = res.body.data.map((h: { entityId: string; label: string }) => h.label);
    expect(labels).toContain('आळस'); // Devanagari-preferred label
    expect(res.body.data[0].entityType).toBe('weakness');
  });

  it('is typo-tolerant via trigram similarity', async () => {
    const res = await getRequest()
      .get('/api/v1/entity-search?q=lazyness&scope=concept')
      .set('Cookie', `veervrat_session=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((h: { label: string }) => h.label === 'आळस')).toBe(true);
  });

  it('returns empty for a query shorter than 2 chars', async () => {
    const res = await getRequest()
      .get('/api/v1/entity-search?q=l&scope=concept')
      .set('Cookie', `veervrat_session=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
