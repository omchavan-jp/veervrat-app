import { describe, it, expect } from 'vitest';
import { splitCsvRows, parseWeaknessNames, TIER_MAP } from './seed-utils';

describe('splitCsvRows', () => {
  it('parses a simple CSV with no quoting', () => {
    const rows = splitCsvRows('name_en,name_mr\nSelf-reliance,स्वावलंबन\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['name_en', 'name_mr']);
    expect(rows[1]).toEqual(['Self-reliance', 'स्वावलंबन']);
  });

  it('handles quoted fields containing commas', () => {
    const rows = splitCsvRows('a,b\n"hello, world",plain\n');
    expect(rows[1][0]).toBe('hello, world');
    expect(rows[1][1]).toBe('plain');
  });

  it('handles quoted fields containing embedded newlines', () => {
    const rows = splitCsvRows('text,subvirtue\n"line one\nline two",Initiative\n');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('line one\nline two');
    expect(rows[1][1]).toBe('Initiative');
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const rows = splitCsvRows('a\n"say ""hello"""\n');
    expect(rows[1][0]).toBe('say "hello"');
  });

  it('handles CRLF line endings', () => {
    const rows = splitCsvRows('a,b\r\nfoo,bar\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(['foo', 'bar']);
  });

  it('does not produce a trailing empty row', () => {
    const rows = splitCsvRows('a\nfoo\n');
    expect(rows).toHaveLength(2);
  });
});

describe('TIER_MAP', () => {
  it('maps all three tier values', () => {
    expect(TIER_MAP['local']).toBe('LOCAL');
    expect(TIER_MAP['national']).toBe('NATIONAL');
    expect(TIER_MAP['international']).toBe('INTERNATIONAL');
  });

  it('returns undefined for unknown tier', () => {
    expect(TIER_MAP['global']).toBeUndefined();
  });
});

describe('parseWeaknessNames', () => {
  it('parses pipe-delimited weakness names', () => {
    expect(parseWeaknessNames('Defeated mindset|Procrastination')).toEqual([
      'Defeated mindset',
      'Procrastination',
    ]);
  });

  it('handles single weakness with no pipe', () => {
    expect(parseWeaknessNames('Defeated mindset')).toEqual(['Defeated mindset']);
  });

  it('trims whitespace around names', () => {
    expect(parseWeaknessNames(' Fear | Doubt ')).toEqual(['Fear', 'Doubt']);
  });

  it('filters empty strings from trailing pipe', () => {
    expect(parseWeaknessNames('Fear|')).toEqual(['Fear']);
  });

  it('returns empty array for empty string', () => {
    expect(parseWeaknessNames('')).toEqual([]);
  });
});
