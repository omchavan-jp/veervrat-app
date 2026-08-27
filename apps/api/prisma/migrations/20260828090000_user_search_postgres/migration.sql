-- User search: pg_trgm GIN indexes on display_name and username.
-- pg_trgm is already enabled (20260614090133_add_trgm_entity_search_indexes).
-- These indexes accelerate ILIKE '%q%' and similarity() queries used by
-- UsersIndexService (replacing the Meilisearch-backed user search).

CREATE INDEX IF NOT EXISTS users_display_name_trgm ON "users" USING gin ("display_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_username_trgm ON "users" USING gin ("username" gin_trgm_ops);
