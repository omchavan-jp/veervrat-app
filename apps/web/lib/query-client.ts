import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

/**
 * A refusal is information: if the server says no, what this browser believes about the user is
 * out of date.
 *
 * Revoking a capability took effect on the API immediately — grants are read per request — but
 * the browser holding an open tab was never told, so it kept rendering the control (#122). For
 * CONTENT_EDIT that is worse than never showing it: the toolbar appears, someone selects text
 * and types an edit, and it fails on save.
 *
 * So a 403 refetches the current user. The UI corrects itself on the first refusal instead of
 * waiting for a reload, and it does so without a push channel or a polling loop.
 *
 * 401 is deliberately NOT handled here — a dead session is a different problem with its own
 * handler (`setUnauthorizedHandler`), and treating both the same would send someone to /login
 * for merely lacking one capability.
 */
function invalidateUserOnForbidden(client: QueryClient, error: unknown, queryKey?: unknown): void {
  if (!(error instanceof ApiError) || error.statusCode !== 403) return;

  // Never react to the user query refusing — it answers 401/200, never 403, but if that ever
  // changed this would refetch itself in a loop. `use-auth.ts` documents a request storm this
  // codebase has already lived through (~200 calls a second); the guard costs one comparison.
  if (Array.isArray(queryKey) && queryKey[0] === queryKeys.auth.me[0]) return;

  void client.invalidateQueries({ queryKey: queryKeys.auth.me });
}

export function makeQueryClient() {
  // The cache callbacks close over `client` but only run after construction returns, so the
  // self-reference is safe.
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => invalidateUserOnForbidden(client, error, query.queryKey),
    }),
    mutationCache: new MutationCache({
      onError: (error) => invalidateUserOnForbidden(client, error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });

  return client;
}
