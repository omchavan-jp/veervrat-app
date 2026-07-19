import { api } from './client';

type Wrapped<T> = { data: T };

export type FeedbackItemType = 'ISSUE' | 'IMPROVEMENT' | 'MODIFICATION' | 'ADDITION';
export type FeedbackItemStatus = 'NEW' | 'TRIAGED' | 'DONE' | 'DECLINED';

export type FeedbackItem = {
  id: string;
  type: FeedbackItemType;
  status: FeedbackItemStatus;
  title: string;
  description: string | null;
  route: string | null;
  locale: string | null;
  commitSha: string | null;
  declineReason: string | null;
  createdAt: string;
  reporter: { id: string; displayName: string };
  upvoteCount: number;
  hasUpvoted: boolean;
};

export type FeedbackListResponse = {
  items: FeedbackItem[];
  nextCursor: string | null;
};

export type CreateFeedbackInput = {
  type: FeedbackItemType;
  title: string;
  description?: string;
  route?: string;
  locale?: string;
  viewport?: string;
  commitSha?: string;
};

export const feedbackApi = {
  list: (cursor?: string): Promise<FeedbackListResponse> => {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return api.get<Wrapped<FeedbackListResponse>>(`/feedback${params}`).then((r) => r.data);
  },

  create: (input: CreateFeedbackInput): Promise<FeedbackItem> =>
    api.post<Wrapped<FeedbackItem>>('/feedback', input).then((r) => r.data),

  toggleUpvote: (id: string): Promise<{ hasUpvoted: boolean; upvoteCount: number }> =>
    api
      .post<Wrapped<{ hasUpvoted: boolean; upvoteCount: number }>>(`/feedback/${id}/upvote`)
      .then((r) => r.data),
};
