/**
 * The platform is strictly 18+ (spec/decisions/21_age-and-personal-attributes.md).
 *
 * Kept as a pure function with an injectable "now" so the boundary can be tested without
 * mocking the clock — the interesting cases are exactly on the boundary, and a test that
 * cannot express "eighteen years ago today" cannot check them.
 */
export const MINIMUM_AGE_YEARS = 18;

/** The most recent date of birth that qualifies. Also the maximum a date picker should allow. */
export function latestQualifyingDob(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear() - MINIMUM_AGE_YEARS, now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Whether someone born on `dob` has reached the minimum age.
 *
 * Compares calendar dates rather than elapsed milliseconds: a duration in milliseconds gets
 * leap years subtly wrong, and "has their birthday happened yet this year" is a calendar
 * question, not an arithmetic one. Someone whose eighteenth birthday is today qualifies.
 */
export function meetsMinimumAge(dob: Date, now: Date = new Date()): boolean {
  const born = Date.UTC(dob.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate());
  return born <= latestQualifyingDob(now).getTime();
}
