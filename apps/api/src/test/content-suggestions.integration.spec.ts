import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from './helpers/app.helper';

/**
 * The capability is enforced by the API, not by the widget.
 *
 * Both existing capability-gated features in this product shipped with the check in the browser
 * alone: the feedback widget's environment flag reached the web tier while the API admitted any
 * authenticated user, and the content editor's flag was set in no infrastructure at all, leaving
 * the capability inert. A control that only hides a button is not a control.
 *
 * These tests call the API directly, the way anyone with a session and curl can.
 */
describe('Content suggestions — integration', () => {
  const prisma = () => getTestPrisma();
  const CSRF = 'test-csrf-suggestions';

  let authorSession: string;
  let strangerSession: string;
  let adminSession: string;
  let authorId: string;

  const makeUser = async (
    username: string,
    opts: { admin?: boolean; capability?: boolean } = {},
  ) => {
    const user = await prisma().user.create({
      data: {
        dob: new Date('1990-01-01'),
        email: `${username}@test.com`,
        displayName: username.toUpperCase(),
        username,
        emailVerifiedAt: new Date(),
        roles: {
          create: [{ role: 'VRATARTHI' }, ...(opts.admin ? [{ role: 'ADMIN' as const }] : [])],
        },
      },
    });
    if (opts.capability) {
      await prisma().userCapability.create({
        data: { userId: user.id, capability: 'CONTENT_SUGGEST' },
      });
    }
    const token = `session-token-${user.id}`;
    await prisma().session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 86400000) },
    });
    return { user, token };
  };

  const post = (path: string, session: string) =>
    getRequest()
      .post(path)
      .set('Cookie', `veervrat_session=${session}; csrf-token=${CSRF}`)
      .set('X-CSRF-Token', CSRF);

  const patch = (path: string, session: string) =>
    getRequest()
      .patch(path)
      .set('Cookie', `veervrat_session=${session}; csrf-token=${CSRF}`)
      .set('X-CSRF-Token', CSRF);

  const get = (path: string, session: string) =>
    getRequest().get(path).set('Cookie', `veervrat_session=${session}`);

  const body = (over: Record<string, unknown> = {}) => ({
    kind: 'ADD_SECTION',
    route: '/weaknesses/[id]',
    url: 'https://uat.example/weaknesses/abc',
    entityType: 'weakness',
    entityId: 'abc',
    locale: 'EN',
    anchorText: 'Over laziness',
    titleEn: 'This weakness needs a description',
    ...over,
  });

  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();
    const author = await makeUser('sugg_author', { capability: true });
    const stranger = await makeUser('sugg_stranger');
    const admin = await makeUser('sugg_admin', { admin: true });
    authorSession = author.token;
    authorId = author.user.id;
    strangerSession = stranger.token;
    adminSession = admin.token;
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  it('a granted author can place a suggestion, and the location is stored as sent', async () => {
    const res = await post('/api/v1/content-suggestions', authorSession).send(body());

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const row = await prisma().contentSuggestion.findUnique({ where: { id: res.body.data.id } });
    expect(row).toMatchObject({
      route: '/weaknesses/[id]',
      entityType: 'weakness',
      entityId: 'abc',
      anchorText: 'Over laziness',
      status: 'NEW',
      authorId,
    });
  });

  it('NEGATIVE: an authenticated caller WITHOUT the capability is refused by the API', async () => {
    const res = await post('/api/v1/content-suggestions', strangerSession).send(body());

    expect(res.status, 'the API must refuse, not merely hide the button').toBe(403);
  });

  it('NEGATIVE: revoking the capability closes authoring, and leaves existing work alone', async () => {
    const before = await prisma().contentSuggestion.count({ where: { authorId } });
    expect(before).toBeGreaterThan(0);

    await prisma().userCapability.deleteMany({
      where: { userId: authorId, capability: 'CONTENT_SUGGEST' },
    });

    const res = await post('/api/v1/content-suggestions', authorSession).send(body());
    expect(res.status).toBe(403);

    // What they already wrote is theirs and survives.
    expect(await prisma().contentSuggestion.count({ where: { authorId } })).toBe(before);

    await prisma().userCapability.create({
      data: { userId: authorId, capability: 'CONTENT_SUGGEST' },
    });
  });

  it('a page with no dynamic entity still yields a valid suggestion', async () => {
    const res = await post('/api/v1/content-suggestions', authorSession).send(
      body({
        route: '/pothi',
        url: 'https://uat.example/pothi',
        entityType: undefined,
        entityId: undefined,
      }),
    );

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.entityType).toBeNull();
    expect(res.body.data.entityId).toBeNull();
  });

  it('an author sees their own suggestions, and only their own', async () => {
    await prisma().userCapability.create({
      data: {
        userId: (await prisma().user.findFirst({ where: { username: 'sugg_stranger' } }))!.id,
        capability: 'CONTENT_SUGGEST',
      },
    });
    await post('/api/v1/content-suggestions', strangerSession).send(
      body({ titleEn: "The stranger's suggestion" }),
    );

    const res = await get('/api/v1/content-suggestions/mine', authorSession);

    expect(res.status).toBe(200);
    const titles = res.body.data.map((s: { titleEn: string }) => s.titleEn);
    expect(titles).not.toContain("The stranger's suggestion");
  });

  it('an admin sees every suggestion, whoever made it', async () => {
    const res = await get('/api/v1/content-suggestions', adminSession);

    expect(res.status).toBe(200);
    const authors = new Set(res.body.data.map((s: { authorId: string }) => s.authorId));
    expect(authors.size, 'suggestions from more than one author must be visible').toBeGreaterThan(
      1,
    );
  });

  it('NEGATIVE: a non-admin cannot read everyone else’s suggestions', async () => {
    const res = await get('/api/v1/content-suggestions', authorSession);

    expect(res.status).toBe(403);
  });

  it('triage records what the suggestion became, not just that it was handled', async () => {
    const created = await post('/api/v1/content-suggestions', authorSession).send(body());
    const id = created.body.data.id;

    const res = await patch(`/api/v1/content-suggestions/${id}`, adminSession).send({
      status: 'ACCEPTED',
      linkedCmsKey: 'weakness.description',
    });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'ACCEPTED',
      linkedCmsKey: 'weakness.description',
    });
  });

  it('a second triage pass does not blank what the first one wrote', async () => {
    const created = await post('/api/v1/content-suggestions', authorSession).send(body());
    const id = created.body.data.id;

    await patch(`/api/v1/content-suggestions/${id}`, adminSession).send({
      status: 'ACCEPTED',
      resolution: 'Agreed — becomes a CMS slot',
    });
    // Status-only follow-up, the shape a "mark as shipped" button would send.
    const res = await patch(`/api/v1/content-suggestions/${id}`, adminSession).send({
      status: 'SHIPPED',
    });

    expect(res.body.data.status).toBe('SHIPPED');
    expect(res.body.data.resolution).toBe('Agreed — becomes a CMS slot');
  });

  it('NEGATIVE: an author cannot triage their own suggestion', async () => {
    const created = await post('/api/v1/content-suggestions', authorSession).send(body());

    const res = await patch(
      `/api/v1/content-suggestions/${created.body.data.id}`,
      authorSession,
    ).send({ status: 'ACCEPTED' });

    expect(res.status).toBe(403);
  });
});
