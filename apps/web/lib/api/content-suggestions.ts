import { api } from './client';

type Wrapped<T> = { data: T };

export type SuggestionKind = 'ADD_SECTION' | 'EDIT_COPY' | 'ADD_FIELD' | 'REMOVE' | 'NOTE';
export type SuggestionStatus = 'NEW' | 'TRIAGED' | 'ACCEPTED' | 'DECLINED' | 'SHIPPED';

export type ContentSuggestion = {
  id: string;
  authorId: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  route: string;
  url: string;
  entityType: string | null;
  entityId: string | null;
  locale: string;
  anchorKey: string | null;
  anchorText: string | null;
  anchorPath: string | null;
  titleEn: string;
  titleMr: string | null;
  bodyEn: unknown | null;
  bodyMr: unknown | null;
  currentText: string | null;
  resolution: string | null;
  linkedIssue: string | null;
  linkedCmsKey: string | null;
  createdAt: string;
  author?: { displayName: string; username: string };
};

export type CreateSuggestionInput = {
  kind: SuggestionKind;
  route: string;
  url: string;
  entityType?: string;
  entityId?: string;
  locale: string;
  anchorKey?: string;
  anchorText?: string;
  anchorPath?: string;
  viewport?: string;
  titleEn: string;
  titleMr?: string;
  bodyEn?: Record<string, unknown>;
  bodyMr?: Record<string, unknown>;
  currentText?: string;
};

export type TriageInput = {
  status: SuggestionStatus;
  resolution?: string;
  linkedIssue?: string;
  linkedCmsKey?: string;
};

export const contentSuggestionsApi = {
  create: (input: CreateSuggestionInput) =>
    api.post<Wrapped<ContentSuggestion>>('/content-suggestions', input).then((r) => r.data),

  // No arguments: every suggestion this person has made. With a route (and entity), only the
  // ones on that page — which is what a page load asks in order to draw the pins.
  mine: (scope?: { route: string; entityId?: string | null }) => {
    const qs = scope
      ? `?${new URLSearchParams({
          route: scope.route,
          ...(scope.entityId ? { entityId: scope.entityId } : {}),
        }).toString()}`
      : '';
    return api
      .get<Wrapped<ContentSuggestion[]>>(`/content-suggestions/mine${qs}`)
      .then((r) => r.data);
  },

  // Admin only — every suggestion, whoever made it.
  list: (filter?: { status?: SuggestionStatus; route?: string; entityType?: string }) => {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.route) params.set('route', filter.route);
    if (filter?.entityType) params.set('entityType', filter.entityType);
    const qs = params.toString();
    return api
      .get<Wrapped<ContentSuggestion[]>>(`/content-suggestions${qs ? `?${qs}` : ''}`)
      .then((r) => r.data);
  },

  triage: (id: string, input: TriageInput) =>
    api.patch<Wrapped<ContentSuggestion>>(`/content-suggestions/${id}`, input).then((r) => r.data),
};
