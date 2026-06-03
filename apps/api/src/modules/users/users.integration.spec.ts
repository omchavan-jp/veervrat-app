import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from '../../test/helpers/app.helper';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CSRF = 'test-csrf-token';
const csrfHeaders = { Cookie: `csrf-token=${CSRF}`, 'X-CSRF-Token': CSRF };
// 1 round — fast enough for test DB setup, bcrypt.compare still works
const TEST_BCRYPT_ROUNDS = 1;
const TEST_PASSWORD = 'Password1!';

async function createUser(
  prisma: ReturnType<typeof getTestPrisma>,
  overrides: Record<string, unknown> = {},
) {
  return prisma.user.create({
    data: {
      email: `user_${Math.random().toString(36).slice(2)}@example.com`,
      displayName: 'Test User',
      username: `user_${Math.random().toString(36).slice(2, 10)}`,
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date(),
      roles: { create: { role: 'VRATARTHI' } },
      ...overrides,
    },
  });
}

async function createUserWithLogin(prisma: ReturnType<typeof getTestPrisma>) {
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash(TEST_PASSWORD, TEST_BCRYPT_ROUNDS);
  const email = `login_${Math.random().toString(36).slice(2)}@example.com`;
  const user = await createUser(prisma, { email });
  await prisma.authAccount.create({
    data: {
      userId: user.id,
      provider: 'EMAIL',
      providerAccountId: email,
      passwordHash: hash,
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { email } });
  return { user, email };
}

async function loginUser(email: string): Promise<string> {
  const res = await getRequest()
    .post('/api/v1/auth/login')
    .set(csrfHeaders)
    .send({ email, password: TEST_PASSWORD });
  const setCookie = res.headers['set-cookie'] as string[] | string | undefined;
  if (!setCookie) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const sessionCookie = cookies.find((c: string) => c.startsWith('veervrat_session='));
  if (!sessionCookie) throw new Error('No session cookie in response');
  return sessionCookie.split(';')[0];
}

describe('Users — integration', () => {
  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  // ─── GET /users/me ─────────────────────────────────────────────────────────

  describe('GET /api/v1/users/me', () => {
    it('POSITIVE: returns own profile for authenticated user', async () => {
      const prisma = getTestPrisma();
      const { user, email } = await createUserWithLogin(prisma);
      const sessionCookie = await loginUser(email);

      const res = await getRequest()
        .get('/api/v1/users/me')
        .set('Cookie', `${sessionCookie}; csrf-token=${CSRF}`)
        .set('X-CSRF-Token', CSRF);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data).toHaveProperty('showLastActive');
      expect(res.body.data).toHaveProperty('profilePrivate');
    }, 15_000);

    it('NEGATIVE: returns 401 when no session', async () => {
      const res = await getRequest().get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });
  });

  // ─── PATCH /users/me ───────────────────────────────────────────────────────

  describe('PATCH /api/v1/users/me', () => {
    it('POSITIVE: updates displayName for authenticated user', async () => {
      const prisma = getTestPrisma();
      const { email } = await createUserWithLogin(prisma);
      const sessionCookie = await loginUser(email);

      const res = await getRequest()
        .patch('/api/v1/users/me')
        .set('Cookie', `${sessionCookie}; csrf-token=${CSRF}`)
        .set('X-CSRF-Token', CSRF)
        .send({ displayName: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.displayName).toBe('Updated Name');
    }, 15_000);

    it('NEGATIVE: returns 401 when no session', async () => {
      const res = await getRequest()
        .patch('/api/v1/users/me')
        .set(csrfHeaders)
        .send({ displayName: 'Hacker' });
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /users/:username ──────────────────────────────────────────────────

  describe('GET /api/v1/users/:username', () => {
    it('POSITIVE: returns public profile for public user', async () => {
      const prisma = getTestPrisma();
      const username = `pub_${Math.random().toString(36).slice(2, 10)}`;
      await createUser(prisma, { username, profilePrivate: false });

      const res = await getRequest().get(`/api/v1/users/${username}`);

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe(username);
      expect(res.body.data).not.toHaveProperty('email');
    });

    it('NEGATIVE: returns 404 for private profile', async () => {
      const prisma = getTestPrisma();
      const username = `priv_${Math.random().toString(36).slice(2, 10)}`;
      await createUser(prisma, { username, profilePrivate: true });

      const res = await getRequest().get(`/api/v1/users/${username}`);

      expect(res.status).toBe(404);
    });

    it('NEGATIVE: returns 404 for non-existent username', async () => {
      const res = await getRequest().get('/api/v1/users/definitely_does_not_exist_xyz');
      expect(res.status).toBe(404);
    });

    it('omits lastActiveAt field when showLastActive = false', async () => {
      const prisma = getTestPrisma();
      const username = `nolast_${Math.random().toString(36).slice(2, 10)}`;
      await createUser(prisma, { username, showLastActive: false });

      const res = await getRequest().get(`/api/v1/users/${username}`);

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('lastActiveAt');
    });

    it('omits isOnline field when showOnlineIndicator = false', async () => {
      const prisma = getTestPrisma();
      const username = `noind_${Math.random().toString(36).slice(2, 10)}`;
      await createUser(prisma, { username, showOnlineIndicator: false });

      const res = await getRequest().get(`/api/v1/users/${username}`);

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('isOnline');
    });
  });

  // ─── GET /users/check-username ─────────────────────────────────────────────

  describe('GET /api/v1/users/check-username', () => {
    it('POSITIVE: returns available:true for unused username (authenticated)', async () => {
      const prisma = getTestPrisma();
      const { email } = await createUserWithLogin(prisma);
      const sessionCookie = await loginUser(email);

      const res = await getRequest()
        .get('/api/v1/users/check-username?username=definitely_free_xyz123')
        .set('Cookie', `${sessionCookie}; csrf-token=${CSRF}`)
        .set('X-CSRF-Token', CSRF);

      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
    }, 15_000);

    it('NEGATIVE: returns 401 when no session', async () => {
      const res = await getRequest().get('/api/v1/users/check-username?username=someuser');
      expect(res.status).toBe(401);
    });
  });
});
