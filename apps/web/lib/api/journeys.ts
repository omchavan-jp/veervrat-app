import { api } from './client';

type Wrapped<T> = { data: T };

export type JourneyState = 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'DORMANT' | 'COMPLETED';

export type JourneySummary = {
  id: string;
  title: string;
  state: JourneyState;
  updatedAt: string;
  sentence: { textEn: string; textMr: string | null };
  weaknesses: { weakness: { nameEn: string; nameMr: string | null } }[];
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

export type VmSidenote = {
  id: string;
  vmId: string;
  text: string;
  acknowledgedAt: string | null;
  createdAt: string;
};

export type JourneyErcItem = {
  id: string;
  journeyId: string;
  status: ErcStatus;
  isDeactivated: boolean;
  isCustom: boolean;
  createdById: string | null;
  reviewStatus: string | null;
  titleEn: string;
  titleMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
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
  // VM sidenote (active only — null if none/revoked)
  vmSidenote?: VmSidenote | null;
};

export type PoolItem = {
  id: string;
  titleEn: string;
  titleMr: string | null;
  descriptionEn: string | null;
  descriptionMr: string | null;
  weaknessTags: { weaknessId: string }[];
  // Exposure
  tier?: 'LOCAL' | 'NATIONAL' | 'INTERNATIONAL';
  // Resolution
  durationWeeks?: number | null;
  frequencyLabel?: string | null;
  // Challenge
  durationDays?: number | null;
};

// ─── Checkin types ────────────────────────────────────────────────────────────

export type CheckinStatus = 'DONE' | 'PARTIAL' | 'MISSED';

export type ResolutionCheckin = {
  id: string;
  journeyResolutionId: string;
  status: CheckinStatus;
  note: string | null;
  checkedInAt: string;
  createdAt: string;
};

export type CheckinsResponse = {
  checkins: ResolutionCheckin[];
  streak: number;
};

// ─── Activity feed ──────────────────────────────────────────────────────────────

export type JourneyActivityEventType =
  | 'erc_started'
  | 'erc_submitted'
  | 'erc_approved'
  | 'checkin'
  | 'vm_suggestion';

export type JourneyActivityEvent = {
  id: string;
  type: JourneyActivityEventType;
  at: string;
  ercType: ErcType;
  itemId: string;
  titleEn: string;
  titleMr: string | null;
  checkinStatus?: CheckinStatus;
};

export const checkinsApi = {
  logCheckin: (journeyId: string, resolutionId: string, status: CheckinStatus, note?: string) =>
    api.post<Wrapped<ResolutionCheckin>>(`/journeys/${journeyId}/resolutions/${resolutionId}/checkins`, { status, note }).then((r) => r.data),

  listCheckins: (journeyId: string, resolutionId: string) =>
    api.get<Wrapped<CheckinsResponse>>(`/journeys/${journeyId}/resolutions/${resolutionId}/checkins`).then((r) => r.data),
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

  acknowledgeSidenote: (journeyId: string, type: ErcType, itemId: string) =>
    api
      .post<Wrapped<VmSidenote>>(`/journeys/${journeyId}/${type}s/${itemId}/sidenote/acknowledge`)
      .then((r) => r.data),

  // ── VM actions ──
  approve: (journeyId: string, type: ErcType, itemId: string) =>
    api.post<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s/${itemId}/approve`).then((r) => r.data),

  revisit: (journeyId: string, type: ErcType, itemId: string) =>
    api.post<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s/${itemId}/revisit`).then((r) => r.data),

  suggestSidenote: (journeyId: string, type: ErcType, itemId: string, text: string) =>
    api.post<Wrapped<VmSidenote>>(`/journeys/${journeyId}/${type}s/${itemId}/suggest`, { text }).then((r) => r.data),

  // ── Custom ERC ──
  createCustom: (journeyId: string, type: ErcType, data: CustomErcInput) =>
    api.post<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s/custom`, data).then((r) => r.data),

  submitForReview: (journeyId: string, type: ErcType, itemId: string) =>
    api.post<Wrapped<JourneyErcItem>>(`/journeys/${journeyId}/${type}s/${itemId}/submit-for-review`).then((r) => r.data),
};

export type CustomErcInput = {
  titleEn: string;
  descriptionEn?: string;
  // exposure
  tier?: 'LOCAL' | 'NATIONAL' | 'INTERNATIONAL';
  // resolution
  durationWeeks?: number;
  frequencyPerWeek?: number;
  frequencyLabel?: string;
  // challenge
  durationDays?: number;
};

export const journeysApi = {
  create: (data: { sentenceId: string; weaknessId: string; title?: string }) =>
    api.post<Wrapped<JourneyDetail>>('/journeys', data).then((r) => r.data),

  list: (cursor?: string) =>
    api.get<Wrapped<JourneyListResponse>>(cursor ? `/journeys?cursor=${cursor}` : '/journeys').then((r) => r.data),

  detail: (id: string) =>
    api.get<Wrapped<JourneyDetail>>(`/journeys/${id}`).then((r) => r.data),

  activity: (id: string) =>
    api.get<Wrapped<JourneyActivityEvent[]>>(`/journeys/${id}/activity`).then((r) => r.data),

  updateState: (id: string, action: 'pause' | 'resume') =>
    api.patch<Wrapped<{ id: string; state: JourneyState }>>(`/journeys/${id}/state`, { action }).then((r) => r.data),

  updateTitle: (id: string, title: string) =>
    api.patch<Wrapped<{ id: string; title: string }>>(`/journeys/${id}/title`, { title }).then((r) => r.data),

  complete: (id: string) =>
    api.post<Wrapped<{ id: string; state: JourneyState }>>(`/journeys/${id}/complete`).then((r) => r.data),

  completeApprove: (id: string) =>
    api.post<Wrapped<{ id: string; state: JourneyState }>>(`/journeys/${id}/complete/approve`).then((r) => r.data),
};
