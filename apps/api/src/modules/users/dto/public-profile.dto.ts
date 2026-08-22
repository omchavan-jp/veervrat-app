import type { ProfileVisibility } from '../profile-visibility';
import type { NotificationPrefs } from '../notification-prefs';

// Public profile — only fields the VA has left visible are present. A field toggled
// off is absent entirely (not "—"), per spec/10.
export interface PublicProfileDto {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  /**
   * Present only when the user has provided one. The field is optional, so leaving it blank IS
   * the opt-out — there is deliberately no separate visibility control.
   *
   * Date of birth is NOT here and must never be: it is an identity-verification token used by
   * banks and government services, so publishing it hands out a credential.
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
  /** ISO 8601 timestamp — frontend formats for the user's locale */
  lastActiveAt?: string;
  isOnline?: boolean;
  // Social graph (spec/10). Counts always present; status only for authenticated viewers.
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  followsYou?: boolean;
  // VM credibility — present only when > 0 (spec/22).
  guidedJourneysCompleted?: number;
}

// A single user-search hit. Identity + presence + the requester's follow status.
// Never includes email or private-profile users.
export interface UserSearchResultDto {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  lastActiveAt?: string;
  isOnline?: boolean;
  isFollowing: boolean;
  followsYou: boolean;
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
  notificationPrefs: NotificationPrefs;
  pendingEmail?: string | null;
  tourResetAt: string | null;
  createdAt: string;
  updatedAt: string;
  followerCount?: number;
  followingCount?: number;
}
