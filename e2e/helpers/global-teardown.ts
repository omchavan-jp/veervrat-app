import { sql } from './db';

// Remove all ephemeral E2E accounts created during the run (anything @e2e.local that isn't
// one of the stable shared accounts). Clears RESTRICT-guarded dependents (blogs/comments)
// first. The shared accounts (e2e_admin/e2e_mod/e2e_vm) are left in place for the next run.
const KEEP = `('e2e_admin@e2e.local', 'e2e_mod@e2e.local', 'e2e_vm@e2e.local')`;

export default async function globalTeardown(): Promise<void> {
  try {
    const ephemeral = `SELECT id FROM users WHERE email LIKE '%@e2e.local' AND email NOT IN ${KEEP}`;
    sql(`DELETE FROM blog_comments WHERE author_id IN (${ephemeral})`);
    sql(`DELETE FROM blogs WHERE author_id IN (${ephemeral})`);
    sql(`DELETE FROM test_attempts WHERE user_id IN (${ephemeral})`);
    sql(
      `DELETE FROM invitations WHERE inviter_id IN (${ephemeral}) OR invitee_id IN (${ephemeral})`,
    );
    sql(`DELETE FROM journey_vm_assignments WHERE vm_id IN (${ephemeral})`);
    sql(
      `DELETE FROM vm_relationships WHERE vm_id IN (${ephemeral}) OR vratarthi_id IN (${ephemeral})`,
    );
    sql(`DELETE FROM journeys WHERE vratarthi_id IN (${ephemeral})`);
    sql(`DELETE FROM users WHERE email LIKE '%@e2e.local' AND email NOT IN ${KEEP}`);
  } catch {
    // best-effort
  }
}
