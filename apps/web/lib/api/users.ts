import { api } from './client';
import type { User } from './auth';

type Wrapped<T> = { data: T };

export const usersApi = {
  updateMe: (data: { language?: string; displayName?: string; username?: string }) =>
    api.patch<Wrapped<User>>('/users/me', data).then((r) => r.data),
};
