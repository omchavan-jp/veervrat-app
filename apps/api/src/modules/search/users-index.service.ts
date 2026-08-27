import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const USERS_INDEX = 'users';

// A document in the users search index. Deliberately NO email — emails are never
// indexed (privacy); exact-email lookup is a strongly-consistent DB query elsewhere.
export type UserIndexDoc = {
  id: string;
  username: string;
  displayName: string;
  isPublic: boolean;
};

// Trigram-ranked fuzzy user search using Postgres pg_trgm — replaces the earlier
// Meilisearch-backed implementation. The index maintenance methods (upsert/remove)
// are now no-ops: there is no secondary index to sync, the users table IS the index.
// Callers that call upsert/remove continue to compile; removing those call sites is
// a follow-up scope item (#194 item 4).
@Injectable()
export class UsersIndexService {
  private readonly logger = new Logger('UsersIndexService');

  constructor(private readonly prisma: PrismaService) {}

  // No-op: with Postgres search, there is no secondary index to maintain.
  // Kept so existing call sites (auth.service, users.service) do not break.
  async upsert(_doc: UserIndexDoc): Promise<void> {
    // Intentional no-op — the users table is the source of truth for search.
  }

  // No-op: same reason as upsert.
  async remove(_id: string): Promise<void> {
    // Intentional no-op.
  }

  // Typo-tolerant name/username search using pg_trgm similarity. Excludes private
  // profiles, soft-deleted users, and the requester. Returns matched user IDs in
  // relevance order — the consuming service re-hydrates full user data from the DB.
  async search(query: string, requesterId: string, limit = 10): Promise<string[]> {
    if (!query.trim()) return [];

    try {
      const like = `%${query}%`;
      const hits = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id
        FROM users
        WHERE deleted_at IS NULL
          AND profile_private = false
          AND id != ${requesterId}::uuid
          AND (
            display_name ILIKE ${like}
            OR username ILIKE ${like}
            OR similarity(display_name, ${query}) > 0.2
            OR similarity(username, ${query}) > 0.2
          )
        ORDER BY GREATEST(
          similarity(display_name, ${query}),
          similarity(username, ${query})
        ) DESC
        LIMIT ${limit}
      `);
      return hits.map((h) => h.id);
    } catch (error) {
      this.logger.warn({
        msg: 'users search failed',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
