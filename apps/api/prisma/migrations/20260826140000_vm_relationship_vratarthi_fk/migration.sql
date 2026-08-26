-- A foreign key on vm_relationships.vratarthi_id, which never had one.
--
-- The table has `vm_relationships_vm_id_fkey` and nothing for the other side. The cause is
-- visible in the Prisma model: it declares a relation for the vratmitra (`vm User @relation(
-- "GlobalVM", ...)`) and none for the vratarthi, so only that side got a constraint. The
-- asymmetry is almost certainly an oversight rather than a decision — nothing in the schema or
-- the specs argues for one half of a relationship being referentially enforced.
--
-- Until now a relationship could name a vratarthi who does not exist, and deleting a user could
-- leave one pointing at nothing.
--
-- ON DELETE RESTRICT, matching the vm_id side: deleting somebody who is mid-relationship should
-- be refused rather than silently removing the relationship. Account deletion here anonymises
-- rather than deletes rows (spec/06), so this should never fire in normal use — which is exactly
-- why it should be enforced rather than assumed.

-- ---------------------------------------------------------------------------------------------
-- Check BEFORE constraining, so a failure says what is wrong.
--
-- Adding the FK to a table with orphan rows fails with a bare Postgres violation naming a
-- constraint and nothing else. This names the count, and leaves the table untouched.
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM "vm_relationships" r
  WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = r."vratarthi_id");

  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'vm_relationships: % row(s) reference a vratarthi_id with no matching user. The foreign key cannot be added until these are resolved — inspect them rather than deleting blindly, since each is a mentoring relationship.',
      orphan_count;
  END IF;
END $$;

ALTER TABLE "vm_relationships"
  ADD CONSTRAINT "vm_relationships_vratarthi_id_fkey"
  FOREIGN KEY ("vratarthi_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
