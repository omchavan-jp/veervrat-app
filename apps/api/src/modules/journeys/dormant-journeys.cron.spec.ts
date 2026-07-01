import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DormantJourneysCron } from './dormant-journeys.cron';
import { NotificationEventType } from '@prisma/client';

function makeRepo(stale: { id: string; vratarthiId: string; vmIds: string[] }[]) {
  return {
    findStaleActiveJourneys: vi.fn().mockResolvedValue(stale),
    markDormant: vi.fn().mockResolvedValue(undefined),
  };
}

function makeCron(stale: { id: string; vratarthiId: string; vmIds: string[] }[]) {
  const repo = makeRepo(stale);
  const notifications = { create: vi.fn().mockResolvedValue({ id: 'n' }) };
  const cron = new DormantJourneysCron(repo as never, notifications as never);
  return { cron, repo, notifications };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('DormantJourneysCron', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks each stale journey dormant and notifies the VA + assigned VMs', async () => {
    const { cron, repo, notifications } = makeCron([
      { id: 'j-1', vratarthiId: 'va-1', vmIds: ['vm-1', 'vm-2'] },
    ]);
    await cron.detectDormant();
    await flush();

    expect(repo.markDormant).toHaveBeenCalledWith('j-1', expect.any(Date));
    // VA + 2 VMs = 3 notifications, all JOURNEY_DORMANT, system event (null actor).
    expect(notifications.create).toHaveBeenCalledTimes(3);
    expect(notifications.create).toHaveBeenCalledWith(
      'va-1',
      null,
      NotificationEventType.JOURNEY_DORMANT,
      'journey',
      'j-1',
    );
    expect(notifications.create).toHaveBeenCalledWith(
      'vm-1',
      null,
      NotificationEventType.JOURNEY_DORMANT,
      'journey',
      'j-1',
    );
    expect(notifications.create).toHaveBeenCalledWith(
      'vm-2',
      null,
      NotificationEventType.JOURNEY_DORMANT,
      'journey',
      'j-1',
    );
  });

  it('queries with a ~30-day cutoff', async () => {
    const { cron, repo } = makeCron([]);
    const before = Date.now() - 30 * 24 * 60 * 60 * 1000;
    await cron.detectDormant();
    const cutoff = (repo.findStaleActiveJourneys.mock.calls[0][0] as Date).getTime();
    // within a few seconds of exactly 30 days ago
    expect(Math.abs(cutoff - before)).toBeLessThan(5000);
  });

  it('notifies only the VA when a journey has no assigned VM', async () => {
    const { cron, notifications } = makeCron([{ id: 'j-2', vratarthiId: 'va-2', vmIds: [] }]);
    await cron.detectDormant();
    await flush();
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(
      'va-2',
      null,
      NotificationEventType.JOURNEY_DORMANT,
      'journey',
      'j-2',
    );
  });

  it('does nothing when there are no stale journeys', async () => {
    const { cron, repo, notifications } = makeCron([]);
    await cron.detectDormant();
    expect(repo.markDormant).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
