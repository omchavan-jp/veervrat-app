/**
 * The user as resolved server-side from the session cookie and seeded into the client.
 *
 * Deliberately the same shape `/auth/me` returns, so seeded state and any later client fetch are
 * interchangeable — if these drifted apart, the app would render one shape on first paint and a
 * different one after the first refetch, which is the kind of bug that only shows up in
 * production.
 */
export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  language: string;
  gender: string | null;
  dob: string | null;
  avatarUrl: string | null;
  roles: string[];
  emailVerifiedAt: string | null;
  accountSetupCompletedAt: string | null;
  onboardingCompletedAt: string | null;
  isContentEditor?: boolean;
};

export const SESSION_USER_HEADER = 'X-Session-User';

/** Decode the header the middleware sets. Never throws — a malformed header means anonymous. */
export function decodeSessionUser(header: string | null | undefined): SessionUser | null {
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as SessionUser;
  } catch {
    return null;
  }
}
