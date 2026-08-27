import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/error-message';
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

/**
 * Injected by `Providers` once the toast context is available. `MutationCache.onError` runs
 * outside the React tree, so it cannot call `useToast` directly — this bridges the gap.
 *
 * Mutations that provide their own `onError` still fire this callback (TanStack Query calls
 * both), so per-mutation handlers can *replace* the message, but to **suppress** the global
 * toast entirely, set `meta: { silent: true }` on the mutation options.
 */
let globalErrorToast: ((message: string) => void) | null = null;

export function setMutationErrorToast(fn: ((message: string) => void) | null): void {
  globalErrorToast = fn;
}

export function makeQueryClient() {
  // The cache callbacks close over `client` but only run after construction returns, so the
  // self-reference is safe.
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => invalidateUserOnForbidden(client, error, query.queryKey),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        invalidateUserOnForbidden(client, error);

        // Show a global error toast only for mutations that lack their own `onError`.
        // TanStack Query fires both: the per-mutation handler AND the cache-level handler.
        // If the mutation already shows a toast via its own `onError`, the global one
        // would duplicate it. `meta: { silent: true }` is an explicit opt-out for the
        // rare case where `onError` exists but the global toast is still unwanted.
        if (mutation.options.onError || mutation.meta?.silent) return;
        if (globalErrorToast) {
          globalErrorToast(errorMessage(error, 'Something went wrong. Please try again.'));
        }
      },
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
