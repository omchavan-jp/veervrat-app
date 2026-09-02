import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailQueueService } from './email-queue.service';
import type { EmailService } from './email.service';

/**
 * Email leaves the request path (#141).
 *
 * Sends used to be awaited inside the request that triggered them: a slow relay slowed signup, and
 * a failed send had no retry and, for registration, cost the person their account.
 *
 * ⚠️ These run in the `unit` project, which has NO Redis. Anything that constructs a BullMQ
 * Queue or Worker belongs in `email-queue.integration.spec.ts` instead — a Worker connects
 * eagerly, so a test that merely builds one fails in CI while passing on a machine with the
 * docker stack running. That is exactly how this file was wrong on its first push.
 *
 * So what is left here is the no-Redis path, which is a real configuration: local development
 * without Redis must still deliver rather than silently dropping every email.
 */
function makeService(deliver = vi.fn().mockResolvedValue(undefined)) {
  const emailService = { deliver } as unknown as EmailService;
  const service = new EmailQueueService(emailService);
  return { service, deliver };
}

const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

afterEach(() => {
  if (ORIGINAL_REDIS_URL === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = ORIGINAL_REDIS_URL;
});

import { EMAIL_QUEUE_NAME } from './email-queue.service';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('the queue is safe on a CLUSTERED Redis', () => {
  /**
   * ⚠️ This is asserted against the source, not against a running Redis, and deliberately so.
   *
   * Azure Managed Redis is a cluster. BullMQ's Lua scripts touch several of its keys in one call,
   * and a cluster requires every key in a command to share a hash slot — which only happens if
   * part of the key is wrapped in braces. Without that, every operation fails:
   *
   *     CROSSSLOT Keys in request don't hash to the same slot
   *
   * Shipped without it on 2026-08-31, the worker failed several hundred times a second and each
   * failure was logged: 3.3M lines an hour, ~53 GB a day, ₹19,230 in twelve hours — 98% of the
   * month's entire bill against infrastructure costing ₹306.
   *
   * **No test could have caught it by connecting to Redis**, because the docker Redis used locally
   * and in CI is a single node and has no slots to cross. Reproducing the failure needs a cluster
   * nobody runs in CI. So the check is on the property that makes the code correct — the hash tag
   * — which is weaker than exercising it and infinitely stronger than the nothing that was there.
   */
  const SRC = readFileSync(join(__dirname, 'email-queue.service.ts'), 'utf8');

  it('wraps the key prefix in braces, so every key hashes to one slot', () => {
    const prefix = /const QUEUE_PREFIX = '([^']+)'/.exec(SRC)?.[1];
    expect(prefix, 'QUEUE_PREFIX must exist').toBeTruthy();
    expect(prefix, `${prefix} has no hash tag — a cluster will reject every operation`).toMatch(
      /^\{.+\}$/,
    );
  });

  it('passes that prefix to BOTH the queue and the worker', () => {
    // One without the other is worse than neither: they would address different keys, and the
    // failure would look like jobs vanishing rather than like an error.
    const uses = SRC.match(/prefix: QUEUE_PREFIX/g) ?? [];
    expect(uses.length, 'prefix must be given to the Queue and to the Worker').toBe(2);
  });

  it('rate-limits worker errors, so a broken queue cannot bill by the line', () => {
    // The connection fault cost nothing. Logging every occurrence of it cost ₹19,230.
    expect(SRC).toMatch(/WORKER_ERROR_LOG_INTERVAL_MS/);
    expect(SRC).toMatch(/suppressedSinceLast/);
    expect(SRC).not.toMatch(/on\('error', \(err\) => \{\s*this\.logger\.error/);
  });

  it('still names the queue plainly — the prefix is separate from the name', () => {
    expect(EMAIL_QUEUE_NAME).toBe('email');
  });
});

describe('EmailQueueService — without Redis', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('sends inline rather than dropping the message', () => {
    // Local development has no Redis. Queueing into nothing would lose every email silently,
    // which is a worse version of the defect this change exists to fix.
    const { service } = makeService();
    service.onModuleInit();
    expect(service.getQueue()).toBeUndefined();
  });

  it('still delivers, so nothing is lost when there is no queue', async () => {
    const { service, deliver } = makeService();
    service.onModuleInit();

    await service.sendTransactional('me@example.com', 'Subject', '<p/>', 'text');

    expect(deliver).toHaveBeenCalledWith('me@example.com', 'Subject', '<p/>', 'text');
  });

  it('a notification that cannot be delivered does not disturb its caller', async () => {
    // The contract that must survive the move to a queue: an invitation notice failing must not
    // fail the invitation.
    const deliver = vi.fn().mockRejectedValue(new Error('smtp down'));
    const { service } = makeService(deliver);
    service.onModuleInit();

    expect(() => service.sendNotification('me@example.com', 'S', '<p/>', 't')).not.toThrow();
    await new Promise((r) => setImmediate(r));
    expect(deliver).toHaveBeenCalledOnce();
  });
});
