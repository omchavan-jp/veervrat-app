import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { TiptapDoc } from '../../common/tiptap/sanitize';

const AUTHOR_SELECT = {
  select: { id: true, displayName: true, username: true, avatarUrl: true },
} as const;

const BLOG_SELECT = {
  id: true,
  authorId: true,
  title: true,
  body: true,
  isDraft: true,
  featured: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: AUTHOR_SELECT,
} as const;

const COMMENT_SELECT = {
  id: true,
  blogId: true,
  authorId: true,
  body: true,
  isHidden: true,
  reportedAt: true,
  createdAt: true,
  author: AUTHOR_SELECT,
} as const;

@Injectable()
export class BlogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Blogs ───────────────────────────────────────────────────────────────────

  async create(authorId: string, title: string, body: TiptapDoc) {
    return this.prisma.blog.create({
      data: { authorId, title, body: body as unknown as Prisma.InputJsonValue, isDraft: true },
      select: BLOG_SELECT,
    });
  }

  async findById(id: string) {
    return this.prisma.blog.findFirst({ where: { id, deletedAt: null }, select: BLOG_SELECT });
  }

  async update(
    id: string,
    data: { title?: string; body?: TiptapDoc; isDraft?: boolean; publishedAt?: Date },
  ) {
    return this.prisma.blog.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.body !== undefined ? { body: data.body as unknown as Prisma.InputJsonValue } : {}),
        ...(data.isDraft !== undefined ? { isDraft: data.isDraft } : {}),
        ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
      },
      select: BLOG_SELECT,
    });
  }

  async softDelete(id: string) {
    return this.prisma.blog.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async findPublishedList(cursor?: string, featured?: boolean) {
    const items = await this.prisma.blog.findMany({
      where: { isDraft: false, deletedAt: null, ...(featured ? { featured: true } : {}) },
      select: BLOG_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = items.length === 20 ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async findOwnList(authorId: string, cursor?: string) {
    const items = await this.prisma.blog.findMany({
      where: { authorId, deletedAt: null },
      select: BLOG_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = items.length === 20 ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async findManyPublishedByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.blog.findMany({
      where: { id: { in: ids }, isDraft: false, deletedAt: null },
      select: BLOG_SELECT,
    });
  }

  // All published blogs, shaped for the search index seed.
  async listPublishedForIndex() {
    return this.prisma.blog.findMany({
      where: { isDraft: false, deletedAt: null },
      select: { id: true, title: true, body: true },
    });
  }

  // ─── Comments ──────────────────────────────────────────────────────────────────

  async createComment(blogId: string, authorId: string, body: string) {
    return this.prisma.blogComment.create({
      data: { blogId, authorId, body },
      select: COMMENT_SELECT,
    });
  }

  async findCommentById(id: string) {
    return this.prisma.blogComment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, blogId: true, authorId: true, isHidden: true, reportedAt: true },
    });
  }

  // Viewer-aware: hidden comments are excluded for everyone except their own author.
  async listComments(blogId: string, viewerId: string | null) {
    return this.prisma.blogComment.findMany({
      where: {
        blogId,
        deletedAt: null,
        ...(viewerId ? { OR: [{ isHidden: false }, { authorId: viewerId }] } : { isHidden: false }),
      },
      select: COMMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async softDeleteComment(id: string) {
    return this.prisma.blogComment.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async hideComment(id: string, hiddenById: string) {
    return this.prisma.blogComment.update({
      where: { id },
      data: { isHidden: true, hiddenById },
      select: COMMENT_SELECT,
    });
  }

  async markCommentReported(id: string) {
    return this.prisma.blogComment.update({
      where: { id },
      data: { reportedAt: new Date() },
      select: { id: true, reportedAt: true },
    });
  }

  // Moderator/admin recipient ids for report notifications.
  async findModeratorIds(): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { role: { in: [Role.MODERATOR, Role.ADMIN] } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((r) => r.userId);
  }
}
