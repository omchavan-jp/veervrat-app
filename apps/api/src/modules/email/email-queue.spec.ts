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
