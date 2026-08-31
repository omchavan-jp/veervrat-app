import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import Redis from 'ioredis';
import { EmailQueueService, EMAIL_QUEUE_NAME } from '../modules/email/email-queue.service';
import type { EmailService } from '../modules/email/email.service';

/**
 * The queue's actual behaviour, against a real Redis (#141).
 *
 * Integration rather than unit for a specific reason: retry, backoff and what survives a failure
 * are BullMQ's behaviour, not ours. Mocking BullMQ and then asserting that it retries would be
 * asserting the mock — the exact shape of test this repository has been bitten by before.
 *
 * What these establish:
 *   - a queued email is actually delivered by the worker (G6 — a queue nobody drains is worse
 *     than an inline send, not better)
 *   - a failing send is retried rather than lost (G5)
 *   - after the last attempt the job is still there to be found, because a failed job is the only
 *     record that somebody did not receive something
 */
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6380/1';

function makeService(deliver: ReturnType<typeof vi.fn>) {
  const emailService = { deliver } as unknown as EmailService;
  return new EmailQueueService(emailService);
}

/** Waits for a condition rather than sleeping a fixed time — timing assumptions make flaky tests. */
async function until(predicate: () => boolean | Promise<boolean>, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

describe('email queue, against a real Redis', () => {
  let redis: Redis;
  let service: EmailQueueService | undefined;

  beforeAll(() => {
    process.env.REDIS_URL = REDIS_URL;
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  });

  beforeEach(async () => {
    // A previous run's jobs would otherwise be delivered by this run's worker and counted here.
    const keys = await redis.keys(`bull:${EMAIL_QUEUE_NAME}:*`);
    if (keys.length) await redis.del(...keys);
  });

  // ⚠️ Unconditionally, not at the end of each test. A test that FAILS never reaches its own
  // teardown, so its worker stays alive and consumes the next test's jobs — with a different
  // `deliver` mock, so the next test then fails for a reason that has nothing to do with it.
  // Found by running these against a deliberately broken retry policy: the retry test failed as
  // intended, and took the unrelated test after it down too.
  afterEach(async () => {
    await service?.onModuleDestroy();
    service = undefined;
  });

  afterAll(async () => {
    await service?.onModuleDestroy();
    await redis.quit();
  });

  it('delivers a queued email — something is actually draining the queue', async () => {
    const deliver = vi.fn().mockResolvedValue(undefined);
    service = makeService(deliver);
    service.onModuleInit();

    await service.sendTransactional('drain@example.com', 'Subject', '<p/>', 'text');

    // The assertion that matters for G6. Enqueueing is easy; the queue only helps if a worker
    // takes the job off it and sends.
    const delivered = await until(() => deliver.mock.calls.length > 0);
    expect(delivered, 'the worker never delivered the queued email').toBe(true);
    expect(deliver).toHaveBeenCalledWith('drain@example.com', 'Subject', '<p/>', 'text');
  }, 30_000);

  it('retries a failing send instead of losing it', async () => {
    // Fails once, then succeeds. Before the queue there was no second attempt at all: a send that
    // failed was gone, with no retry and no record.
    const deliver = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED smtp'))
      .mockResolvedValue(undefined);
    service = makeService(deliver);
    service.onModuleInit();

    await service.sendTransactional('retry@example.com', 'Subject', '<p/>', 'text');

    const retried = await until(() => deliver.mock.calls.length >= 2, 25_000);
    expect(retried, 'the failing send was never retried').toBe(true);
  }, 40_000);

  it('keeps a permanently failing job, so somebody can find out who did not receive it', async () => {
    const deliver = vi.fn().mockRejectedValue(new Error('relay refused'));
    service = makeService(deliver);
    service.onModuleInit();

    await service.sendTransactional('lost@example.com', 'Subject', '<p/>', 'text');

    const queue = service.getQueue()!;
    const failed = await until(async () => (await queue.getFailedCount()) > 0, 40_000);
    expect(failed, 'a job that could never be delivered left no trace').toBe(true);

    const [job] = await queue.getFailed();
    // The record has to name the recipient, or it says only that something failed somewhere —
    // which is what #141 describes as the state before this change.
    expect(job?.data.to).toBe('lost@example.com');
  }, 60_000);
});

describe('EmailQueueService — queue construction and job options', () => {
  // Its own handle and teardown: this is a separate top-level describe, so it cannot see the one
  // above, and a worker left running here would consume the other block's jobs on a re-run.
  let service: EmailQueueService | undefined;

  beforeAll(() => {
    process.env.REDIS_URL = REDIS_URL;
  });

  afterEach(async () => {
    await service?.onModuleDestroy();
    service = undefined;
  });

  it('builds a queue, so the request stops waiting on SMTP', async () => {
    const deliver = vi.fn().mockResolvedValue(undefined);
    service = makeService(deliver);
    service!.onModuleInit();

    expect(service!.getQueue()).toBeDefined();

    // The point of the change: enqueueing does not call the transport. Whoever is waiting on the
    // HTTP response is no longer waiting on a mail relay.
    await service!.sendTransactional('me@example.com', 'Subject', '<p/>', 'text');
    expect(deliver).not.toHaveBeenCalled();
  });

  it('marks which kind of email a job is, because the two are treated differently', async () => {
    service = makeService(vi.fn().mockResolvedValue(undefined));
    service!.onModuleInit();
    const queue = service!.getQueue()!;
    const add = vi.spyOn(queue, 'add');

    await service!.sendTransactional('a@example.com', 'S', '<p/>', 't');
    service!.sendNotification('b@example.com', 'S', '<p/>', 't');
    await new Promise((r) => setImmediate(r));

    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[0]?.[0]).toBe('transactional');
    expect(add.mock.calls[1]?.[0]).toBe('notification');
  });

  it('asks for retries with backoff, and keeps failures', async () => {
    service = makeService(vi.fn().mockResolvedValue(undefined));
    service!.onModuleInit();
    const queue = service!.getQueue()!;
    const add = vi.spyOn(queue, 'add');

    await service!.sendTransactional('a@example.com', 'S', '<p/>', 't');

    const opts = add.mock.calls[0]?.[2];
    expect(opts?.attempts).toBeGreaterThan(1);
    expect(opts?.backoff).toMatchObject({ type: 'exponential' });
    // A failed job is the only record that somebody did not receive something. Discarding them
    // would restore exactly the gap #141 describes.
    expect(opts?.removeOnFail).toBeTruthy();
    expect(opts?.removeOnFail).not.toBe(true);
  });
});
