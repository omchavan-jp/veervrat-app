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
