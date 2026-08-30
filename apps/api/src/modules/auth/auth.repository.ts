import { Injectable } from '@nestjs/common';
import { AuthProvider, InvitationStatus, Prisma, Role, VerificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Shared select shape that returns all fields needed for SessionUser
const userSelect = {
  id: true,
  email: true,
  displayName: true,
  username: true,
  language: true,
  gender: true,
  dob: true,
  avatarUrl: true,
  emailVerifiedAt: true,
  accountSetupCompletedAt: true,
  onboardingCompletedAt: true,
  suspendedAt: true,
  deletedAt: true,
  roles: { select: { role: true } },
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * An exact match on an address the caller has already normalised.
   *
   * Callers MUST lowercase before calling. That is not a convention hoping to be followed: every
   * writer normalises, `20260830080000_lowercase_email_storage` lowercased the rows that predate
   * that, and `auth.service.email-normalisation.spec.ts` fails if a writer stops.
   *
   * This was briefly `mode: 'insensitive'`, which fixed a real defect — the table held both
   * forms, so an exact match refused a correct address depending on which path had last written
   * it, and the refusal was `InvalidCredentialsException`, indistinguishable from a wrong
   * password. That fix is why the read is safe to narrow now rather than the reason to keep it:
   * Prisma compiles `insensitive` to ILIKE, which cannot use the btree index on `email`, so
   * every sign-in and every registration became a sequential scan over the users table.
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: userSelect,
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: userSelect,
    });
  }

  async findUserByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username: username.toLowerCase(), deletedAt: null },
      select: { id: true },
    });
  }

  async createUserWithEmailAccount(params: {
    email: string;
    displayName: string;
    username: string;
    passwordHash: string;
    dob: Date;
    consents: { documentKey: string; version: number }[];
    language?: 'EN' | 'MR';
  }) {
    // Consent rows are nested in the same `create`, so they land in the same transaction as the
    // user. A crash between the two would leave an account whose agreement has no record, and
    // that is the one state here that cannot be repaired afterwards — there is nothing to
    // reconstruct it from.
    const user = await this.prisma.user.create({
      data: {
        email: params.email,
        displayName: params.displayName,
        username: params.username,
        dob: params.dob,
        language: params.language ?? 'EN',
        consents: { create: params.consents },
        authAccounts: {
          create: {
            provider: AuthProvider.EMAIL,
            providerAccountId: params.email,
            passwordHash: params.passwordHash,
          },
        },
        roles: { create: { role: Role.VRATARTHI } },
      },
      select: userSelect,
    });
    await this.linkPendingInvitations(user.id, user.email);
    return user;
  }

  /**
   * Point invitations addressed to this email at the account that now holds it.
   *
   * A vratmitra invitation to someone not yet on Veervrat is created with `inviteeId = null` —
   * there is no account to reference. Nothing filled it in when they signed up, so the
   * invitation kept pointing at nobody and `vm_invitation.accept`, which requires
   * `invitation.inviteeId === user.id`, refused them forever. Inviting a person by email could
   * therefore never complete. Recorded in `e2e/flow-04` as the second half of "Ledger #8", in a
   * skipped test, and nowhere else.
   *
   * Lives here rather than in InvitationsRepository because InvitationsModule imports AuthModule;
   * the reverse would be a cycle. Only PENDING invitations are linked — an expired or cancelled
   * one stays as it was.
   */
  private async linkPendingInvitations(userId: string, email: string): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { inviteeEmail: email, inviteeId: null, status: InvitationStatus.PENDING },
      data: { inviteeId: userId },
    });
  }

  // ─── Pending signups ────────────────────────────────────────────────────────
  // Holds date of birth and consent across the OAuth round trip so they never travel in a URL.

  async createPendingSignup(params: {
    username: string;
    dob: Date;
    consents: { documentKey: string; version: number }[];
    language?: 'EN' | 'MR';
    expiresAt: Date;
  }) {
    return this.prisma.pendingSignup.create({
      data: {
        username: params.username,
        dob: params.dob,
        consents: params.consents,
        language: params.language ?? 'EN',
        expiresAt: params.expiresAt,
      },
      select: { id: true },
    });
  }

  async consumePendingSignup(id: string) {
    const pending = await this.prisma.pendingSignup.findUnique({ where: { id } });
    if (!pending) return null;
    // Deleted on read, whether or not it is still valid: a signup handoff is single-use, and
    // leaving a consumed one behind invites replay.
    await this.prisma.pendingSignup.delete({ where: { id } }).catch(() => undefined);
    return pending.expiresAt.getTime() < Date.now() ? null : pending;
  }

  async deleteExpiredPendingSignups(now: Date = new Date()) {
    const result = await this.prisma.pendingSignup.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return result.count;
  }

  /**
   * The versions currently published for the required policy documents.
   *
   * Resolved server-side at the moment of acceptance. The client tells us which documents it
   * showed, but not which version — if it did, a stale page could record consent to a version
   * the person never saw, and the record would be confidently wrong.
   */
  async currentPolicyVersions(keys: string[]) {
    const pages = await this.prisma.cmsPage.findMany({
      where: { key: { in: keys } },
      select: { key: true, version: true },
    });
    return new Map(pages.map((p) => [p.key, p.version]));
  }

  async findConsents(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
      select: { documentKey: true, version: true, acceptedAt: true },
    });
  }

  async recordConsent(userId: string, documentKey: string, version: number) {
    return this.prisma.userConsent.upsert({
      where: { userId_documentKey_version: { userId, documentKey, version } },
      create: { userId, documentKey, version },
      update: {},
    });
  }

  async createUserWithOAuthAccount(params: {
    email: string;
    displayName: string;
    username: string;
    provider: AuthProvider;
    providerAccountId: string;
    emailVerifiedAt: Date;
    dob: Date;
    consents: { documentKey: string; version: number }[];
    language?: 'EN' | 'MR';
  }) {
    // dob and consents are required here too. The OAuth path is a second route to account
    // creation, and a gate on only one route is not a gate — they come from the pending-signup
    // record created before the redirect.
    const user = await this.prisma.user.create({
      data: {
        email: params.email,
        displayName: params.displayName,
        username: params.username,
        emailVerifiedAt: params.emailVerifiedAt,
        dob: params.dob,
        language: params.language ?? 'EN',
        consents: { create: params.consents },
        authAccounts: {
          create: {
            provider: params.provider,
            providerAccountId: params.providerAccountId,
          },
        },
        roles: { create: { role: Role.VRATARTHI } },
      },
      select: userSelect,
    });
    await this.linkPendingInvitations(user.id, user.email);
    return user;
  }

  async markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: userSelect,
    });
  }

  async findAuthAccount(provider: AuthProvider, providerAccountId: string) {
    return this.prisma.authAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: { select: userSelect } },
    });
  }

  async findEmailAccountByUserId(userId: string) {
    return this.prisma.authAccount.findFirst({
      where: { userId, provider: AuthProvider.EMAIL },
    });
  }

  /**
   * Gives an account its first password.
   *
   * A Google signup creates only the OAuth row (`createUserWithOAuthAccount` above), so an
   * account that has never had a password has no EMAIL row to update — which is why every
   * password-shaped operation on it failed with "AuthAccount not found" (#196).
   */
  async createEmailAccountWithPassword(userId: string, email: string, passwordHash: string) {
    return this.prisma.authAccount.create({
      // `providerAccountId` is the email address for an EMAIL account, matching what
      // `createUserWithEmailAccount` writes at signup — the column is the identifier within the
      // provider, and for email that is the address.
      data: { userId, provider: AuthProvider.EMAIL, providerAccountId: email, passwordHash },
    });
  }

  async updatePasswordHash(accountId: string, passwordHash: string) {
    return this.prisma.authAccount.update({
      where: { id: accountId },
      data: { passwordHash },
    });
  }

  // ─── Email change ──────────────────────────────────────────────────────────
  async emailInUse(email: string): Promise<boolean> {
    const existing = await this.prisma.user.findFirst({ where: { email }, select: { id: true } });
    return existing !== null;
  }

  async setPendingEmail(userId: string, pendingEmail: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { pendingEmail },
      select: { id: true },
    });
  }

  async getPendingEmail(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pendingEmail: true },
    });
    return u?.pendingEmail ?? null;
  }

  /**
   * The EMAIL account moves with the address, in one transaction.
   *
   * `AuthAccount.providerAccountId` holds the address for an EMAIL account and the pair
   * `(provider, providerAccountId)` is unique. Updating only `User.email` left the old address
   * claimed by a row nothing reads — `findEmailAccountByUserId` looks accounts up by user, so
   * sign-in kept working and the drift stayed invisible until someone tried to register with
   * the freed-looking address and hit a unique-constraint failure on an account they could not
   * see.
   *
   * A Google-only account has no EMAIL row; `updateMany` matches zero and that is correct,
   * where `update` would throw.
   */
  async applyEmailChange(userId: string, newEmail: string) {
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: newEmail, pendingEmail: null },
        select: userSelect,
      }),
      this.prisma.authAccount.updateMany({
        where: { userId, provider: AuthProvider.EMAIL },
        data: { providerAccountId: newEmail },
      }),
    ]);
    return user;
  }

  /**
   * Releases the sign-in identities an anonymised account still holds, so the person can
   * register again with the same Google account or the same address.
   *
   * Anonymisation rewrites `User.email` and `User.username` but leaves `AuthAccount` rows
   * standing, and those rows carry the real googleId and the real address in a unique index.
   * The identity therefore stayed claimed by an account that no longer exists to anyone —
   * permanently, since nothing else ever removes them.
   *
   * Deliberately not folded into anonymisation itself: keeping the rows is what lets a
   * returning person be *told* their account was deleted and when. They are released at the
   * moment somebody actually re-registers, which is the first point where holding them costs
   * something.
   */
  async releaseIdentityClaims(userId: string) {
    return this.prisma.authAccount.deleteMany({ where: { userId } });
  }

  /**
   * The EMAIL account holding an address, whoever it belongs to — including a deleted account.
   *
   * `findUserByEmail` filters `deletedAt: null` and an anonymised account's address has been
   * rewritten anyway, so neither can see the stale claim that blocks registration.
   */
  async findEmailAccountByAddress(email: string) {
    return this.prisma.authAccount.findUnique({
      where: {
        provider_providerAccountId: { provider: AuthProvider.EMAIL, providerAccountId: email },
      },
      include: { user: { select: { id: true, deletedAt: true } } },
    });
  }

  // ─── Connected accounts ────────────────────────────────────────────────────
  async listAuthAccounts(userId: string) {
    return this.prisma.authAccount.findMany({
      where: { userId },
      select: { id: true, provider: true, passwordHash: true, createdAt: true },
    });
  }

  async deleteAuthAccount(id: string) {
    return this.prisma.authAccount.delete({ where: { id }, select: { id: true } });
  }

  async createSession(params: {
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }) {
    return this.prisma.session.create({ data: params });
  }

  async findSessionByToken(token: string) {
    return this.prisma.session.findUnique({
      where: { token },
      include: { user: { select: userSelect } },
    });
  }

  /** Stamps this session as having just proved who holds it. */
  async markSessionReauthenticated(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { reauthenticatedAt: new Date() },
    });
  }

  /**
   * Spends the proof.
   *
   * Conditional on the timestamp so two concurrent requests cannot both spend the same one: the
   * second matches zero rows. Returns whether it actually consumed anything, which is what the
   * caller must act on — checking and then clearing in two steps would leave exactly that race.
   */
  async consumeSessionReauthentication(sessionId: string, notBefore: Date): Promise<boolean> {
    const { count } = await this.prisma.session.updateMany({
      where: { id: sessionId, reauthenticatedAt: { gte: notBefore } },
      data: { reauthenticatedAt: null },
    });
    return count > 0;
  }

  async updateSessionActivity(sessionId: string, expiresAt: Date) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date(), expiresAt },
    });
  }

  async deleteSession(token: string) {
    return this.prisma.session.deleteMany({ where: { token } });
  }

  async deleteAllUserSessions(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  async createVerificationToken(params: {
    userId: string;
    token: string;
    type: VerificationType;
    expiresAt: Date;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.verificationToken.create({
      data: {
        ...params,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async addAuthAccount(params: {
    userId: string;
    provider: AuthProvider;
    providerAccountId: string;
  }) {
    return this.prisma.authAccount.create({
      data: {
        userId: params.userId,
        provider: params.provider,
        providerAccountId: params.providerAccountId,
      },
    });
  }

  async findVerificationToken(token: string, type: VerificationType) {
    return this.prisma.verificationToken.findFirst({
      where: { token, type, usedAt: null },
      include: { user: { select: userSelect } },
    });
  }

  async markTokenUsed(tokenId: string) {
    return this.prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  // Step 1 of onboarding (account setup): persist profile fields and mark account-setup
  // complete. Does NOT mark the whole onboarding complete — the framework step (step 2)
  // does that. Keeps the framework un-skippable (see markOnboardingComplete).
  async markAccountSetupComplete(
    userId: string,
    fields?: {
      displayName?: string;
      username?: string;
      language?: 'EN' | 'MR';
      gender?: string;
      dob?: Date;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        accountSetupCompletedAt: new Date(),
        ...(fields?.displayName ? { displayName: fields.displayName } : {}),
        ...(fields?.username ? { username: fields.username } : {}),
        ...(fields?.language ? { language: fields.language } : {}),
        ...(fields?.gender ? { gender: fields.gender } : {}),
        ...(fields?.dob ? { dob: fields.dob } : {}),
      },
      select: userSelect,
    });
  }

  // Step 2 of onboarding (framework walkthrough complete): mark the whole onboarding done.
  // The app shell gate keys off onboardingCompletedAt, so this is what grants app access.
  async markOnboardingComplete(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
      select: userSelect,
    });
  }

  async invalidateTokensByUserAndType(userId: string, type: VerificationType) {
    return this.prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
