/**
 * Blanket key-parity test for en/mr message files.
 *
 * Asserts that messages/en.json and messages/mr.json have identical sets of
 * nested keys. Prevents drift where a key exists in one locale but not the
 * other — which surfaces as a missing-translation fallback at runtime.
 *
 * Background: the locale bug in renderWithProviders (#211) was latent because
 * parity happened to hold, but nothing enforced it. This test pins that state.
 */
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import mr from '@/messages/mr.json';

/** Recursively collect all leaf key paths from a nested object. */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

describe('i18n key parity', () => {
  const enKeys = collectKeys(en);
  const mrKeys = collectKeys(mr);

  it('en.json and mr.json have the same number of keys', () => {
    expect(enKeys.length).toBe(mrKeys.length);
  });

  it('every en key exists in mr', () => {
    const mrSet = new Set(mrKeys);
    const enOnly = enKeys.filter((k) => !mrSet.has(k));
    expect(enOnly).toEqual([]);
  });

  it('every mr key exists in en', () => {
    const enSet = new Set(enKeys);
    const mrOnly = mrKeys.filter((k) => !enSet.has(k));
    expect(mrOnly).toEqual([]);
  });

  it('has a non-trivial number of keys (sanity)', () => {
    // Guard against an empty import silently passing all the parity checks
    expect(enKeys.length).toBeGreaterThan(100);
  });
});
