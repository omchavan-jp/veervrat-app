import { api } from './client';

type Wrapped<T> = { data: T };

export const dataExportApi = {
  /** Immediate JSON download (requires session). */
  async download(): Promise<unknown> {
    const res = await api.get<Wrapped<unknown>>('/users/me/data-export');
    return res.data;
  },

  /** Send a 24-hour download link to the user's email. */
  async emailLink(): Promise<void> {
    await api.post('/users/me/data-export/email');
  },
};
