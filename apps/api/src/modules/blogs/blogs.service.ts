import { Injectable, BadRequestException, Logger, type OnModuleInit } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { BlogsRepository } from './blogs.repository';
import { BlogsIndexService } from '../search/blogs-index.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  sanitizeTiptapDoc,
  tiptapToPlainText,
  InvalidTiptapContentError,
  type TiptapDoc,
} from '../../common/tiptap/sanitize';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import type { CreateBlogDto } from './dto/create-blog.dto';
import type { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogsService implements OnModuleInit {
  private readonly logger = new Logger('BlogsService');

  constructor(
    private readonly repository: BlogsRepository,
    private readonly blogsIndex: BlogsIndexService,
    private readonly notifications: NotificationsService,
  ) {}

  // Seed the search index with existing published blogs so search works without a
  // manual reindex (bounded; fine at current scale).
  async onModuleInit(): Promise<void> {
    try {
      const blogs = await this.repository.listPublishedForIndex();
      await Promise.all(
        blogs.map((b) =>
          this.blogsIndex.upsert({ id: b.id, title: b.title, bodyText: tiptapToPlainText(b.body) }),
        ),
      );
    } catch (error) {
      this.logger.warn({
        msg: 'blog index seed failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private sanitize(body: unknown): TiptapDoc {
    try {
      return sanitizeTiptapDoc(body);
    } catch (err) {
      if (err instanceof InvalidTiptapContentError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  private syncIndex(blog: { id: string; title: string; body: unknown; isDraft: boolean }): void {
    if (blog.isDraft) {
      void this.blogsIndex.remove(blog.id);
    } else {
      void this.blogsIndex.upsert({
        id: blog.id,
        title: blog.title,
        bodyText: tiptapToPlainText(blog.body),
      });
    }
  }

  // ─── Blogs ───────────────────────────────────────────────────────────────────

  async create(user: SessionUser, dto: CreateBlogDto) {
    if (!hasPermission(user, { type: 'platform' }, 'blog.create'))
      throw new AccessDeniedException();
    const body = this.sanitize(dto.body);
    return this.repository.create(user.id, dto.title, body);
  }

  async update(user: SessionUser, id: string, dto: UpdateBlogDto) {
    const blog = await this.repository.findById(id);
    if (!blog) throw new EntityNotFoundException('Blog', id);
    if (!hasPermission(user, { type: 'blog', blog: { authorId: blog.authorId } }, 'blog.edit')) {
      throw new AccessDeniedException();
    }

    const publishing = dto.isDraft === false && blog.isDraft;
    const updated = await this.repository.update(id, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.body !== undefined ? { body: this.sanitize(dto.body) } : {}),
      ...(dto.isDraft !== undefined ? { isDraft: dto.isDraft } : {}),
      ...(publishing ? { publishedAt: new Date() } : {}),
    });
    this.syncIndex(updated);
    return updated;
  }

  async remove(user: SessionUser, id: string) {
    const blog = await this.repository.findById(id);
    if (!blog) throw new EntityNotFoundException('Blog', id);
    if (!hasPermission(user, { type: 'blog', blog: { authorId: blog.authorId } }, 'blog.delete')) {
      throw new AccessDeniedException();
    }
    await this.repository.softDelete(id);
    void this.blogsIndex.remove(id);
    return { id };
  }

  async list(cursor?: string, featured?: boolean) {
    return this.repository.findPublishedList(cursor, featured);
  }

  async listMine(user: SessionUser, cursor?: string) {
    return this.repository.findOwnList(user.id, cursor);
  }

  async getOne(user: SessionUser | undefined, id: string) {
    const blog = await this.repository.findById(id);
    if (!blog) throw new EntityNotFoundException('Blog', id);
    // Drafts are visible only to their author.
    if (blog.isDraft && blog.authorId !== user?.id) throw new EntityNotFoundException('Blog', id);
    const comments = await this.repository.listComments(id, user?.id ?? null);
    return { ...blog, comments };
  }

  async search(query: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    const ids = await this.blogsIndex.search(q);
    if (ids.length === 0) return [];
    const blogs = await this.repository.findManyPublishedByIds(ids);
    const byId = new Map(blogs.map((b) => [b.id, b]));
    return ids.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => !!b);
  }

  // ─── Comments ──────────────────────────────────────────────────────────────────

  async addComment(user: SessionUser, blogId: string, body: string) {
    if (!hasPermission(user, { type: 'platform' }, 'comment.create'))
      throw new AccessDeniedException();
    const blog = await this.repository.findById(blogId);
    if (!blog || blog.isDraft) throw new EntityNotFoundException('Blog', blogId);

    const comment = await this.repository.createComment(blogId, user.id, body);
    // Notify the blog author of a new comment (unless they commented on their own blog).
    if (blog.authorId !== user.id) {
      void this.notifications.create(
        blog.authorId,
        user.id,
        NotificationEventType.BLOG_COMMENT_NEW,
        'blog',
        blogId,
      );
    }
    return comment;
  }

  async deleteComment(user: SessionUser, blogId: string, commentId: string) {
    const { comment, blog } = await this.loadCommentContext(blogId, commentId);
    if (
      !hasPermission(
        user,
        {
          type: 'blog_comment',
          blog: { authorId: blog.authorId },
          comment: { blogId, authorId: comment.authorId },
        },
        'comment.delete',
      )
    ) {
      throw new AccessDeniedException();
    }
    await this.repository.softDeleteComment(commentId);
    return { id: commentId };
  }

  async hideComment(user: SessionUser, blogId: string, commentId: string) {
    const { comment, blog } = await this.loadCommentContext(blogId, commentId);
    if (
      !hasPermission(
        user,
        {
          type: 'blog_comment',
          blog: { authorId: blog.authorId },
          comment: { blogId, authorId: comment.authorId },
        },
        'comment.hide',
      )
    ) {
      throw new AccessDeniedException();
    }
    return this.repository.hideComment(commentId, user.id);
  }

  async reportComment(user: SessionUser, blogId: string, commentId: string) {
    if (!hasPermission(user, { type: 'platform' }, 'comment.report'))
      throw new AccessDeniedException();
    const { comment } = await this.loadCommentContext(blogId, commentId);
    if (comment.reportedAt) return { id: commentId, reported: true }; // idempotent

    await this.repository.markCommentReported(commentId);
    const moderatorIds = await this.repository.findModeratorIds();
    await Promise.all(
      moderatorIds.map((modId) =>
        this.notifications.create(
          modId,
          user.id,
          NotificationEventType.COMMENT_REPORTED,
          'blog_comment',
          commentId,
        ),
      ),
    );
    return { id: commentId, reported: true };
  }

  private async loadCommentContext(blogId: string, commentId: string) {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment || comment.blogId !== blogId)
      throw new EntityNotFoundException('BlogComment', commentId);
    const blog = await this.repository.findById(blogId);
    if (!blog) throw new EntityNotFoundException('Blog', blogId);
    return { comment, blog };
  }
}
