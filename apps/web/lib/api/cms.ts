import { api } from './client';
import type { TiptapDoc } from '@/components/chat/message-content';

type Wrapped<T> = { data: T };

export type CmsPage = {
  id: string;
  key: string;
  titleEn: string;
  titleMr: string | null;
  bodyEn: TiptapDoc;
  bodyMr: TiptapDoc | null;
  updatedAt: string;
};

export type CmsPageInput = {
  key: string;
  titleEn: string;
  titleMr?: string;
  bodyEn: TiptapDoc;
  bodyMr?: TiptapDoc;
};

export const cmsApi = {
  // Public read; resolves to null on 404 so callers can fall back to default copy.
  getByKey: (key: string) =>
    api
      .get<Wrapped<CmsPage>>(`/cms-pages/${key}`)
      .then((r) => r.data)
      .catch(() => null),

  list: () => api.get<Wrapped<CmsPage[]>>('/admin/cms-pages').then((r) => r.data),
  upsert: (b: CmsPageInput) =>
    api.post<Wrapped<CmsPage>>('/admin/cms-pages', b).then((r) => r.data),
  remove: (key: string) =>
    api.delete<Wrapped<{ id: string }>>(`/admin/cms-pages/${key}`).then((r) => r.data),
};
