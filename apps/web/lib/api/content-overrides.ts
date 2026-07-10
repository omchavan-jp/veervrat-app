import { api } from './client';

type Wrapped<T> = { data: T };

export type OverrideLocale = 'en' | 'mr';

export type UpsertOverrideInput = {
  key: string;
  locale: OverrideLocale;
  value: string;
  // The value the editor started from — used for the server-side placeholder-parity guard.
  baseValue: string;
};

export const contentOverridesApi = {
  // PATCH (never PUT, per conventions): sets a single message key's override for a locale.
  upsert: (input: UpsertOverrideInput): Promise<{ key: string; locale: string }> =>
    api.patch<Wrapped<{ key: string; locale: string }>>('/content-overrides', input).then((r) => r.data),

  publish: (): Promise<{ prUrl: string; branch: string }> =>
    api
      .post<Wrapped<{ prUrl: string; branch: string }>>('/content-overrides/publish')
      .then((r) => r.data),
};
