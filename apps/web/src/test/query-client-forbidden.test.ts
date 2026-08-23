import { describe, it, expect, vi } from 'vitest';
import { makeQueryClient } from '@/lib/query-client';
import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

/** Drive a query to failure through the real cache, so the real onError path runs. */
async function failQuery(client: ReturnType<typeof makeQueryClient>, key: unknown[], error: unknown) {
  await client
    .fetchQuery({ queryKey: key, queryFn: () => Promise.reject(error), retry: false })
    .catch(() => undefined);
}

const forbidden = () => new ApiError(403, 'ACCESS_DENIED', 'Access denied');

describe('a 403 refetches the current user', () => {
  it('invalidates the user query when any request is refused', async () => {
    // The #122 case: the capability is gone server-side, but this browser still renders the
    // control. The refusal is the signal that what it believes is stale.
    const client = makeQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');

    await failQuery(client, ['content', 'save'], forbidden());

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.auth.me });
  });

  it('also reacts to a failed mutation, which is how a revoked editor actually fails', async () => {
    // A revoked CONTENT_EDIT shows its toolbar and fails on save — a mutation, not a query.
    const client = makeQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(forbidden()), retry: false })
      .execute(undefined)
      .catch(() => undefined);

    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.auth.me });
  });

  it('ignores statuses that are not 403', async () => {
    // 401 is a dead session — a different problem with its own handler. Treating them alike
    // would send someone to /login for merely lacking one capability.
    const client = makeQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');

    await failQuery(client, ['a'], new ApiError(401, 'UNAUTHORIZED', 'no session'));
    await failQuery(client, ['b'], new ApiError(500, 'INTERNAL_ERROR', 'boom'));
    await failQuery(client, ['c'], new Error('network'));

    expect(spy).not.toHaveBeenCalled();
  });

  it('never refetches itself in a loop when the user query is the one refused', async () => {
    // /auth/me answers 401 or 200, never 403 — but this codebase has already lived through a
    // request storm of ~200 calls a second, so the guard is cheap insurance.
    const client = makeQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');

    await failQuery(client, [...queryKeys.auth.me], forbidden());

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('focus refetching stays scoped', () => {
  it('is not turned on globally', () => {
    // #122 is fixed by refetching the *user* on focus. Making that a global default would put
    // every list and detail query on the same trigger — a much larger behaviour change than the
    // bug warrants, and this codebase has already had a request storm (~200 calls a second, see
    // use-auth.ts). The narrow setting lives on the user query itself.
    const defaults = makeQueryClient().getDefaultOptions().queries;

    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.staleTime).toBe(60 * 1000);
  });
});
