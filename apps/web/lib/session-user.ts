export type Capability = 'FEEDBACK_WIDGET' | 'CONTENT_EDIT' | 'CONTENT_SUGGEST';

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
  /**
   * What this person may try, as opposed to who they are (`roles`).
   *
   * Replaces the old `isContentEditor` boolean, which was computed from an environment
   * allowlist while roles came from the database — two shapes for the same question. The UI
   * reflects what the server would allow; it is not itself the rule (see the feedback widget,
   * which used to be hidden by config while the API accepted anyone).
   */
  grants?: Capability[];
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
