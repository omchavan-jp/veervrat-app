import { UserRole } from '@prisma/client';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
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
