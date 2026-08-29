import { describe, it, expect } from 'vitest';

/**
 * Deleting an account used to end with an alarming lie.
 *
 * `selfDelete` anonymises, and anonymising calls `forceLogout`, which destroys every session for
 * that user server-side. The settings page then called `logout.mutate()` — a POST behind
 * `SessionGuard`, against a session that no longer existed. It could only answer
 * SESSION_EXPIRED, and the global mutation handler raised "Your session has expired" at somebody
 * who had just deleted their account. Reproduced on UAT: the deletion had in fact succeeded, and
 * the only thing on screen said otherwise.
 *
 * This asserts the shape of the success path rather than mounting the whole settings screen: the
 * defect was an extra call, so the thing worth pinning is that the call is gone.
 */
describe('deleting an account does not call logout afterwards', () => {
  it('the source no longer calls logout on the delete path', async () => {
    // The assertion above describes the handler; this one checks the file actually matches it.
    // Without it the description could drift away from the code and keep passing.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('app/(app)/settings/page.tsx', 'utf8');

    const del = src.slice(src.indexOf('const del = useMutation('));
    const handler = del.slice(0, del.indexOf('onError'));

    expect(handler).toContain('qc.clear()');
    expect(handler).toContain('notice=account_deleted');
    expect(handler).not.toContain('logout.mutate()');

    // Positive control: the slice really is the delete handler, so `not.toContain` above is
    // meaningful rather than vacuously true on an empty string.
    expect(handler).toContain('deleteAccount');
    expect(handler.length).toBeGreaterThan(100);
  });

  it('useLogout is no longer imported by the settings page', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('app/(app)/settings/page.tsx', 'utf8');
    expect(src).toContain("from '@/hooks/use-auth'");
    expect(src).not.toContain('useLogout');
  });
});
