import { describe, it, expect, vi } from 'vitest';
import { DashboardService } from './dashboard.service';
import type { DashboardStats, SuggestionItem } from './dashboard.repository';

const ZERO_STATS: DashboardStats = {
  virtues: { count: 0 },
  subvirtues: { count: 0 },
  journeys: { active: 0, completed: 0 },
  exposures: { active: 0, completed: 0 },
  resolutions: { active: 0, completed: 0 },
  challenges: { active: 0, completed: 0 },
  weaknesses: { explored: 0 },
  tests: { taken: 0 },
};

const ACTIVE_STATS: DashboardStats = {
  virtues: { count: 2 },
  subvirtues: { count: 3 },
  journeys: { active: 2, completed: 1 },
  exposures: { active: 1, completed: 0 },
  resolutions: { active: 0, completed: 0 },
  challenges: { active: 0, completed: 0 },
  weaknesses: { explored: 2 },
  tests: { taken: 3 },
};

function makeSuggestion(sentenceId: string, score: number, weaknessId = 'w-1'): SuggestionItem {
  return {
    sentenceId,
    sentenceTextEn: `Sentence ${sentenceId}`,
    sentenceTextMr: null,
    score,
    subvirtueId: 'sv-1',
    subvirtueNameEn: 'Courage',
    subvirtueNameMr: null,
    virtueId: 'v-1',
    virtueNameEn: 'Bravery',
    virtueNameMr: null,
    weaknessId,
    weaknessNameEn: 'Weakness A',
    weaknessNameMr: null,
  };
}

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    getStats: vi.fn().mockResolvedValue(ZERO_STATS),
    getSuggestions: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo> = makeRepo()) {
  const svc = new DashboardService(repo as never);
  return { svc, repo };
}

describe('DashboardService', () => {
  describe('getStats', () => {
    it('returns stats from repository for a VA with active journeys', async () => {
      const { svc, repo } = makeService(
        makeRepo({ getStats: vi.fn().mockResolvedValue(ACTIVE_STATS) }),
      );
      const result = await svc.getStats('va-1');
      expect(result.virtues.count).toBe(2);
      expect(result.subvirtues.count).toBe(3);
      expect(result.journeys.active).toBe(2);
      expect(repo.getStats).toHaveBeenCalledWith('va-1');
    });

    it('returns all zeros when VA has no journeys or tests', async () => {
      const { svc } = makeService();
      const result = await svc.getStats('va-empty');
      expect(result.virtues.count).toBe(0);
      expect(result.journeys.active).toBe(0);
      expect(result.tests.taken).toBe(0);
    });
  });

  describe('getSuggestions', () => {
    it('wraps repository result in suggestions key', async () => {
      const items = [makeSuggestion('s-1', 1), makeSuggestion('s-2', 2)];
      const { svc } = makeService(makeRepo({ getSuggestions: vi.fn().mockResolvedValue(items) }));
      const result = await svc.getSuggestions('va-1');
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].score).toBe(1);
      expect(result.suggestions[1].score).toBe(2);
    });

    it('returns empty suggestions when VA has no submitted tests', async () => {
      const { svc } = makeService();
      const result = await svc.getSuggestions('va-empty');
      expect(result.suggestions).toEqual([]);
    });

    it('passes userId to repository', async () => {
      const { svc, repo } = makeService();
      await svc.getSuggestions('va-specific');
      expect(repo.getSuggestions).toHaveBeenCalledWith('va-specific');
    });
  });
});
