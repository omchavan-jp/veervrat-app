import { registerAndOnboard, TestUser } from './auth';
import { userIdByEmail, grantRole, scalar, lit, deleteUserByEmail } from './db';

// Shared, stable accounts the suite reuses across runs (idempotent — created once, reused
// thereafter). Ephemeral per-test users are created inside each flow with unique emails.
export const ADMIN: TestUser = {
  email: 'e2e_admin@e2e.local',
  password: 'E2ePass!2345',
  displayName: 'E2E Admin',
  username: 'e2e_admin',
};
export const MODERATOR: TestUser = {
  email: 'e2e_mod@e2e.local',
  password: 'E2ePass!2345',
  displayName: 'E2E Moderator',
  username: 'e2e_mod',
};
export const VM: TestUser = {
  email: 'e2e_vm@e2e.local',
  password: 'E2ePass!2345',
  displayName: 'E2E Vratmitra',
  username: 'e2e_vm',
};

async function ensure(user: TestUser, roles: string[]): Promise<void> {
  // Idempotent, but self-healing: a fully-onboarded account is reused; a missing OR
  // partially-provisioned one (e.g. registered but never verified by an aborted prior run)
  // is recreated cleanly so the suite always has a usable account.
  const onboarded =
    userIdByEmail(user.email) &&
    scalar(
      `SELECT onboarding_completed_at IS NOT NULL FROM users WHERE email = ${lit(user.email)}`,
    ) === 't';
  if (!onboarded) {
    if (userIdByEmail(user.email)) deleteUserByEmail(user.email);
    await registerAndOnboard(user);
  }
  for (const role of roles) grantRole(user.email, role);
}

// Playwright globalSetup — runs once before the suite. Seeds the privileged/shared accounts
// the flows depend on (they don't exist in the base seed). Non-destructive on the dev DB.
export default async function globalSetup(): Promise<void> {
  // ADMIN and MODERATOR are granted directly because the product has no path to those roles —
  // deliberately. There is nothing a test could drive instead.
  await ensure(ADMIN, ['admin']);
  await ensure(MODERATOR, ['moderator']);

  // VM gets NO role here. It used to get `vratmitra` by raw SQL, and that one line is why
  // `flow-03-vm-invite-approve.spec.ts` passed for months while accepting a vratmitra
  // invitation returned 403 to every real user: accepting required the role, nothing in the
  // product granted it, and the fixture supplied it before the flow began. The suite was
  // asserting against a state no user could reach.
  //
  // Accepting an invitation now grants the role (invitations.service, #214), so the flows earn
  // it the way a person does. Do not add a role here for anything a user can reach on their own.
  await ensure(VM, []);
}
