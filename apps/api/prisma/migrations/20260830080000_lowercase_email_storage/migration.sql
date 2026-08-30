-- Store every address in one canonical form (#241).
--
-- Two paths wrote `users.email` differently: `requestEmailChange` always lowercased, `register`
-- and Google signup did not. So an exact-match lookup refused a correct address depending on
-- which path had last written it — and the refusal was the same message as a wrong password, so
-- nothing outside could tell the two apart.
--
-- The read was made case-insensitive as the immediate fix. That works and costs the index:
-- Prisma's `mode: 'insensitive'` compiles to ILIKE, which cannot use the btree index on `email`,
-- so every sign-in became a sequential scan. This migration is what lets the read go back to an
-- exact match.
--
-- ⚠️ A collision MUST fail this migration rather than merge two accounts. The unique constraints
-- on `users.email` and `auth_accounts (provider, provider_account_id)` do exactly that: if two
-- rows lower to the same value the UPDATE is rejected and the whole migration rolls back. That is
-- the correct outcome — two accounts differing only by case are two people, or one person with a
-- duplicate, and neither is something a migration should decide silently.
--
-- Measured before writing this, on 2026-08-30: zero collisions and zero mixed-case rows in either
-- UAT (10 users) or prod (2). So this is expected to be a no-op on today's data, and exists to
-- make the exact-match read safe rather than to repair anything.

UPDATE "users"
SET "email" = lower("email")
WHERE "email" <> lower("email");

-- Email accounts only. A google row's `provider_account_id` holds a googleId, not an address —
-- lowercasing one would silently detach that person from their own account, and the failure would
-- look like "Google sign-in stopped working" with nothing pointing here.
--
-- ⚠️ The literal is 'email', lowercase. Prisma's enum member is `EMAIL`, but it carries
-- `@map("email")`, so that name exists only in the client — the database never sees it. Written
-- as 'EMAIL' this raises 22P02 and rolls the migration back, which is how it was caught. Worth
-- noting that the loud failure is a property of the column being an enum: against a plain text
-- column the same mistake would have matched zero rows, reported success, and left every
-- mixed-case account unreachable the moment the exact-match read shipped.
UPDATE "auth_accounts"
SET "provider_account_id" = lower("provider_account_id")
WHERE "provider" = 'email'
  AND "provider_account_id" <> lower("provider_account_id");
