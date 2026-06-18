import { registerAndOnboard, TestUser } from './auth';
import { userIdByEmail, grantRole, scalar, lit, deleteUserByEmail } from './db';

// Shared, stable accounts the suite reuses across runs (idempotent — created once, reused
// thereafter). Ephemeral per-test users are created inside each flow with unique emails.
export const ADMIN: TestUser = { email: 'e2e_admin@e2e.local', password: 'E2ePass!2345', displayName: 'E2E Admin', username: 'e2e_admin' };
export const MODERATOR: TestUser = { email: 'e2e_mod@e2e.local', password: 'E2ePass!2345', displayName: 'E2E Moderator', username: 'e2e_mod' };
export const VM: TestUser = { email: 'e2e_vm@e2e.local', password: 'E2ePass!2345', displayName: 'E2E Vratmitra', username: 'e2e_vm' };

async function ensure(user: TestUser, roles: string[]): Promise<void> {
  // Idempotent, but self-healing: a fully-onboarded account is reused; a missing OR
  // partially-provisioned one (e.g. registered but never verified by an aborted prior run)
  // is recreated cleanly so the suite always has a usable account.
  const onboarded =
    userIdByEmail(user.email) &&
    scalar(`SELECT onboarding_completed_at IS NOT NULL FROM users WHERE email = ${lit(user.email)}`) === 't';
  if (!onboarded) {
    if (userIdByEmail(user.email)) deleteUserByEmail(user.email);
    await registerAndOnboard(user);
  }
  for (const role of roles) grantRole(user.email, role);
}

// Playwright globalSetup — runs once before the suite. Seeds the privileged/shared accounts
// the flows depend on (they don't exist in the base seed). Non-destructive on the dev DB.
export default async function globalSetup(): Promise<void> {
  await ensure(ADMIN, ['admin']);
  await ensure(MODERATOR, ['moderator']);
  await ensure(VM, ['vratmitra']);
}
