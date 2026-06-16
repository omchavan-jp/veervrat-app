import { api } from './client';

type Wrapped<T> = { data: T };

export type ErcEntityType = 'EXPOSURE' | 'RESOLUTION' | 'CHALLENGE';

export type ModSubmitter = { id: string; displayName: string; username: string; avatarUrl: string | null };

export type ModQueueItem = {
  id: string;
  entityType: ErcEntityType;
  title: string;
  submitter: ModSubmitter | null;
  createdAt: string;
};

export type NameRef = { nameEn: string; nameMr: string | null };

export type ModReviewDetail = {
  id: string;
  ercType: 'exposure' | 'resolution' | 'challenge';
  status: string;
  reviewNote: string | null;
  submitter: ModSubmitter | null;
  item: {
    id: string;
    journeyId: string;
    titleEn: string;
    titleMr: string | null;
    descriptionEn: string | null;
    descriptionMr: string | null;
    tier?: string;
    durationWeeks?: number | null;
    frequencyPerWeek?: number | null;
    frequencyLabel?: string | null;
    durationDays?: number | null;
  };
  journey: {
    id: string;
    title: string;
    sentence: { textEn: string; textMr: string | null; subvirtue: NameRef & { virtue: NameRef } };
    weaknesses: { id: string; nameEn: string; nameMr: string | null }[];
  } | null;
};

export type CustomErcEdits = {
  titleEn?: string;
  descriptionEn?: string;
  durationWeeks?: number;
  frequencyPerWeek?: number;
  frequencyLabel?: string;
  durationDays?: number;
};

export const moderationApi = {
  getQueue: (cursor?: string) =>
    api
      .get<Wrapped<{ items: ModQueueItem[]; nextCursor: string | null }>>(
        cursor ? `/moderation/custom-erc?cursor=${cursor}` : '/moderation/custom-erc',
      )
      .then((r) => r.data),

  getDetail: (id: string) =>
    api.get<Wrapped<ModReviewDetail>>(`/moderation/custom-erc/${id}`).then((r) => r.data),

  approve: (id: string, edits?: CustomErcEdits) =>
    api.post<Wrapped<{ id: string; status: string; poolId: string }>>(`/moderation/custom-erc/${id}/approve`, edits ? { edits } : {}).then((r) => r.data),

  reject: (id: string, reason: string) =>
    api.post<Wrapped<{ id: string; status: string }>>(`/moderation/custom-erc/${id}/reject`, { reason }).then((r) => r.data),
};
