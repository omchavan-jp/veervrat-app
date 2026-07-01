import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { configureApp } from '../../bootstrap';

let app: INestApplication | null = null;
let prisma: PrismaService | null = null;

export async function createTestApp(): Promise<INestApplication> {
  // Close any previously running app to prevent port conflicts and leaked handles
  if (app) {
    await app.close();
    app = null;
    prisma = null;
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  prisma = app.get(PrismaService);
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
    prisma = null;
  }
}

export function getRequest() {
  if (!app) throw new Error('Call createTestApp() before getRequest()');
  return request(app.getHttpServer());
}

export function getTestPrisma(): PrismaService {
  if (!prisma) throw new Error('Call createTestApp() before getTestPrisma()');
  return prisma;
}

/**
 * Runs a callback inside a Prisma transaction that is rolled back at the end.
 * This is the preferred isolation mechanism — it gives a clean slate without truncation.
 *
 * Usage:
 *   await withRollback(async (tx) => {
 *     await tx.user.create({ data: { ... } });
 *     // assertions...
 *   });
 */
export async function withRollback<T>(
  fn: (
    tx: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>,
  ) => Promise<T>,
): Promise<T | undefined> {
  const p = getTestPrisma();
  let result: T | undefined;
  await p
    .$transaction(async (tx) => {
      result = await fn(tx as Parameters<typeof fn>[0]);
      // Always roll back by throwing — Prisma rolls back on any thrown error
      throw new RollbackSignal();
    })
    .catch((e) => {
      if (e instanceof RollbackSignal) return; // expected — swallow
      throw e; // real error — rethrow
    });
  return result;
}

class RollbackSignal extends Error {
  constructor() {
    super('__test_rollback__');
  }
}

/**
 * Truncates all user-facing tables.
 * Use this in afterAll for full cleanup, or prefer withRollback() for per-test isolation.
 */
export async function cleanTestDb(): Promise<void> {
  const p = getTestPrisma();
  // Single statement — atomic, CASCADE handles FK ordering automatically.
  // Includes all tables: user-activity tables + all content/reference tables.
  await p.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_events,
      notifications,
      chat_messages,
      experience_log_tags,
      experience_logs,
      blog_comments,
      blogs,
      resolution_checkins,
      journey_challenges,
      journey_resolutions,
      journey_exposures,
      vm_sidenotes,
      journey_vm_assignments,
      journey_weaknesses,
      journeys,
      vm_relationships,
      invitations,
      test_answers,
      test_attempts,
      user_follows,
      user_roles,
      verification_tokens,
      sessions,
      auth_accounts,
      users,
      resource_tags,
      resources,
      shloka_queue_items,
      shloka_schedules,
      pothi_section_shlokas,
      pothi_sections,
      shloka_tags,
      shlokas,
      challenge_weaknesses,
      challenges,
      resolution_weaknesses,
      resolutions,
      exposure_weaknesses,
      exposures,
      weakness_subvirtues,
      weaknesses,
      sentences,
      subvirtues,
      virtues
    CASCADE
  `);
}
