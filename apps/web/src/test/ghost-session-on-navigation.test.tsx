import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/messages/en.json';
import { queryKeys } from '@/lib/api/query-keys';

/**
 * A signed-out session must stop rendering guarded pages, and it must stop on navigation rather
 * than only on reload.
 *
 * Confirmed broken on UAT 2026-08-29: after signing out in another tab, `/study` kept rendering
 * while `/journeys` redirected. The difference was not the guard — it was that journeys fetched
 * data and got a 401, and study did not. The auth query has a 60s `staleTime` and client-side
 * navigation inside this group never remounts the layout, so nothing revalidated.
 *
 * These assert the revalidation, not the redirect. The redirect already worked whenever
 * something happened to ask the api — which is exactly why the defect survived task 4.3.
 */
let pathname = '/dashboard';
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock('@/lib/runtime-config-provider', () => ({
  useRuntimeConfig: () => ({ contentEditEnabled: false }),
}));
vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/shared/launcher/action-launcher', () => ({ ActionLauncher: () => null }));
vi.mock('@/components/shared/consent-gate', () => ({
  ConsentGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const getMe = vi.fn();
vi.mock('@/lib/api/auth', () => ({ authApi: { getMe: () => getMe() } }));

import { AppLayoutClient } from '@/app/(app)/layout-client';

const SIGNED_IN = {
  id: 'u1',
  email: 'a@b.c',
  displayName: 'A',
  username: 'a',
  onboardingCompletedAt: '2026-01-01T00:00:00Z',
  roles: [],
};

function mount(client: QueryClient) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <QueryClientProvider client={client}>
        <AppLayoutClient>
          <div>guarded content</div>
        </AppLayoutClient>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

/** A client shaped like the real one: auth is seeded, and stays fresh for 60s. */
function seededClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  client.setQueryData(queryKeys.auth.me, SIGNED_IN);
  return client;
}

beforeEach(() => {
  pathname = '/dashboard';
  replace.mockReset();
  getMe.mockReset();
});
afterEach(cleanup);

describe('a dead session stops rendering when the route changes', () => {
  it('does NOT re-ask on first render — the server already resolved the session', async () => {
    getMe.mockResolvedValue(SIGNED_IN);
    mount(seededClient());

    // The page was server-rendered with the session already resolved. Asking again immediately
    // would repeat work just done, on every page load, for everyone.
    await waitFor(() => expect(replace).not.toHaveBeenCalled());
    expect(getMe).not.toHaveBeenCalled();
  });

  it('re-asks when the route changes, even though the cache is still fresh', async () => {
    getMe.mockResolvedValue(SIGNED_IN);
    const client = seededClient();
    const { rerender } = mount(client);

    pathname = '/study';
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <QueryClientProvider client={client}>
          <AppLayoutClient>
            <div>guarded content</div>
          </AppLayoutClient>
        </QueryClientProvider>
      </NextIntlClientProvider>,
    );

    // Cache is 55s from expiring, so nothing else would have asked. This is the assertion the
    // defect turned on: `/study` renders from cache and never touches the api by itself.
    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(1));
  });

  it('redirects once that re-ask comes back signed-out', async () => {
    getMe.mockResolvedValue(null);
    const client = seededClient();
    const { rerender } = mount(client);

    pathname = '/study';
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <QueryClientProvider client={client}>
          <AppLayoutClient>
            <div>guarded content</div>
          </AppLayoutClient>
        </QueryClientProvider>
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('a still-valid session is not disturbed by navigating', async () => {
    getMe.mockResolvedValue(SIGNED_IN);
    const client = seededClient();
    const { rerender } = mount(client);

    pathname = '/journeys';
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <QueryClientProvider client={client}>
          <AppLayoutClient>
            <div>guarded content</div>
          </AppLayoutClient>
        </QueryClientProvider>
      </NextIntlClientProvider>,
    );

    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(1));
    // Positive control for the redirect assertions above: signed in, so no redirect. Without
    // this, "not redirected" could mean the guard never ran at all.
    expect(replace).not.toHaveBeenCalled();
  });
});
