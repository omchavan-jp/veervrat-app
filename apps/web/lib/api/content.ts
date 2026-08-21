import { api } from './client';
import type { TiptapDoc } from '@/components/chat/message-content';

type Wrapped<T> = { data: T };

export type Shloka = {
  id: string;
  devanagariText: string;
  transliteration: string | null;
  meaningEn: string | null;
  meaningMr: string | null;
  sourceCitation: string | null;
  looseTags: string[];
};

export type ResolvedTag = { entityType: string; entityId: string; name: string | null };

export type ShlokaDetail = Shloka & { formalTags: ResolvedTag[] };

export type PothiSection = {
  id: string;
  sectionNumber: number;
  titleEn: string;
  titleMr: string | null;
  introText: string | null;
  congregationResponse: string | null;
  postShlokaCommentary: string | null;
  shlokas: Shloka[];
};

export type ResourceSummary = {
  id: string;
  type: 'FILE' | 'LINK';
  url: string | null;
  thumbnailUrl: string | null;
  title: string;
  oneLiner: string | null;
  looseTags: string[];
};

export type ResourceDetail = ResourceSummary & {
  filePath: string | null;
  description: TiptapDoc | null;
  formalTags: ResolvedTag[];
};

export type Paginated<T> = { items: T[]; nextCursor: string | null };

export const contentApi = {
  pothiSections: () => api.get<Wrapped<PothiSection[]>>('/pothi/sections').then((r) => r.data),

  shlokas: (source?: string, cursor?: string) => {
    const q = new URLSearchParams();
    if (source) q.set('source', source);
    if (cursor) q.set('cursor', cursor);
    const qs = q.toString();
    return api.get<Wrapped<Paginated<Shloka>>>(`/shlokas${qs ? `?${qs}` : ''}`).then((r) => r.data);
  },

  searchShlokas: (qq: string) =>
    api.get<Wrapped<Shloka[]>>(`/shlokas/search?q=${encodeURIComponent(qq)}`).then((r) => r.data),

  shloka: (id: string) => api.get<Wrapped<ShlokaDetail>>(`/shlokas/${id}`).then((r) => r.data),

  today: () => api.get<Wrapped<Shloka | null>>('/shlokas/today').then((r) => r.data),

  resources: (type?: 'FILE' | 'LINK', cursor?: string) => {
    const q = new URLSearchParams();
    if (type) q.set('type', type);
    if (cursor) q.set('cursor', cursor);
    const qs = q.toString();
    return api
      .get<Wrapped<Paginated<ResourceSummary>>>(`/resources${qs ? `?${qs}` : ''}`)
      .then((r) => r.data);
  },

  resource: (id: string) =>
    api.get<Wrapped<ResourceDetail>>(`/resources/${id}`).then((r) => r.data),
};
