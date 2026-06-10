import { Role } from '@prisma/client';

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  roles: Role[];
  language: string;
  gender: string | null;
  dob: Date | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  onboardingCompletedAt: Date | null;
};

export type CreateSessionParams = {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  ttlDays: number;
};

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string | null;
};

export type AuthResult = {
  user: SessionUser;
  sessionToken: string;
};

export type LinkPendingResult = {
  action: 'link_pending';
  token: string;
};
