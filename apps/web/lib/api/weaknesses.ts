import { api } from './client';

type Wrapped<T> = { data: T };

export type WeaknessStats = {
  testsTaken: number;
  hasActiveJourney: boolean;
};

export type WeaknessSummary = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  category: string;
  description: string | null;
  stats: WeaknessStats | null;
};

export type WeaknessCluster = {
  key: string;
  label: string;
  weaknesses: WeaknessSummary[];
};

export type WeaknessListResponse = {
  clusters: WeaknessCluster[];
};

export type SentenceDetail = {
  sentenceId: string;
  textEn: string;
  textMr: string | null;
};

export type SubvirtueDetail = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  description: string | null;
  priority: number;
  virtue: { id: string; nameEn: string; nameMr: string | null };
  sentences: SentenceDetail[];
};

export type TestHistoryItem = {
  id: string;
  submittedAt: string;
  answeredCount: number;
  totalSentences: number;
};

export type WeaknessDetailResponse = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  category: string;
  description: string | null;
  subvirtues: SubvirtueDetail[];
  testHistory: TestHistoryItem[];
  draftTestId: string | null;
};

export const weaknessesApi = {
  list: () => api.get<Wrapped<WeaknessListResponse>>('/weaknesses').then((r) => r.data),

  detail: (id: string) =>
    api.get<Wrapped<WeaknessDetailResponse>>(`/weaknesses/${id}`).then((r) => r.data),
};
