import { api } from './client';

type Wrapped<T> = { data: T };

export type DashboardStats = {
  virtues: { count: number };
  subvirtues: { count: number };
  journeys: { active: number; completed: number };
  exposures: { active: number; completed: number };
  resolutions: { active: number; completed: number };
  challenges: { active: number; completed: number };
  weaknesses: { explored: number };
  tests: { taken: number };
};

export type SuggestionItem = {
  sentenceId: string;
  sentenceTextEn: string;
  sentenceTextMr: string | null;
  score: number;
  subvirtueId: string;
  subvirtueNameEn: string;
  subvirtueNameMr: string | null;
  virtueId: string;
  virtueNameEn: string;
  virtueNameMr: string | null;
  weaknessId: string;
  weaknessNameEn: string;
  weaknessNameMr: string | null;
};

export type DashboardSuggestions = {
  suggestions: SuggestionItem[];
};

export type PlatformStats = {
  vratarthis: number;
  vratmitras: number;
  testsSolved: number;
  practiceDaysCompleted: number;
};

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    api.get<Wrapped<DashboardStats>>('/dashboard/stats').then((r) => r.data),

  getSuggestions: (): Promise<DashboardSuggestions> =>
    api.get<Wrapped<DashboardSuggestions>>('/dashboard/suggestions').then((r) => r.data),

  // Guest-accessible, Redis-cached 60-min (spec/decisions/11_platform-stats.md).
  getPlatformStats: (): Promise<PlatformStats> =>
    api.get<Wrapped<PlatformStats>>('/stats/platform').then((r) => r.data),
};
