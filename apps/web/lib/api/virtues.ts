import { api } from './client';

type Wrapped<T> = { data: T };

export type VirtueSummary = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  description: string | null;
  subvirtueCount: number;
};

export type SubvirtueLite = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  description: string | null;
};

export type VirtueDetail = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  description: string | null;
  subvirtues: SubvirtueLite[];
};

export type NameRef = { id: string; nameEn: string; nameMr: string | null };

export type SubvirtueDetail = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  description: string | null;
  virtue: NameRef;
  weaknesses: NameRef[];
  sentences: { id: string; textEn: string; textMr: string | null }[];
};

export type SentenceInfo = {
  id: string;
  textEn: string;
  textMr: string | null;
  subvirtue: NameRef & { virtue: NameRef };
  hasActiveJourney: boolean;
};

export const virtuesApi = {
  list: () => api.get<Wrapped<VirtueSummary[]>>('/virtues').then((r) => r.data),
  getVirtue: (id: string) => api.get<Wrapped<VirtueDetail>>(`/virtues/${id}`).then((r) => r.data),
  getSubvirtue: (id: string) => api.get<Wrapped<SubvirtueDetail>>(`/subvirtues/${id}`).then((r) => r.data),
  getSentence: (id: string) => api.get<Wrapped<SentenceInfo>>(`/sentences/${id}`).then((r) => r.data),
};
