import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The one place a person meets somebody else's writing must let them open it.
 *
 * A public profile rendered its "public experience entries" as plain text. Clicking did nothing,
 * which is the dead end `experience-log-view` task 2.3 asks about — and the public pool, which
 * has the link, is not reachable from the navigation at all (#253). So a profile was effectively
 * the only route in, and it went nowhere.
 *
 * The pool was fixed when the log finally got a page (#190). The profile was not, and nothing
 * connected the two.
 *
 * A source assertion rather than a render: the defect is a missing link, and the two files are
 * meant to agree. A positive control keeps the absence checks from passing on an empty read.
 */
const PROFILE = 'app/(app)/u/[username]/page.tsx';
const POOL = 'app/(content)/community/experiences/page.tsx';

function read(p: string) {
  const s = readFileSync(p, 'utf8');
  // Positive control: these assertions are about what a real file contains.
  expect(s.length).toBeGreaterThan(500);
  return s;
}

describe('public experiences are openable wherever they are shown', () => {
  it('the profile links each entry to its log', () => {
    const src = read(PROFILE);
    expect(src).toContain('/community/experiences/${e.id}');
  });

  it('the profile no longer renders the excerpt as unclickable text', () => {
    const src = read(PROFILE);
    // The exact shape it had: a bare paragraph carrying the excerpt and nothing else.
    expect(src).not.toContain('<p className="text-[14px] leading-relaxed">{excerptFromDoc(e.body)}</p>');
  });

  it('the pool and the profile point at the same route', () => {
    // If these ever diverge, one of the two places a log can be found stops working, and the
    // other keeps proving it is fine.
    expect(read(POOL)).toContain('/community/experiences/${e.id}');
    expect(read(PROFILE)).toContain('/community/experiences/${e.id}');
  });
});
