import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailQueueService } from './email-queue.service';
import type { EmailService } from './email.service';

/**
 * Email leaves the request path (#141).
 *
 * Sends used to be awaited inside the request that triggered them: a slow relay slowed signup, and
 * a failed send had no retry and, for registration, cost the person their account.
 *
 * These cover the shape without Redis. Retry, backoff and what survives a failure are the queue's
 * own behaviour and are asserted against a real Redis in `email-queue.integration.spec.ts` —
 * mocking BullMQ and then asserting BullMQ's retry semantics would be asserting the mock.
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

describe('EmailQueueService — with Redis configured', () => {
  beforeEach(() => {
    process.env.REDIS_URL = 'redis://localhost:6380/1';
  });

  it('builds a queue, so the request stops waiting on SMTP', async () => {
    const { service, deliver } = makeService();
    service.onModuleInit();

    expect(service.getQueue()).toBeDefined();

    // The point of the change: enqueueing does not call the transport. Whoever is waiting on the
    // HTTP response is no longer waiting on a mail relay.
    await service.sendTransactional('me@example.com', 'Subject', '<p/>', 'text');
    expect(deliver).not.toHaveBeenCalled();

    await service.onModuleDestroy();
  });

  it('marks which kind of email a job is, because the two are treated differently', async () => {
    const { service } = makeService();
    service.onModuleInit();
    const queue = service.getQueue()!;
    const add = vi.spyOn(queue, 'add');

    await service.sendTransactional('a@example.com', 'S', '<p/>', 't');
    service.sendNotification('b@example.com', 'S', '<p/>', 't');
    await new Promise((r) => setImmediate(r));

    expect(add).toHaveBeenCalledTimes(2);
    expect(add.mock.calls[0]?.[0]).toBe('transactional');
    expect(add.mock.calls[1]?.[0]).toBe('notification');

    await service.onModuleDestroy();
  });

  it('asks for retries with backoff, and keeps failures', async () => {
    const { service } = makeService();
    service.onModuleInit();
    const queue = service.getQueue()!;
    const add = vi.spyOn(queue, 'add');

    await service.sendTransactional('a@example.com', 'S', '<p/>', 't');

    const opts = add.mock.calls[0]?.[2];
    expect(opts?.attempts).toBeGreaterThan(1);
    expect(opts?.backoff).toMatchObject({ type: 'exponential' });
    // A failed job is the only record that somebody did not receive something. Discarding them
    // would restore exactly the gap #141 describes.
    expect(opts?.removeOnFail).toBeTruthy();
    expect(opts?.removeOnFail).not.toBe(true);

    await service.onModuleDestroy();
  });
});
