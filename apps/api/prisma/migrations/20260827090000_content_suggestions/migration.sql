-- Content suggestions: propose content in the place it belongs.
--
-- Hand-written rather than generated. `prisma migrate dev` wanted to reset the development
-- database because an earlier migration was edited after being applied; resetting would have
-- destroyed the dev data the e2e suite runs against, which is not a price worth paying for a
-- generated file.

-- A new capability. Additive to the enum; nothing reads it until the code that follows ships.
-- Safe inside the migration transaction on PG12+ because the value is not USED here.
ALTER TYPE "capability" ADD VALUE IF NOT EXISTS 'content_suggest';

CREATE TYPE "suggestion_kind" AS ENUM ('add_section', 'edit_copy', 'add_field', 'remove', 'note');

-- 'shipped' is deliberately distinct from 'accepted': agreeing to a suggestion and it being live
-- are different facts, and collapsing them is how a register comes to claim work that has not
-- happened.
CREATE TYPE "suggestion_status" AS ENUM ('new', 'triaged', 'accepted', 'declined', 'shipped');

CREATE TABLE "content_suggestions" (
    "id"             UUID NOT NULL,
    "author_id"      UUID NOT NULL,
    "kind"           "suggestion_kind" NOT NULL,
    "status"         "suggestion_status" NOT NULL DEFAULT 'new',

    -- Where it was made. Four signals, ordered by how well they survive the page changing.
    "route"          TEXT NOT NULL,
    "url"            TEXT NOT NULL,
    "entity_type"    TEXT,
    "entity_id"      TEXT,
    "locale"         TEXT NOT NULL,
    "anchor_key"     TEXT,
    "anchor_text"    TEXT,
    "anchor_path"    TEXT,
    "viewport"       TEXT,

    -- What they propose.
    "title_en"       TEXT NOT NULL,
    "title_mr"       TEXT,
    "body_en"        JSONB,
    "body_mr"        JSONB,
    "current_text"   TEXT,

    -- Where it went.
    "resolution"     TEXT,
    "linked_issue"   TEXT,
    "linked_cms_key" TEXT,
    "triaged_by_id"  UUID,

    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_suggestions_pkey" PRIMARY KEY ("id")
);

-- The three ways anyone will ever look these up, plus the author's own list.
CREATE INDEX "content_suggestions_status_idx" ON "content_suggestions"("status");
CREATE INDEX "content_suggestions_entity_type_entity_id_idx" ON "content_suggestions"("entity_type", "entity_id");
CREATE INDEX "content_suggestions_route_idx" ON "content_suggestions"("route");
CREATE INDEX "content_suggestions_author_id_idx" ON "content_suggestions"("author_id");

-- CASCADE matches feedback_items: a deleted account takes its suggestions with it. An accepted
-- suggestion has already become a CmsPage, which does not cascade.
ALTER TABLE "content_suggestions"
    ADD CONSTRAINT "content_suggestions_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
