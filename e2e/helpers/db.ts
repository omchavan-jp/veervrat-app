import { execFileSync } from 'node:child_process';

// E2E DB access. The root workspace has no pg/prisma dependency, so we talk to the dev
// Postgres container directly via `docker exec ... psql`. This is test-only glue (never
// shipped) and matches how the local stack is run. All queries target the dev DB (5433),
// which is the DB the E2E backend (`pnpm --filter api start:dev`) connects to.
const CONTAINER = process.env.E2E_PG_CONTAINER ?? 'veervrat-postgres';
const DB = process.env.E2E_PG_DB ?? 'veervrat';
const USER = process.env.E2E_PG_USER ?? 'veervrat';

// Run SQL and return rows as arrays of column strings (tab-separated, -A -F'\t').
export function sql(query: string): string[][] {
  const out = execFileSync(
    'docker',
    ['exec', CONTAINER, 'psql', '-U', USER, '-d', DB, '-t', '-A', '-F', '\t', '-c', query],
    { encoding: 'utf8' },
  );
  return out
    .trim()
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => l.split('\t'));
}

// First column of the first row, or null.
export function scalar(query: string): string | null {
  const rows = sql(query);
  return rows.length > 0 ? rows[0][0] : null;
}

// SQL string literal escaping (single quotes only — inputs are test-controlled).
export function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

// Latest unused verification token of a type for an email (signup verify, email change).
export function latestVerificationToken(email: string, type: string): string | null {
  return scalar(
    `SELECT vt.token FROM verification_tokens vt
     JOIN users u ON u.id = vt.user_id
     WHERE u.email = ${lit(email)} AND vt.type = ${lit(type)} AND vt.used_at IS NULL
     ORDER BY vt.created_at DESC LIMIT 1`,
  );
}

// Latest pending invitation token sent to an email (VM / platform invites).
export function latestInvitationToken(email: string): string | null {
  return scalar(
    `SELECT token FROM invitations
     WHERE invitee_email = ${lit(email)} AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
  );
}

export function userIdByEmail(email: string): string | null {
  return scalar(`SELECT id FROM users WHERE email = ${lit(email)}`);
}

// Grant a role to a user (idempotent). role is a `role` enum value (lowercase).
export function grantRole(email: string, role: string): void {
  sql(
    `INSERT INTO user_roles (user_id, role)
     SELECT id, ${lit(role)}::role FROM users WHERE email = ${lit(email)}
     ON CONFLICT DO NOTHING`,
  );
}

// Delete a user and dependent rows by email (cleanup of ephemeral signups). A few relations
// are ON DELETE RESTRICT (e.g. blogs.author_id), so clear those first. Best-effort — never
// throws, so test teardown can't fail the run.
export function deleteUserByEmail(email: string): void {
  try {
    const id = userIdByEmail(email);
    if (!id) return;
    // RESTRICT-guarded dependents authored/owned by this user (delete before the user row).
    sql(`DELETE FROM blog_comments WHERE author_id = ${lit(id)}`);
    sql(`DELETE FROM blogs WHERE author_id = ${lit(id)}`);
    sql(`DELETE FROM test_attempts WHERE user_id = ${lit(id)}`);
    sql(`DELETE FROM invitations WHERE inviter_id = ${lit(id)} OR invitee_id = ${lit(id)}`);
    sql(`DELETE FROM journey_vm_assignments WHERE vm_id = ${lit(id)}`);
    sql(`DELETE FROM vm_relationships WHERE vm_id = ${lit(id)} OR vratarthi_id = ${lit(id)}`);
    sql(`DELETE FROM journeys WHERE vratarthi_id = ${lit(id)}`);
    sql(`DELETE FROM users WHERE id = ${lit(id)}`);
  } catch {
    // swallow — cleanup is best-effort
  }
}

// The sentence ids that make up a weakness's test (sentences under the weakness's subvirtues).
export function sentenceIdsForWeakness(weaknessId: string, limit = 200): string[] {
  return sql(
    `SELECT s.id FROM sentences s
     JOIN weakness_subvirtues ws ON ws.subvirtue_id = s.subvirtue_id
     WHERE ws.weakness_id = ${lit(weaknessId)} LIMIT ${limit}`,
  ).map((r) => r[0]);
}

// A weakness that has test sentences, for the draft-test flow.
export function sampleWeaknessWithSentences(): string {
  const id = scalar(
    `SELECT ws.weakness_id FROM weakness_subvirtues ws
     JOIN sentences s ON s.subvirtue_id = ws.subvirtue_id
     GROUP BY ws.weakness_id HAVING count(*) >= 2 LIMIT 1`,
  );
  if (!id) throw new Error('no weakness with sentences available');
  return id;
}

export function journeyState(journeyId: string): string | null {
  return scalar(`SELECT state FROM journeys WHERE id = ${lit(journeyId)}`);
}

// A valid (sentenceId, weaknessId) pair for starting a journey, where the weakness has at
// least one pooled resolution (so the journey's resolution pool is non-empty for ERC select).
export function sampleSentenceWeakness(): { sentenceId: string; weaknessId: string } {
  const rows = sql(
    `SELECT s.id, rw.weakness_id FROM sentences s
     JOIN weakness_subvirtues ws ON ws.subvirtue_id = s.subvirtue_id
     JOIN resolution_weaknesses rw ON rw.weakness_id = ws.weakness_id
     LIMIT 1`,
  );
  if (rows.length === 0)
    throw new Error('no sentence/weakness pair with pooled resolutions available');
  return { sentenceId: rows[0][0], weaknessId: rows[0][1] };
}

// Latest audit event of an action (for the admin-override flow assertion).
export function latestAuditEvent(
  action: string,
): { resourceId: string | null; metadata: string | null } | null {
  const rows = sql(
    `SELECT coalesce(resource_id::text,''), coalesce(metadata::text,'') FROM audit_events
     WHERE action = ${lit(action)} ORDER BY created_at DESC LIMIT 1`,
  );
  if (rows.length === 0) return null;
  return { resourceId: rows[0][0] || null, metadata: rows[0][1] || null };
}
