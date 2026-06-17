import { describe, it, expect, vi } from 'vitest';
import { StatsController } from './stats.controller';

const PLATFORM_STATS = { vratarthis: 0, vratmitras: 0, testsSolved: 0, practiceDaysCompleted: 0 };

function makeController() {
  const svc = { getPlatformStats: vi.fn().mockResolvedValue(PLATFORM_STATS) };
  return { ctrl: new StatsController(svc as never), svc };
}

describe('StatsController — GET /stats/platform', () => {
  // Guest-accessible: the controller carries no SessionGuard (spec/decisions/11).
  it('positive: returns platform stats with no authentication required', async () => {
    const { ctrl, svc } = makeController();
    const result = await ctrl.getPlatformStats();
    expect(svc.getPlatformStats).toHaveBeenCalledOnce();
    expect(result).toEqual(PLATFORM_STATS);
  });
});
