import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '@/messages/en.json';
import mr from '@/messages/mr.json';

/**
 * Returning from a Google re-authentication puts you back where you were (#208).
 *
 * ⚠️ These read the settings page's source rather than rendering it. The page is ~1000 lines
 * behind a runtime config provider, an auth query and several mutations; a render harness for it
 * would be a larger and less reliable thing than what it tests, and the parts that matter here —
 * *which* state is set, and *whether the once-only guard is still once-only* — are structural.
 *
 * That is a weaker check than rendering, and a far stronger one than a render test that never
 * reaches the branch. The behaviour a person actually sees is task 5.1, on a deployed environment
 * with a Google-only account, because an account with a password never takes this path.
 */
const PAGE = readFileSync(join(process.cwd(), 'app', '(app)', 'settings', 'page.tsx'), 'utf8');

describe('returning to the flow you were in', () => {
  // ⚠️ Asserted as a PAIR, deliberately. `setDeleteOpen(true)` also appears in the button that
  // opens the dialog normally, and `takeEmailDraft()` can sit there with its result unused — so
  // checking for either alone passes with the restore removed. A control run proved exactly that.
  it('reopens the delete dialog when that is what the person was doing', () => {
    expect(PAGE).toMatch(/reauthReturn\.flow === 'delete'\)\s*\{\s*setDeleteOpen\(true\)/);
  });

  it('restores the typed address for an email change', () => {
    expect(PAGE).toMatch(
      /reauthReturn\.flow === 'email'\)\s*\{\s*const draft = takeEmailDraft\(\);/,
    );
  });

  it('never overwrites something the person has since typed', () => {
    // Restoring into a field that already has a value would discard the newer input, which is a
    // worse failure than the one being fixed.
    expect(PAGE).toMatch(/f\.newEmail \? f :/);
  });

  it('reports verifying as a different Google account, inside the flow', () => {
    // This outcome existed and said nothing at all. "The page looks untouched" is the defect.
    expect(PAGE).toMatch(/reauthWrongAccount/);
    expect(PAGE).toMatch(/wrong_account/);
  });

  it('carries the flow out on both verification links', () => {
    // Matched as literals: the call contains `getRuntimeConfig()`, so a `[^)]*` character class
    // stops at the wrong bracket — which is how this assertion was wrong on its first run.
    expect(PAGE).toContain("verifyWithGoogleUrl(getRuntimeConfig().apiBaseUrl, 'email')");
    expect(PAGE).toContain("verifyWithGoogleUrl(getRuntimeConfig().apiBaseUrl, 'delete')");
  });

  it('saves the draft before the browser leaves', () => {
    expect(PAGE).toMatch(/saveEmailDraft\(emailForm\.newEmail\)/);
  });

  it('clears the draft once the change has gone through', () => {
    expect(PAGE).toMatch(/clearEmailDraft\(\)/);
  });
});

describe('what must not regress', () => {
  it('still reads the proof once into state, not off the URL on every render', () => {
    // Fixed 2026-08-29: the proof is single-use and expires in minutes; a query parameter does
    // neither. A page re-reading the URL would go on claiming "verified" long after the server
    // had dropped the stamp, and clicking then failed for a reason the page was contradicting.
    expect(PAGE).toMatch(/useState\(\(\) => reauthReturn\.outcome === 'ok'\)/);
  });

  it('still clears the proof when the server says it is stale', () => {
    // The other half of that fix. Without it a dead button sits there insisting it will work.
    expect(PAGE).toMatch(/clearReauthOnStaleProof/);
    expect(PAGE).toMatch(/REAUTHENTICATION_REQUIRED/);
  });

  it('restores only once, so a closed dialog does not spring back', () => {
    // The URL that triggers restoration does not go away on its own. Without a guard, any
    // re-render would reopen a dialog the person had deliberately closed.
    expect(PAGE).toMatch(/restoredRef/);
    expect(PAGE).toMatch(/restoredRef\.current = true/);
  });
});

describe('copy', () => {
  it('exists in both languages', () => {
    const e = (en as { settings: Record<string, string> }).settings;
    const m = (mr as { settings: Record<string, string> }).settings;
    expect(e['reauthWrongAccount']).toBeTruthy();
    expect(m['reauthWrongAccount']).toBeTruthy();
    // It has to say the verification was for a different account — "something went wrong" would
    // leave somebody with two Google accounts guessing, which is the common case here.
    expect(e['reauthWrongAccount'].toLowerCase()).toContain('different');
  });
});
