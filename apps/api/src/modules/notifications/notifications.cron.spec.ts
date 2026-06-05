import { describe, it, expect, vi } from 'vitest';
import { NotificationsCron } from './notifications.cron';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function makeCron(archiveOlderThan = vi.fn().mockResolvedValue(0)) {
  const repo = { archiveOlderThan };
  const cron = Object.create(NotificationsCron.prototype) as NotificationsCron;
  (cron as unknown as Record<string, unknown>)['notificationsRepository'] = repo;
  (cron as unknown as Record<string, unknown>)['logger'] = {
    log: vi.fn(),
    error: vi.fn(),
  };
  return { cron, repo };
}

describe('NotificationsCron', () => {
  it('calls archiveOlderThan with a date 90 days in the past (±2s tolerance)', async () => {
    const before = Date.now();
    const { cron, repo } = makeCron();
    await cron.archiveOld();
    const after = Date.now();

    expect(repo.archiveOlderThan).toHaveBeenCalledOnce();
    const calledWith = repo.archiveOlderThan.mock.calls[0][0] as Date;
    expect(calledWith).toBeInstanceOf(Date);

    const expectedMin = before - NINETY_DAYS_MS - 2000;
    const expectedMax = after - NINETY_DAYS_MS + 2000;
    expect(calledWith.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(calledWith.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it('logs start and completion with the archived row count', async () => {
    const { cron } = makeCron(vi.fn().mockResolvedValue(42));
    const logger = (cron as unknown as Record<string, unknown>)['logger'] as {
      log: ReturnType<typeof vi.fn>;
    };
    await cron.archiveOld();
    expect(logger.log).toHaveBeenCalledTimes(2);
    expect(logger.log.mock.calls[1][0]).toContain('42');
  });

  it('rethrows errors from the repository', async () => {
    const boom = new Error('DB error');
    const { cron } = makeCron(vi.fn().mockRejectedValue(boom));
    await expect(cron.archiveOld()).rejects.toThrow('DB error');
  });
});
