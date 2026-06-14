-- Entity-reference (@/#) autocomplete uses trigram similarity for typo-tolerant,
-- substring-friendly fuzzy matching. pg_trgm + GIN indexes keep ILIKE '%q%' and
-- similarity() queries fast as the content tables grow. (When Meilisearch is wired
-- in a later item, the search service can switch backends behind the same API.)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Weakness (name_en + name_mr)
CREATE INDEX IF NOT EXISTS weaknesses_name_en_trgm ON "weaknesses" USING gin ("name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS weaknesses_name_mr_trgm ON "weaknesses" USING gin ("name_mr" gin_trgm_ops);

-- Virtue
CREATE INDEX IF NOT EXISTS virtues_name_en_trgm ON "virtues" USING gin ("name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS virtues_name_mr_trgm ON "virtues" USING gin ("name_mr" gin_trgm_ops);

-- Subvirtue
CREATE INDEX IF NOT EXISTS subvirtues_name_en_trgm ON "subvirtues" USING gin ("name_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS subvirtues_name_mr_trgm ON "subvirtues" USING gin ("name_mr" gin_trgm_ops);

-- Sentence (text_en + text_mr)
CREATE INDEX IF NOT EXISTS sentences_text_en_trgm ON "sentences" USING gin ("text_en" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS sentences_text_mr_trgm ON "sentences" USING gin ("text_mr" gin_trgm_ops);

-- Journey (title) — scoped per-user at query time
CREATE INDEX IF NOT EXISTS journeys_title_trgm ON "journeys" USING gin ("title" gin_trgm_ops);
