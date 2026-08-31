import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '@/messages/en.json';
import mr from '@/messages/mr.json';

/**
 * Signup has two successful outcomes, and the person has to be told which one happened.
 *
 * The account is created and committed before the verification mail is sent. When the send failed,
 * the API returned a 500 — so the person was told signup had failed, while the account existed:
 * address taken, unverified, unreachable. Resending would have fixed it and they had no reason to
 * try, having been told there was no account (#141).
 *
 * The request now succeeds and reports `verificationEmailSent`. Showing "check your email" for a
 * mail that was never sent would be the same failure wearing a friendlier face.
 *
 * ⚠️ These read the page source rather than rendering it. The success view sits behind
 * `signup.isSuccess`, reachable only through multi-step form validation that is covered elsewhere
 * and is not what this is about — and a render test that never reaches the branch passes whether
 * the branch exists or not. Reading the source is a weaker check than rendering, and a far
 * stronger one than a test that cannot fail.
 */
const PAGE = readFileSync(
  join(process.cwd(), 'app', '(public)', 'signup', 'page.tsx'),
  'utf8',
);

const S = en.auth.signup as Record<string, string>;
const SM = (mr as { auth: { signup: Record<string, string> } }).auth.signup;

describe('signup — when the verification email did not send', () => {
  it('branches on what the API reported, not on the request having succeeded', () => {
    expect(PAGE).toMatch(/verificationEmailSent/);
    // `!== false` rather than truthiness: the field is absent on older responses, and absent must
    // read as sent. Treating undefined as "not sent" would tell every successful signup that the
    // mail had failed.
    expect(PAGE).toMatch(/verificationEmailSent\s*!==\s*false/);
  });

  it('sends them to a page that can actually resend, not to login', () => {
    // /verify-email mounts ResendVerificationForm. /login — where the ordinary success path goes —
    // leaves them exactly as stuck as before, because an unverified account cannot sign in.
    expect(PAGE).toMatch(/'\/verify-email'/);
    const verifyPage = readFileSync(
      join(process.cwd(), 'app', '(public)', 'verify-email', 'page.tsx'),
      'utf8',
    );
    expect(verifyPage).toMatch(/ResendVerificationForm/);
  });

  it('has distinct copy for the two outcomes, in both languages', () => {
    for (const [label, node] of [
      ['en', S],
      ['mr', SM],
    ] as const) {
      for (const key of ['successNoEmailTitle', 'successNoEmailBody', 'successNoEmailAction']) {
        expect(node[key], `${label}.${key} must exist`).toBeTruthy();
      }
      // If these ever collapse into the same sentence, the branch still runs while telling
      // everybody the same thing — which is the failure this whole change is about.
      expect(node['successNoEmailTitle'], label).not.toBe(node['successTitle']);
      expect(node['successNoEmailBody'], label).not.toBe(node['successBody']);
    }
  });

  it('does not tell someone their account is missing when it exists', () => {
    // The old behaviour's core mistake, asserted as copy. The account was created; saying or
    // implying otherwise is what sent people away from an address they now owned.
    expect(S.successNoEmailBody.toLowerCase()).toContain('account');
    expect(S.successNoEmailBody.toLowerCase()).not.toMatch(/failed|could not create|try again later/);
  });
});
