import { api } from './client';
import type { TiptapDoc } from '@/components/chat/message-content';

type Wrapped<T> = { data: T };

export type BlogAuthor = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

export type BlogComment = {
  id: string;
  blogId: string;
  authorId: string;
  body: string;
  isHidden: boolean;
  reportedAt: string | null;
  createdAt: string;
  author: BlogAuthor;
};

export type Blog = {
  id: string;
  authorId: string;
  title: string;
  body: TiptapDoc;
  isDraft: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: BlogAuthor;
};

export type BlogWithComments = Blog & { comments: BlogComment[] };

export type BlogListResponse = { items: Blog[]; nextCursor: string | null };

export const blogsApi = {
  create: (input: { title: string; body: TiptapDoc }) =>
    api.post<Wrapped<Blog>>('/blogs', input).then((r) => r.data),

  update: (id: string, input: { title?: string; body?: TiptapDoc; isDraft?: boolean }) =>
    api.patch<Wrapped<Blog>>(`/blogs/${id}`, input).then((r) => r.data),

  remove: (id: string) => api.delete<Wrapped<{ id: string }>>(`/blogs/${id}`).then((r) => r.data),

  list: (cursor?: string) =>
    api.get<Wrapped<BlogListResponse>>(cursor ? `/blogs?cursor=${cursor}` : '/blogs').then((r) => r.data),

  listMine: (cursor?: string) =>
    api.get<Wrapped<BlogListResponse>>(cursor ? `/blogs/mine?cursor=${cursor}` : '/blogs/mine').then((r) => r.data),

  getOne: (id: string) => api.get<Wrapped<BlogWithComments>>(`/blogs/${id}`).then((r) => r.data),

  search: (q: string) =>
    api.get<Wrapped<Blog[]>>(`/blogs/search?q=${encodeURIComponent(q)}`).then((r) => r.data),

  addComment: (blogId: string, body: string) =>
    api.post<Wrapped<BlogComment>>(`/blogs/${blogId}/comments`, { body }).then((r) => r.data),

  deleteComment: (blogId: string, cid: string) =>
    api.delete<Wrapped<{ id: string }>>(`/blogs/${blogId}/comments/${cid}`).then((r) => r.data),

  hideComment: (blogId: string, cid: string) =>
    api.post<Wrapped<BlogComment>>(`/blogs/${blogId}/comments/${cid}/hide`).then((r) => r.data),

  reportComment: (blogId: string, cid: string) =>
    api.post<Wrapped<{ id: string; reported: boolean }>>(`/blogs/${blogId}/comments/${cid}/report`).then((r) => r.data),
};
