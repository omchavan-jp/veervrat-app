/**
 * The policy documents a new account agrees to, and the version they are shown.
 *
 * Versions are bumped deliberately when a change is material — not on every edit, or correcting
 * a typo would re-prompt every user. Acceptance is recorded per version, because a boolean
 * cannot answer "did they agree to *this* version" once a document changes, and that is the only
 * question that matters when the terms change.
 *
 * ⚠️ Bumping a number here without publishing the matching document version will record consent
 * to something that does not exist. Change both together.
 */
export const CURRENT_CONSENTS: { documentKey: string; version: number }[] = [
  { documentKey: 'terms', version: 1 },
  { documentKey: 'privacy', version: 1 },
];
