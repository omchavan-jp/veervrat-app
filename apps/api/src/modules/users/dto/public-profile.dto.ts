import type { ProfileVisibility } from '../profile-visibility';

// Public profile — only fields the VA has left visible are present. A field toggled
// off is absent entirely (not "—"), per spec/10.
export interface PublicProfileDto {
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
  /** ISO 8601 timestamp — frontend formats for the user's locale */
  lastActiveAt?: string;
  isOnline?: boolean;
}

export interface OwnProfileDto {
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
}
