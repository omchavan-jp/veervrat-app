import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// A single autocomplete result. `label` is the primary (Devanagari-preferred) display
// text; `sublabel` is optional secondary context (e.g. the English name, or a parent).
export type EntitySearchHit = {
  entityType: string;
  entityId: string;
  label: string;
  sublabel: string | null;
};

// Trigram-ranked fuzzy search. Each query orders by greatest similarity across the
// entity's searchable columns and filters with a low similarity floor OR a substring
// match (so short prefixes still hit before trigram similarity becomes meaningful).
@Injectable()
export class EntitySearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchWeaknesses(q: string, limit: number): Promise<EntitySearchHit[]> {
    const like = `%${q}%`;
    return this.prisma.$queryRaw<EntitySearchHit[]>(Prisma.sql`
      SELECT 'weakness' AS "entityType", id AS "entityId",
             COALESCE(name_mr, name_en) AS label, name_en AS sublabel
      FROM weaknesses
      WHERE name_en ILIKE ${like} OR name_mr ILIKE ${like}
         OR similarity(name_en, ${q}) > 0.2 OR similarity(COALESCE(name_mr,''), ${q}) > 0.2
      ORDER BY GREATEST(similarity(name_en, ${q}), similarity(COALESCE(name_mr,''), ${q})) DESC
      LIMIT ${limit}
    `);
  }

  async searchVirtues(q: string, limit: number): Promise<EntitySearchHit[]> {
    const like = `%${q}%`;
    return this.prisma.$queryRaw<EntitySearchHit[]>(Prisma.sql`
      SELECT 'virtue' AS "entityType", id AS "entityId",
             COALESCE(name_mr, name_en) AS label, name_en AS sublabel
      FROM virtues
      WHERE name_en ILIKE ${like} OR name_mr ILIKE ${like}
         OR similarity(name_en, ${q}) > 0.2 OR similarity(COALESCE(name_mr,''), ${q}) > 0.2
      ORDER BY GREATEST(similarity(name_en, ${q}), similarity(COALESCE(name_mr,''), ${q})) DESC
      LIMIT ${limit}
    `);
  }

  async searchSubvirtues(q: string, limit: number): Promise<EntitySearchHit[]> {
    const like = `%${q}%`;
    return this.prisma.$queryRaw<EntitySearchHit[]>(Prisma.sql`
      SELECT 'subvirtue' AS "entityType", id AS "entityId",
             COALESCE(name_mr, name_en) AS label, name_en AS sublabel
      FROM subvirtues
      WHERE name_en ILIKE ${like} OR name_mr ILIKE ${like}
         OR similarity(name_en, ${q}) > 0.2 OR similarity(COALESCE(name_mr,''), ${q}) > 0.2
      ORDER BY GREATEST(similarity(name_en, ${q}), similarity(COALESCE(name_mr,''), ${q})) DESC
      LIMIT ${limit}
    `);
  }

  async searchSentences(q: string, limit: number): Promise<EntitySearchHit[]> {
    const like = `%${q}%`;
    return this.prisma.$queryRaw<EntitySearchHit[]>(Prisma.sql`
      SELECT 'sentence' AS "entityType", id AS "entityId",
             COALESCE(text_mr, text_en) AS label, text_en AS sublabel
      FROM sentences
      WHERE text_en ILIKE ${like} OR text_mr ILIKE ${like}
         OR similarity(text_en, ${q}) > 0.2 OR similarity(COALESCE(text_mr,''), ${q}) > 0.2
      ORDER BY GREATEST(similarity(text_en, ${q}), similarity(COALESCE(text_mr,''), ${q})) DESC
      LIMIT ${limit}
    `);
  }

  // Journeys are private — only the caller's own journeys are referenceable.
  async searchOwnJourneys(q: string, userId: string, limit: number): Promise<EntitySearchHit[]> {
    const like = `%${q}%`;
    return this.prisma.$queryRaw<EntitySearchHit[]>(Prisma.sql`
      SELECT 'journey' AS "entityType", id AS "entityId", title AS label, NULL AS sublabel
      FROM journeys
      WHERE vratarthi_id = ${userId}::uuid AND deleted_at IS NULL
        AND (title ILIKE ${like} OR similarity(title, ${q}) > 0.2)
      ORDER BY similarity(title, ${q}) DESC
      LIMIT ${limit}
    `);
  }

  // ERC items the caller can reference: those belonging to their own journeys.
  async searchOwnErcItems(q: string, userId: string, limit: number): Promise<EntitySearchHit[]> {
    const like = `%${q}%`;
    return this.prisma.$queryRaw<EntitySearchHit[]>(Prisma.sql`
      SELECT * FROM (
        SELECT 'exposure' AS "entityType", je.id AS "entityId",
               COALESCE(je.title_mr, je.title_en) AS label, je.title_en AS sublabel,
               GREATEST(similarity(je.title_en, ${q}), similarity(COALESCE(je.title_mr,''), ${q})) AS score
        FROM journey_exposures je JOIN journeys j ON j.id = je.journey_id
        WHERE j.vratarthi_id = ${userId}::uuid AND (je.title_en ILIKE ${like} OR je.title_mr ILIKE ${like} OR similarity(je.title_en, ${q}) > 0.2)
        UNION ALL
        SELECT 'resolution' AS "entityType", jr.id AS "entityId",
               COALESCE(jr.title_mr, jr.title_en) AS label, jr.title_en AS sublabel,
               GREATEST(similarity(jr.title_en, ${q}), similarity(COALESCE(jr.title_mr,''), ${q})) AS score
        FROM journey_resolutions jr JOIN journeys j ON j.id = jr.journey_id
        WHERE j.vratarthi_id = ${userId}::uuid AND (jr.title_en ILIKE ${like} OR jr.title_mr ILIKE ${like} OR similarity(jr.title_en, ${q}) > 0.2)
        UNION ALL
        SELECT 'challenge' AS "entityType", jc.id AS "entityId",
               COALESCE(jc.title_mr, jc.title_en) AS label, jc.title_en AS sublabel,
               GREATEST(similarity(jc.title_en, ${q}), similarity(COALESCE(jc.title_mr,''), ${q})) AS score
        FROM journey_challenges jc JOIN journeys j ON j.id = jc.journey_id
        WHERE j.vratarthi_id = ${userId}::uuid AND (jc.title_en ILIKE ${like} OR jc.title_mr ILIKE ${like} OR similarity(jc.title_en, ${q}) > 0.2)
      ) hits
      ORDER BY score DESC
      LIMIT ${limit}
    `);
  }
}
