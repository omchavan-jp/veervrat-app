import { api } from './client';

type Wrapped<T> = { data: T };

export type JourneyState = 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'DORMANT' | 'COMPLETED';

export type JourneySummary = {
  id: string;
  title: string;
  state: JourneyState;
  updatedAt: string;
  sentence: { textEn: string };
  weaknesses: { weakness: { nameEn: string } }[];
};

export type ErcCounts = { total: number; active: number; approved: number };

export type JourneyDetail = {
  id: string;
  title: string;
  state: JourneyState;
  vratarthiId: string;
  sentenceId: string;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  dormantSince: string | null;
  createdAt: string;
  updatedAt: string;
  sentence: {
    id: string;
    textEn: string;
    textMr: string | null;
    subvirtue: {
      id: string;
      nameEn: string;
      nameMr: string | null;
      virtue: { id: string; nameEn: string; nameMr: string | null };
    };
  };
  weaknesses: { id: string; nameEn: string; nameMr: string | null }[];
  vmAssignments: { id: string; vmId: string; state: string }[];
  globalVmRelationship: { vmId: string; state: string } | null;
  ercCounts: {
    exposures: ErcCounts;
    resolutions: ErcCounts;
    challenges: ErcCounts;
  };
};

export type JourneyListResponse = {
  items: JourneySummary[];
  nextCursor: string | null;
};

// ─── ERC types ────────────────────────────────────────────────────────────────

export type ErcStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REVISIT';
export type ErcType = 'exposure' | 'resolution' | 'challenge';

export type JourneyErcItem = {
  id: string;
  journeyId: string;
  status: ErcStatus;
  isDeactivated: boolean;
  isCustom: boolean;
  titleEn: string;
  descriptionEn: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  // Exposure-specific
  tier?: 'LOCAL' | 'NATIONAL' | 'INTERNATIONAL';
  poolExposureId?: string | null;
  // Resolution-specific
  durationWeeks?: number | null;
  frequencyPerWeek?: number | null;
  frequencyLabel?: string | null;
  poolResolutionId?: string | null;
  // Challenge-specific
  durationDays?: number | null;
  poolChallengeId?: string | null;
};

export type PoolItem = {
  id: string;
  titleEn: string;
  descriptionEn: string | null;
  weaknessTags: { weaknessId: string }[];
  // Exposure
  tier?: 'LOCAL' | 'NATIONAL' | 'INTERNATIONAL';
  // Resolution
  durationWeeks?: number | null;
  frequencyLabel?: string | null;
  // Challenge
  durationDays?: number | null;
};

export const ercApi = {
  getPool: (journeyId: string, type: ErcType) =>
    api.get<Wrapped<PoolItem[]>>(`/journeys/${journeyId}/${type}s/pool`).then((r) => r.data),

  list: (journeyId: string, type: ErcType) =>
    api.get<Wrapped<JourneyErcItem[]>>(`/journeys/${journeyId}/${type}s`).then((r) => r.data),

  select: (journeyId: string, type: ErcType, poolItemId: string) =>
    api.post<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s`, { poolItemId }).then((r) => r.data),

  updateStatus: (journeyId: string, type: ErcType, itemId: string, status: string) =>
    api.patch<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s/${itemId}/status`, { status }).then((r) => r.data),

  deactivate: (journeyId: string, type: ErcType, itemId: string) =>
    api.post<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s/${itemId}/deactivate`).then((r) => r.data),

  reactivate: (journeyId: string, type: ErcType, itemId: string) =>
    api.post<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s/${itemId}/reactivate`).then((r) => r.data),

  remove: (journeyId: string, type: ErcType, itemId: string) =>
    api.delete<void>(`/journeys/${journeyId}/${type}s/${itemId}`),
};

export const journeysApi = {
  create: (data: { sentenceId: string; weaknessId: string; title?: string }) =>
    api.post<Wrapped<JourneyDetail>>('/journeys', data).then((r) => r.data),

  list: (cursor?: string) =>
    api.get<Wrapped<JourneyListResponse>>(cursor ? `/journeys?cursor=${cursor}` : '/journeys').then((r) => r.data),

  detail: (id: string) =>
    api.get<Wrapped<JourneyDetail>>(`/journeys/${id}`).then((r) => r.data),

  updateState: (id: string, action: 'pause' | 'resume') =>
    api.patch<Wrapped<{ id: string; state: JourneyState }>>(`/journeys/${id}/state`, { action }).then((r) => r.data),

  updateTitle: (id: string, title: string) =>
    api.patch<Wrapped<{ id: string; title: string }>>(`/journeys/${id}/title`, { title }).then((r) => r.data),
};
