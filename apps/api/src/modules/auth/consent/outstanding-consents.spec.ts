import { describe, it, expect } from 'vitest';
import { outstandingConsents } from './outstanding-consents';

const current = new Map([
  ['privacy', 2],
  ['terms', 2],
]);

describe('outstandingConsents', () => {
  it('returns nothing when everything current has been accepted', () => {
    expect(
      outstandingConsents(
        [
          { documentKey: 'terms', version: 2 },
          { documentKey: 'privacy', version: 2 },
        ],
        current,
      ),
    ).toEqual([]);
  });

  it('reports a document whose version has moved past what was accepted', () => {
    // The whole point of a version bump: everyone on v1 is asked again.
    expect(
      outstandingConsents(
        [
          { documentKey: 'terms', version: 1 },
          { documentKey: 'privacy', version: 1 },
        ],
        current,
      ),
    ).toEqual([
      { documentKey: 'privacy', version: 2 },
      { documentKey: 'terms', version: 2 },
    ]);
  });

  it('reports a document never accepted at all', () => {
    expect(outstandingConsents([], current)).toHaveLength(2);
  });

  it('uses the highest accepted version, not the most recent row', () => {
    // Consents are append-only, one row per version. Ordering by time would let a stray older
    // row re-prompt someone who has already accepted the current text.
    expect(
      outstandingConsents(
        [
          { documentKey: 'terms', version: 2 },
          { documentKey: 'terms', version: 1 },
          { documentKey: 'privacy', version: 2 },
        ],
        current,
      ),
    ).toEqual([]);
  });

  it('ignores documents the database does not have', () => {
    // The server decides what exists. A stale client holding a removed document must not be
    // able to block anyone behind a prompt for something that is gone.
    expect(
      outstandingConsents([{ documentKey: 'terms', version: 2 }], new Map([['terms', 2]])),
    ).toEqual([]);
  });

  it('handles a version that somehow ran ahead of the document', () => {
    // Accepting v5 of a document now at v2 is not outstanding. Treating "not equal" as
    // outstanding would trap that person in a prompt they cannot clear.
    expect(
      outstandingConsents([{ documentKey: 'terms', version: 5 }], new Map([['terms', 2]])),
    ).toEqual([]);
  });

  it('is ordered deterministically', () => {
    const out = outstandingConsents(
      [],
      new Map([
        ['terms', 2],
        ['privacy', 2],
      ]),
    );
    expect(out.map((o) => o.documentKey)).toEqual(['privacy', 'terms']);
  });
});
