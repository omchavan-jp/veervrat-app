import { api } from './client';
import type { TiptapDoc } from '@/components/chat/message-content';

type Wrapped<T> = { data: T };

export type ExperienceVisibility = 'ONLY_ME' | 'FRIENDS' | 'PUBLIC';

export type ExperienceTagEntityType =
  | 'VIRTUE'
  | 'SUBVIRTUE'
  | 'WEAKNESS'
  | 'SENTENCE'
  | 'EXPOSURE'
  | 'RESOLUTION'
  | 'CHALLENGE'
  | 'JOURNEY';

export type ExperienceTag = {
  id?: string;
  entityType: ExperienceTagEntityType;
  entityId: string;
};

export type ExperienceAuthor = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

export type ExperienceLog = {
  id: string;
  authorId: string;
  journeyId: string | null;
  body: TiptapDoc;
  visibility: ExperienceVisibility;
  isDraft: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: ExperienceAuthor;
  tags: ExperienceTag[];
};

export type ExperienceListResponse = {
  items: ExperienceLog[];
  nextCursor: string | null;
};

export type CreateExperienceInput = {
  body: TiptapDoc;
  journeyId?: string;
  tags?: { entityType: ExperienceTagEntityType; entityId: string }[];
};

export type UpdateExperienceInput = {
  body?: TiptapDoc;
  visibility?: ExperienceVisibility;
  isDraft?: boolean;
  tags?: { entityType: ExperienceTagEntityType; entityId: string }[];
};

export const experienceLogsApi = {
  create: (input: CreateExperienceInput) =>
    api.post<Wrapped<ExperienceLog>>('/experience-logs', input).then((r) => r.data),

  update: (id: string, input: UpdateExperienceInput) =>
    api.patch<Wrapped<ExperienceLog>>(`/experience-logs/${id}`, input).then((r) => r.data),

  remove: (id: string) =>
    api.delete<Wrapped<{ id: string }>>(`/experience-logs/${id}`).then((r) => r.data),

  getMine: (cursor?: string) =>
    api
      .get<Wrapped<ExperienceListResponse>>(
        cursor ? `/experience-logs?cursor=${cursor}` : '/experience-logs',
      )
      .then((r) => r.data),

  getOne: (id: string) =>
    api.get<Wrapped<ExperienceLog>>(`/experience-logs/${id}`).then((r) => r.data),

  getPublic: (cursor?: string) =>
    api
      .get<Wrapped<ExperienceListResponse>>(
        cursor ? `/experience-logs/public?cursor=${cursor}` : '/experience-logs/public',
      )
      .then((r) => r.data),
};
