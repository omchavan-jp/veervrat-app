export interface PublicProfileDto {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  memberSince: string;
  journeysCompleted: number;
  journeysActive: number;
  testsTaken: number;
  publicExperienceCount: number;
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
  createdAt: string;
  updatedAt: string;
}
