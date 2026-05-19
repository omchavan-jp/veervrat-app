import { api } from './client';

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'MENTOR' | 'MODERATOR' | 'ADMIN';
  emailVerifiedAt: string | null;
  onboardingCompletedAt: string | null;
};

type AuthResponse = User & { message: string };
type Wrapped<T> = { data: T };

export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<Wrapped<AuthResponse>>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<Wrapped<User>>('/auth/login', data).then((r) => r.data),

  logout: () => api.post<void>('/auth/logout'),

  getMe: () => api.get<Wrapped<User>>('/auth/me').then((r) => r.data),

  verifyEmail: (token: string) =>
    api.post<Wrapped<AuthResponse>>('/auth/verify-email', { token }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<Wrapped<{ message: string }>>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post<Wrapped<{ message: string }>>('/auth/reset-password', data).then((r) => r.data),

  completeOnboarding: (data: { name?: string }) =>
    api.post<Wrapped<User>>('/auth/complete-onboarding', data).then((r) => r.data),
};
