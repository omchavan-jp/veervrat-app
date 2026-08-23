/**
 * Which policy documents this person has not yet accepted at their current version.
 *
 * Both documents already say, in both languages, that a material change means being asked to
 * accept the new version — so this is not a feature, it is a promise the published text has been
 * making since the day it went live.
 *
 * Compares against the **highest** version the person has accepted, not the latest row. Consents
 * are append-only and a row exists per version, so ordering by acceptance time would give the
 * wrong answer for anyone who accepted v2 and then, through some future path, recorded a v1 row.
 *
 * A document the person has never seen counts as outstanding. A document the database does not
 * know about is not — the server decides what exists, and a stale client naming a removed
 * document must not be able to block anyone.
 */
export type AcceptedConsent = { documentKey: string; version: number };

export function outstandingConsents(
  accepted: AcceptedConsent[],
  current: Map<string, number>,
): { documentKey: string; version: number }[] {
  const highest = new Map<string, number>();
  for (const { documentKey, version } of accepted) {
    const seen = highest.get(documentKey);
    if (seen === undefined || version > seen) highest.set(documentKey, version);
  }

  const outstanding: { documentKey: string; version: number }[] = [];
  for (const [documentKey, version] of current) {
    if ((highest.get(documentKey) ?? -1) < version) {
      outstanding.push({ documentKey, version });
    }
  }

  // Stable order so the client renders the same sequence every time rather than whatever the
  // database happened to return.
  return outstanding.sort((a, b) => a.documentKey.localeCompare(b.documentKey));
}
