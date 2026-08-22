/**
 * The platform is strictly 18+ (spec/decisions/21_age-and-personal-attributes.md).
 *
 * Mirrors the server rule in `apps/api/src/common/age/age.ts`. The client copy exists so someone
 * is told immediately rather than after a round trip — it is never the gate. The server checks
 * independently, and a client that disagrees is a bug, not a bypass.
 */
export const MINIMUM_AGE_YEARS = 18;

/** The most recent qualifying date of birth — also the maximum a date input should allow. */
export function latestQualifyingDob(now: Date = new Date()): Date {
  return new Date(now.getFullYear() - MINIMUM_AGE_YEARS, now.getMonth(), now.getDate());
}

/** `YYYY-MM-DD`, for a date input's `max` attribute and its initial position. */
export function latestQualifyingDobInputValue(now: Date = new Date()): string {
  const d = latestQualifyingDob(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Compares calendar dates rather than elapsed milliseconds: a duration gets leap years subtly
 * wrong, and "has their birthday happened yet" is a calendar question. Someone whose eighteenth
 * birthday is today qualifies.
 */
export function meetsMinimumAge(dobInput: string, now: Date = new Date()): boolean {
  const parts = dobInput.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [y, m, d] = parts;
  const boundary = latestQualifyingDob(now);
  const born = new Date(y, m - 1, d);
  return born.getTime() <= boundary.getTime();
}
