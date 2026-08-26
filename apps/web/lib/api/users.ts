import { api } from './client';
import type { User } from './auth';
import type { ExperienceListResponse } from './experience-logs';

type Wrapped<T> = { data: T };

export type ProfileField =
  | 'avatar'
  | 'memberSince'
  | 'journeysCompleted'
  | 'journeysActive'
  | 'testsTaken'
  | 'weaknesses'
  | 'exposures'
  | 'resolutions'
  | 'challenges'
  | 'experiences';

export type ProfileVisibility = Partial<Record<ProfileField, boolean>>;

export type OwnProfile = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  gender: string | null;
  dob: string | null;
  language: string;
  showLastActive: boolean;
  showOnlineIndicator: boolean;
  profilePrivate: boolean;
  profileVisibility: ProfileVisibility;
  notificationPrefs: Record<string, boolean>;
  pendingEmail?: string | null;
  tourResetAt: string | null;
  createdAt: string;
  updatedAt: string;
  followerCount?: number;
  followingCount?: number;
};

export type ConnectedAccount = { provider: 'EMAIL' | 'GOOGLE'; connectedAt: string };

export type UpdateSettingsInput = {
  language?: string;
  profilePrivate?: boolean;
  showLastActive?: boolean;
  showOnlineIndicator?: boolean;
  notificationPrefs?: Record<string, boolean>;
};

// All stat fields are optional — a field toggled off by the VA is absent (spec/10).
export type PublicProfile = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  /**
   * Present only when the person has provided one — the field is optional, so leaving it blank
   * is the opt-out and there is deliberately no separate visibility control.
   *
   * Date of birth is never here: it is an identity-verification token, not profile detail.
   */
  gender?: string | null;
  memberSince?: string;
  journeysCompleted?: number;
  journeysActive?: number;
  testsTaken?: number;
  weaknessesWorkedOn?: number;
  exposuresActive?: number;
  exposuresCompleted?: number;
  resolutionsActive?: number;
  resolutionsCompleted?: number;
  challengesCompleted?: number;
  publicExperienceCount?: number;
  lastActiveAt?: string;
  isOnline?: boolean;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  followsYou?: boolean;
  guidedJourneysCompleted?: number;
};

export type UserSearchResult = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  lastActiveAt?: string;
  isOnline?: boolean;
  isFollowing: boolean;
  followsYou: boolean;
};

export type UpdateVisibilityInput = {
  profilePrivate?: boolean;
  showLastActive?: boolean;
  showOnlineIndicator?: boolean;
  profileVisibility?: ProfileVisibility;
};

export const usersApi = {
  updateMe: (data: {
    language?: string;
    displayName?: string;
    username?: string;
    gender?: string | null;
    dob?: string | null;
  }) => api.patch<Wrapped<User>>('/users/me', data).then((r) => r.data),

  getMyProfile: () => api.get<Wrapped<OwnProfile>>('/users/me').then((r) => r.data),

  updateVisibility: (data: UpdateVisibilityInput) =>
    api.patch<Wrapped<OwnProfile>>('/users/me/visibility', data).then((r) => r.data),

  updateSettings: (data: UpdateSettingsInput) =>
    api.patch<Wrapped<OwnProfile>>('/users/me/settings', data).then((r) => r.data),

  restartTour: () => api.post<Wrapped<OwnProfile>>('/users/me/restart-tour').then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api
      .patch<Wrapped<{ success: boolean }>>('/users/me/password', { currentPassword, newPassword })
      .then((r) => r.data),

  listConnectedAccounts: () =>
    api
      .get<
        Wrapped<{ accounts: ConnectedAccount[]; hasPassword: boolean }>
      >('/users/me/connected-accounts')
      .then((r) => r.data),

  disconnectAccount: (provider: string) =>
    api
      .delete<Wrapped<{ provider: string }>>(`/users/me/connected-accounts/${provider}`)
      .then((r) => r.data),

  deleteAccount: (currentPassword: string) =>
    api.delete<Wrapped<{ id: string }>>('/users/me', { currentPassword }).then((r) => r.data),

  getPublicProfile: (username: string) =>
    api.get<Wrapped<PublicProfile>>(`/users/${encodeURIComponent(username)}`).then((r) => r.data),

  getPublicExperiences: (username: string, cursor?: string) =>
    api
      .get<
        Wrapped<ExperienceListResponse>
      >(`/users/${encodeURIComponent(username)}/experience-logs${cursor ? `?cursor=${cursor}` : ''}`)
      .then((r) => r.data),

  search: (q: string) =>
    api
      .get<Wrapped<UserSearchResult[]>>(`/users/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.data),

  follow: (username: string) =>
    api
      .post<Wrapped<{ following: boolean }>>(`/users/${encodeURIComponent(username)}/follow`)
      .then((r) => r.data),

  unfollow: (username: string) =>
    api
      .delete<Wrapped<{ following: boolean }>>(`/users/${encodeURIComponent(username)}/follow`)
      .then((r) => r.data),
};
