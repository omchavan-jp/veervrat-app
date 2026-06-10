import { api } from './client';
import type { User } from './auth';

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
  createdAt: string;
  updatedAt: string;
};

// All stat fields are optional — a field toggled off by the VA is absent (spec/10).
export type PublicProfile = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
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

  getPublicProfile: (username: string) =>
    api.get<Wrapped<PublicProfile>>(`/users/${encodeURIComponent(username)}`).then((r) => r.data),
};
