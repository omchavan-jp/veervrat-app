import { api } from './client';

type Wrapped<T> = { data: T };

export type TestDraft = {
  id: string;
  weaknessId: string;
  isDraft: boolean;
  answeredCount: number;
  totalSentences: number;
  existed: boolean;
};

export type ReportSentence = {
  sentenceId: string;
  textEn: string;
  textMr: string | null;
  score: number | null;
  subvirtueId: string;
  subvirtueNameEn: string;
  subvirtueNameMr: string | null;
  virtueId: string;
  virtueNameEn: string;
  virtueNameMr: string | null;
};

export type VirtueExplore = {
  virtueId: string;
  virtueNameEn: string;
  virtueNameMr: string | null;
};

export type TestReport = {
  id: string;
  weaknessId: string;
  weaknessNameEn: string;
  weaknessNameMr: string | null;
  submittedAt: string;
  totalSentences: number;
  answeredCount: number;
  virtuesToExplore: VirtueExplore[];
  flaggedSentences: ReportSentence[];
  otherSentences: ReportSentence[];
};

export type TestDetail = {
  id: string;
  userId: string;
  weaknessId: string;
  isDraft: boolean;
  submittedAt: string | null;
  answers: { id: string; sentenceId: string; score: number }[];
};

export const testsApi = {
  getTest: (testId: string) => api.get<Wrapped<TestDetail>>(`/tests/${testId}`).then((r) => r.data),

  createOrResume: (weaknessId: string) =>
    api.post<Wrapped<TestDraft>>('/tests', { weaknessId }).then((r) => r.data),

  saveAnswers: (testId: string, answers: { sentenceId: string; score: number }[]) =>
    api
      .patch<
        Wrapped<{ id: string; answeredCount: number }>
      >(`/tests/${testId}/answers`, { answers })
      .then((r) => r.data),

  submit: (testId: string) =>
    api
      .post<
        Wrapped<{ id: string; isDraft: boolean; submittedAt: string }>
      >(`/tests/${testId}/submit`)
      .then((r) => r.data),

  report: (testId: string) =>
    api.get<Wrapped<TestReport>>(`/tests/${testId}/report`).then((r) => r.data),
};
