import { describe, it, expect } from 'vitest';
import { meetsMinimumAge, latestQualifyingDob, MINIMUM_AGE_YEARS } from './age';

const on = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('meetsMinimumAge', () => {
  const now = on('2026-08-22');

  it('accepts someone comfortably over the minimum', () => {
    expect(meetsMinimumAge(on('1990-01-01'), now)).toBe(true);
  });

  it('accepts someone whose birthday is today', () => {
    // Turning eighteen today qualifies today, not tomorrow.
    expect(meetsMinimumAge(on('2008-08-22'), now)).toBe(true);
  });

  it('rejects someone one day short', () => {
    expect(meetsMinimumAge(on('2008-08-23'), now)).toBe(false);
  });

  it('rejects someone clearly under', () => {
    expect(meetsMinimumAge(on('2015-06-01'), now)).toBe(false);
  });

  it('handles a 29 February birthday without drifting', () => {
    // Elapsed-milliseconds arithmetic gets this wrong; calendar comparison does not.
    expect(meetsMinimumAge(on('2008-02-29'), on('2026-02-28'))).toBe(false);
    expect(meetsMinimumAge(on('2008-02-29'), on('2026-03-01'))).toBe(true);
  });

  it('is not fooled by a birthday later this year', () => {
    expect(meetsMinimumAge(on('2008-12-31'), now)).toBe(false);
  });
});

describe('latestQualifyingDob', () => {
  it('is exactly the minimum age ago', () => {
    expect(latestQualifyingDob(on('2026-08-22')).toISOString().slice(0, 10)).toBe('2008-08-22');
  });

  it('is the boundary the picker should use as its maximum', () => {
    const boundary = latestQualifyingDob(on('2026-08-22'));
    expect(meetsMinimumAge(boundary, on('2026-08-22'))).toBe(true);
    const dayAfter = new Date(boundary.getTime() + 86_400_000);
    expect(meetsMinimumAge(dayAfter, on('2026-08-22'))).toBe(false);
  });

  it('uses the documented minimum', () => {
    expect(MINIMUM_AGE_YEARS).toBe(18);
  });
});
