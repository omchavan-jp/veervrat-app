/**
 * The policy documents a new account agrees to.
 *
 * Only the document keys. The **version is resolved by the server** at the moment of acceptance:
 * a page loaded before an administrator bumped a document would otherwise record agreement to
 * text the person never read — a record that looks authoritative and is false, which is worse
 * than no record at all.
 *
 * Acceptance is stored per version, because a boolean cannot answer "did they agree to *this*
 * version" once a document changes, and that is the only question that matters when terms change.
 */
export const CURRENT_CONSENTS: { documentKey: string; version: number }[] = [
  // `version` is required by the request shape and ignored by the server, which substitutes the
  // published one. Kept at 1 rather than removed so the contract stays explicit about being
  // server-authoritative.
  { documentKey: 'terms', version: 1 },
  { documentKey: 'privacy', version: 1 },
];
