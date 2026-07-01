import { Injectable, Inject, forwardRef, Logger, type OnModuleInit } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersIndexService } from '../search/users-index.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import type {
  OwnProfileDto,
  PublicProfileDto,
  UserSearchResultDto,
} from './dto/public-profile.dto';
import type { SessionUser } from '../auth/types/auth.types';
import { parseVisibility, isFieldVisible } from './profile-visibility';
import { parseNotificationPrefs } from './notification-prefs';
import { FollowsService } from '../follows/follows.service';
import { ExperienceLogsService } from '../experience-logs/experience-logs.service';
import { AuthService } from '../auth/auth.service';
import {
  EntityNotFoundException,
  UserUsernameTakenException,
  InvalidCredentialsException,
} from '../../common/exceptions/app.exceptions';

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const ONLINE_THRESHOLD_MINUTES = 5;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger('UsersService');

  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(forwardRef(() => FollowsService))
    private readonly followsService: FollowsService,
    private readonly experienceLogsService: ExperienceLogsService,
    private readonly usersIndex: UsersIndexService,
    private readonly authService: AuthService,
  ) {}

  // One-shot seed so search works without a manual reindex (bounded; fine at scale).
  async onModuleInit(): Promise<void> {
    try {
      const users = await this.usersRepository.listForIndex();
      await Promise.all(users.map((u) => this.usersIndex.upsert(u)));
    } catch (error) {
      this.logger.warn({
        msg: 'user index seed failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Fire-after-write index sync. Best-effort (the index service swallows failures).
  syncToIndex(user: {
    id: string;
    username: string;
    displayName: string;
    profilePrivate: boolean;
  }): void {
    void this.usersIndex.upsert({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      isPublic: !user.profilePrivate,
    });
  }

  async getOwnProfile(userId: string): Promise<OwnProfileDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new EntityNotFoundException('User', userId);
    const counts = await this.followsService.getCounts(userId);
    return {
      ...this.toOwnProfileDto(user),
      followerCount: counts.followers,
      followingCount: counts.following,
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateProfileDto): Promise<OwnProfileDto> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) throw new EntityNotFoundException('User', userId);

    if (dto.username) {
      const taken = await this.usersRepository.isUsernameTaken(dto.username, userId);
      if (taken) throw new UserUsernameTakenException();
    }

    const user = await this.usersRepository.updateProfile(userId, {
      displayName: dto.displayName,
      username: dto.username,
      gender: dto.gender,
      // null = clear, undefined = no-change, string = set
      dob: dto.dob === undefined ? undefined : dto.dob === null ? null : new Date(dto.dob),
      language: dto.language,
    });

    this.syncToIndex(user);
    return this.toOwnProfileDto(user);
  }

  async getPublicProfile(username: string, requestingUserId?: string): Promise<PublicProfileDto> {
    const user = await this.usersRepository.findByUsername(username);

    if (!user || user.profilePrivate) {
      throw new EntityNotFoundException('User', username);
    }

    const vis = parseVisibility(user.profileVisibility);
    const show = (field: Parameters<typeof isFieldVisible>[1]) => isFieldVisible(vis, field);

    const counts = await this.followsService.getCounts(user.id);

    // displayName + username are always public (handle/identity). All other fields
    // are omitted entirely when toggled off (spec/10: hidden, not "—").
    const profile: PublicProfileDto = {
      username: user.username,
      displayName: user.displayName,
      followerCount: counts.followers,
      followingCount: counts.following,
    };

    // Follow status only for an authenticated viewer who isn't the profile owner.
    if (requestingUserId && requestingUserId !== user.id) {
      const status = await this.followsService.getStatus(requestingUserId, user.id);
      profile.isFollowing = status.isFollowing;
      profile.followsYou = status.followsYou;
    }

    // VM credibility — shown only when the user has guided a journey to completion.
    if (user.guidedJourneysCompleted > 0) {
      profile.guidedJourneysCompleted = user.guidedJourneysCompleted;
    }

    if (show('avatar')) profile.avatarUrl = user.avatarUrl;
    if (show('memberSince')) profile.memberSince = user.createdAt.toISOString();
    if (show('journeysCompleted')) profile.journeysCompleted = user.journeysCompleted;
    if (show('journeysActive')) profile.journeysActive = user.journeysActive;
    if (show('testsTaken')) profile.testsTaken = user.testsTaken;
    if (show('weaknesses')) profile.weaknessesWorkedOn = user.weaknessesWorkedOn;
    if (show('exposures')) {
      profile.exposuresActive = user.exposuresActive;
      profile.exposuresCompleted = user.exposuresCompleted;
    }
    if (show('resolutions')) {
      profile.resolutionsActive = user.resolutionsActive;
      profile.resolutionsCompleted = user.resolutionsCompleted;
    }
    if (show('challenges')) profile.challengesCompleted = user.challengesCompleted;
    if (show('experiences')) profile.publicExperienceCount = user.publicExperienceCount;

    if (user.showLastActive && user.lastActiveAt) {
      profile.lastActiveAt = user.lastActiveAt.toISOString();
    }
    if (user.showOnlineIndicator) {
      profile.isOnline = this.computeIsOnline(user.lastActiveAt);
    }

    return profile;
  }

  async getPublicExperiences(username: string, cursor?: string) {
    const user = await this.usersRepository.findIdByUsername(username);
    if (!user) throw new EntityNotFoundException('User', username);
    return this.experienceLogsService.getPublicByAuthor(user.id, cursor);
  }

  // Auth'd user search: typo-tolerant name/username via Meili + exact full-email via DB
  // (email never indexed). Excludes private profiles + self. Returns presence + follow
  // status. <2 chars → empty; backend down → empty (degrade, never error).
  async searchUsers(requester: SessionUser, query: string): Promise<UserSearchResultDto[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const ids: string[] = [];

    // Exact full-email match (strongly consistent, never via the index).
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) {
      const byEmail = await this.usersRepository.findByEmail(q.toLowerCase());
      if (byEmail && byEmail.id !== requester.id) ids.push(byEmail.id);
    }

    for (const id of await this.usersIndex.search(q, requester.id)) {
      if (!ids.includes(id)) ids.push(id);
    }
    if (ids.length === 0) return [];

    const users = await this.usersRepository.findManyByIds(ids);
    // Preserve relevance order (exact-email first, then Meili), drop private profiles.
    const byId = new Map(users.map((u) => [u.id, u]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u && !u.profilePrivate);

    const statuses = await Promise.all(
      ordered.map((u) => this.followsService.getStatus(requester.id, u.id)),
    );

    return ordered.map((u, i) => {
      const result: UserSearchResultDto = {
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        isFollowing: statuses[i].isFollowing,
        followsYou: statuses[i].followsYou,
      };
      if (u.showLastActive && u.lastActiveAt) result.lastActiveAt = u.lastActiveAt.toISOString();
      if (u.showOnlineIndicator) result.isOnline = this.computeIsOnline(u.lastActiveAt);
      return result;
    });
  }

  async updateVisibility(userId: string, dto: UpdateVisibilityDto): Promise<OwnProfileDto> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) throw new EntityNotFoundException('User', userId);

    const user = await this.usersRepository.updateVisibility(userId, {
      profilePrivate: dto.profilePrivate,
      showLastActive: dto.showLastActive,
      showOnlineIndicator: dto.showOnlineIndicator,
      profileVisibility: dto.profileVisibility
        ? {
            ...parseVisibility(existing.profileVisibility),
            ...parseVisibility(dto.profileVisibility),
          }
        : undefined,
    });

    // Privacy change flips index visibility — re-sync.
    this.syncToIndex(user);
    return this.toOwnProfileDto(user);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<OwnProfileDto> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) throw new EntityNotFoundException('User', userId);

    const user = await this.usersRepository.updateSettings(userId, {
      language: dto.language,
      profilePrivate: dto.profilePrivate,
      showLastActive: dto.showLastActive,
      showOnlineIndicator: dto.showOnlineIndicator,
      notificationPrefs: dto.notificationPrefs
        ? {
            ...parseNotificationPrefs(existing.notificationPrefs),
            ...parseNotificationPrefs(dto.notificationPrefs),
          }
        : undefined,
    });

    // Privacy may have changed → re-sync the search index.
    this.syncToIndex(user);
    return this.toOwnProfileDto(user);
  }

  // Restart tour (spec/26 §5): flag the contextual walkthrough to replay. Does not reset
  // onboardingCompletedAt — the user is not sent back through signup onboarding.
  async restartTour(userId: string): Promise<OwnProfileDto> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) throw new EntityNotFoundException('User', userId);
    const user = await this.usersRepository.setTourReset(userId, new Date());
    return this.toOwnProfileDto(user);
  }

  // Single source of truth for "anonymise an account" (spec/06). Used by both admin
  // anonymisation (Item 31) and self-delete (Item 32): replace PII with a deterministic
  // pseudonym, soft-delete + suspend, kill sessions, cancel pending invitations. Content
  // (journeys, ERC, tests, logs) is retained under the pseudonym.
  async anonymiseAccount(userId: string): Promise<{ id: string; anonymisedAt: Date }> {
    const shortId = userId.replace(/-/g, '').slice(0, 12);
    const now = new Date();
    const user = await this.usersRepository.anonymise(
      userId,
      {
        displayName: '[Deleted user]',
        email: `anon-${shortId}@deleted.invalid`,
        username: `deleted_${shortId}`,
      },
      now,
    );
    await this.authService.forceLogout(userId);
    await this.usersRepository.cancelPendingInvitations(userId);
    // Drop from the search index — an anonymised account is no longer discoverable.
    void this.usersIndex.remove(userId);
    return { id: user.id, anonymisedAt: now };
  }

  // Self-service account deletion. Re-authenticates with the current password, then routes
  // through the shared anonymisation primitive (spec/06: anonymise, don't hard-delete).
  async selfDelete(userId: string, currentPassword: string): Promise<{ id: string }> {
    const ok = await this.authService.verifyPassword(userId, currentPassword);
    if (!ok) throw new InvalidCredentialsException();
    await this.anonymiseAccount(userId);
    return { id: userId };
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findByUsername(username: string) {
    return this.usersRepository.findIdByUsername(username);
  }

  // Username → identity incl. email. For server-side flows that need the email of a
  // user the client found by username (e.g. sending a VM invite). Not exposed via API.
  async findByUsernameWithEmail(username: string) {
    return this.usersRepository.findByUsernameWithEmail(username);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async checkUsernameAvailable(username: string, requestingUserId: string): Promise<boolean> {
    if (!USERNAME_REGEX.test(username)) return false;

    const taken = await this.usersRepository.isUsernameTaken(username, requestingUserId);
    return !taken;
  }

  private computeIsOnline(lastActiveAt: Date | null): boolean {
    if (!lastActiveAt) return false;
    const diffMs = Date.now() - lastActiveAt.getTime();
    return diffMs < ONLINE_THRESHOLD_MINUTES * 60 * 1000;
  }

  private toOwnProfileDto(user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    gender: string | null;
    dob: Date | null;
    language: string;
    showLastActive: boolean;
    showOnlineIndicator: boolean;
    profilePrivate: boolean;
    profileVisibility: unknown;
    notificationPrefs?: unknown;
    pendingEmail?: string | null;
    tourResetAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OwnProfileDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
      language: user.language,
      showLastActive: user.showLastActive,
      showOnlineIndicator: user.showOnlineIndicator,
      profilePrivate: user.profilePrivate,
      profileVisibility: parseVisibility(user.profileVisibility),
      notificationPrefs: parseNotificationPrefs(user.notificationPrefs),
      pendingEmail: user.pendingEmail ?? null,
      tourResetAt: user.tourResetAt ? user.tourResetAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
