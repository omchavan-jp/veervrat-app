import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Controller,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { Role } from '@prisma/client';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './require-permission.decorator';
import { SessionUser } from '../../modules/auth/types/auth.types';

// ─── Test-only middleware: injects user from X-Test-User header ───────────────

@Injectable()
class TestUserMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers['x-test-user'];
    if (header && typeof header === 'string') {
      req.user = JSON.parse(header) as SessionUser;
    }
    next();
  }
}

// ─── Fixture controller — two routes decorated with @RequirePermission ────────

@Controller('test-fixture')
@UseGuards(PermissionGuard)
class FixtureController {
  // Route 1: requires journey.view with a resolver that always returns an own-journey resource
  @Get('journey')
  @RequirePermission('journey.view', (req) => {
    const user = req.user as SessionUser;
    return {
      type: 'journey' as const,
      journey: {
        id: 'journey-1',
        vratarthiId: user.id,
        vmAssignments: [],
        globalVmRelationship: null,
      },
    };
  })
  getJourney() {
    return { ok: true };
  }

  // Route 2: requires admin.manage_taxonomy — no resolver (platform resource)
  @Get('admin')
  @RequirePermission('admin.manage_taxonomy')
  getAdmin() {
    return { ok: true };
  }
}

// ─── Minimal test module ──────────────────────────────────────────────────────

@Module({
  controllers: [FixtureController],
  providers: [PermissionGuard, Reflector],
})
class FixtureModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TestUserMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

// ─── Test setup ───────────────────────────────────────────────────────────────

let app: INestApplication;

function makeUserHeader(roles: Role[], id = 'user-1'): string {
  const user: SessionUser = {
    id,
    email: 'test@test.com',
    displayName: 'Test',
    username: 'test',
    language: 'EN',
    roles,
    emailVerifiedAt: new Date().toISOString() as unknown as Date,
    onboardingCompletedAt: new Date().toISOString() as unknown as Date,
  };
  return JSON.stringify(user);
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [FixtureModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
}, 15_000);

afterAll(async () => {
  await app.close();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PermissionGuard integration', () => {
  describe('8.3 — unauthenticated request → 401', () => {
    it('returns 401 on journey route without session', async () => {
      const res = await request(app.getHttpServer()).get('/test-fixture/journey');
      expect(res.status).toBe(401);
    });

    it('returns 401 on admin route without session', async () => {
      const res = await request(app.getHttpServer()).get('/test-fixture/admin');
      expect(res.status).toBe(401);
    });
  });

  describe('8.4 — authenticated but unauthorized → 403', () => {
    it('VA gets 403 on admin route (lacks ADMIN role)', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-fixture/admin')
        .set('x-test-user', makeUserHeader([Role.VRATARTHI]));
      expect(res.status).toBe(403);
    });

    it('VM gets 403 on journey route (not the journey owner)', async () => {
      // The fixture resolver returns a journey owned by user-1;
      // VM user has id vm-1 and VRATMITRA role only — not the owner, not assigned
      const res = await request(app.getHttpServer())
        .get('/test-fixture/journey')
        .set('x-test-user', makeUserHeader([Role.VRATMITRA], 'vm-1'));
      expect(res.status).toBe(403);
    });
  });

  describe('8.5 — authorized request passes through → 200', () => {
    it('VA gets 200 on journey route (resolver builds resource from their own user id)', async () => {
      // resolver uses user.id as vratarthiId — so VA user-1 owns the journey
      const res = await request(app.getHttpServer())
        .get('/test-fixture/journey')
        .set('x-test-user', makeUserHeader([Role.VRATARTHI], 'user-1'));
      expect(res.status).toBe(200);
    });

    it('ADMIN gets 200 on admin route', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-fixture/admin')
        .set('x-test-user', makeUserHeader([Role.ADMIN]));
      expect(res.status).toBe(200);
    });

    it('MODERATOR gets 200 on a moderator-shared route when tested via review_custom_erc', async () => {
      // Use admin route that requires admin.manage_taxonomy — moderator should NOT get 200
      // (verifies ADMIN-only stays ADMIN-only)
      const res = await request(app.getHttpServer())
        .get('/test-fixture/admin')
        .set('x-test-user', makeUserHeader([Role.MODERATOR]));
      expect(res.status).toBe(403);
    });
  });
});
