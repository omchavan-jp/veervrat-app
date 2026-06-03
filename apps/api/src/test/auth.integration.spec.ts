import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  getRequest,
  getTestPrisma,
  cleanTestDb,
} from './helpers/app.helper';

describe('Auth — integration', () => {
  beforeAll(async () => {
    await createTestApp();
    await cleanTestDb();
  }, 30_000);

  afterAll(async () => {
    await cleanTestDb();
    await closeTestApp();
  });

  // ─── CSRF ──────────────────────────────────────────────────────────────────

  describe('CSRF protection', () => {
    it('POST without X-CSRF-Token returns 403', async () => {
      const res = await getRequest()
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'csrf@test.com', password: 'Password1' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCESS_DENIED');
    });

    it('POST with matching X-CSRF-Token proceeds past CSRF guard', async () => {
      const csrfToken = 'test-csrf-token-12345';
      const res = await getRequest()
        .post('/api/v1/auth/login')
        .set('Cookie', `csrf-token=${csrfToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'noexist@test.com', password: 'Password1' });
      // CSRF guard passed — got past to auth logic (401 credentials, not 403 CSRF)
      expect(res.status).not.toBe(403);
    });
  });

  // ─── check-username ────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/check-username', () => {
    it('returns available:true for unused username', async () => {
      const res = await getRequest().get('/api/v1/auth/check-username?username=unused_xyz_123');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
    });

    it('returns available:false for taken username', async () => {
      const prisma = getTestPrisma();
      await prisma.user.create({
        data: {
          email: 'taken@test.com',
          displayName: 'Taken User',
          username: 'taken_username',
          roles: { create: { role: 'VRATARTHI' } },
        },
      });

      const res = await getRequest().get('/api/v1/auth/check-username?username=taken_username');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });

    it('returns available:false for invalid format', async () => {
      const res = await getRequest().get('/api/v1/auth/check-username?username=bad%20user%21');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });
  });

  // ─── completeOnboarding ────────────────────────────────────────────────────

  describe('POST /api/v1/auth/complete-onboarding', () => {
    async function createSessionForUser(email: string) {
      const prisma = getTestPrisma();
      const user = await prisma.user.create({
        data: {
          email,
          displayName: 'Onboarding Test',
          username: `onboard_${email.replace(/[@.]/g, '_')}`,
          emailVerifiedAt: new Date(),
          roles: { create: { role: 'VRATARTHI' } },
        },
      });
      const token = 'session-token-' + user.id;
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      return { user, token };
    }

    it('persists username, displayName, and language', async () => {
      const { user, token } = await createSessionForUser('onboard1@test.com');
      const csrfToken = 'csrf-onboard-1';

      const res = await getRequest()
        .post('/api/v1/auth/complete-onboarding')
        .set('Cookie', `veervrat_session=${token}; csrf-token=${csrfToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ displayName: 'Updated Name', username: 'updated_unique', language: 'MR' });

      expect(res.status).toBe(200);

      const prisma = getTestPrisma();
      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated?.displayName).toBe('Updated Name');
      expect(updated?.username).toBe('updated_unique');
      expect(updated?.language).toBe('MR');
      expect(updated?.onboardingCompletedAt).not.toBeNull();
    });

    it('returns 409 when username is already taken', async () => {
      const prisma = getTestPrisma();
      await prisma.user.create({
        data: {
          email: 'already_taken_user@test.com',
          displayName: 'Already Taken',
          username: 'already_taken_uname',
          roles: { create: { role: 'VRATARTHI' } },
        },
      });

      const { token } = await createSessionForUser('onboard2@test.com');
      const csrfToken = 'csrf-onboard-2';

      const res = await getRequest()
        .post('/api/v1/auth/complete-onboarding')
        .set('Cookie', `veervrat_session=${token}; csrf-token=${csrfToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ username: 'already_taken_uname' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('DUPLICATE_ENTITY');
    });
  });

  // ─── Account lockout ───────────────────────────────────────────────────────

  describe('Account lockout', () => {
    it('returns ACCOUNT_LOCKED after 10 consecutive failed logins', async () => {
      const email = 'lockout_test@test.com';
      const csrfToken = 'csrf-lockout';

      // Create the user
      const prisma = getTestPrisma();
      await prisma.user.create({
        data: {
          email,
          displayName: 'Lockout Test',
          username: 'lockout_test_u',
          emailVerifiedAt: new Date(),
          roles: { create: { role: 'VRATARTHI' } },
          authAccounts: {
            create: {
              provider: 'EMAIL',
              providerAccountId: email,
              passwordHash: 'invalid-hash-not-bcrypt',
            },
          },
        },
      });

      // 10 failed attempts
      for (let i = 0; i < 10; i++) {
        await getRequest()
          .post('/api/v1/auth/login')
          .set('Cookie', `csrf-token=${csrfToken}`)
          .set('X-CSRF-Token', csrfToken)
          .send({ email, password: 'WrongPassword1' });
      }

      // 11th should be ACCOUNT_LOCKED
      const res = await getRequest()
        .post('/api/v1/auth/login')
        .set('Cookie', `csrf-token=${csrfToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ email, password: 'WrongPassword1' });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe('ACCOUNT_LOCKED');
    });
  });
});
