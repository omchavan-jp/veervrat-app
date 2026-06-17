import { api } from './client';

export type User = {
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
};

type AuthResponse = User & { message: string };
type Wrapped<T> = { data: T };

export const authApi = {
  register: (data: { email: string; password: string; displayName: string; username: string; language?: string }) =>
    api.post<Wrapped<AuthResponse>>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<Wrapped<User>>('/auth/login', data).then((r) => r.data),

  logout: () => api.post<void>('/auth/logout'),

  getMe: () => api.get<Wrapped<User>>('/auth/me').then((r) => r.data),

  verifyEmail: (token: string) =>
    api.post<Wrapped<AuthResponse>>('/auth/verify-email', { token }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<Wrapped<{ status: 'sent' }>>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post<Wrapped<{ message: string }>>('/auth/reset-password', data).then((r) => r.data),

  requestEmailChange: (data: { newEmail: string; currentPassword: string }) =>
    api.post<Wrapped<{ message: string }>>('/auth/request-email-change', data).then((r) => r.data),

  confirmEmailChange: (token: string) =>
    api.post<Wrapped<{ message: string }>>('/auth/confirm-email-change', { token }).then((r) => r.data),

  completeOnboarding: (data: { displayName?: string; username?: string; language?: string; gender?: string; dob?: string }) =>
    api.post<Wrapped<User>>('/auth/complete-onboarding', data).then((r) => r.data),

  completeFramework: () =>
    api.post<Wrapped<User>>('/auth/complete-framework').then((r) => r.data),

  checkUsername: (username: string) =>
    api.get<Wrapped<{ available: boolean; reason?: 'invalid' | 'taken' }>>(`/auth/check-username?username=${encodeURIComponent(username)}`).then((r) => r.data),

  linkGoogle: (data: { token: string; password: string }) =>
    api.post<Wrapped<User>>('/auth/link-google', data).then((r) => r.data),
};
