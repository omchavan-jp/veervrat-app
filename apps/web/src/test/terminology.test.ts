import { describe, it, expect } from 'vitest';
import enMessages from '../../messages/en.json';
import mrMessages from '../../messages/mr.json';

function flatten(obj: Record<string, unknown>, prefix = '', out: Record<string, string> = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      flatten(value as Record<string, unknown>, path, out);
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

describe('terminology — Primary vratmitra (#378)', () => {
  const enFlat = flatten(enMessages as Record<string, unknown>);
  const mrFlat = flatten(mrMessages as Record<string, unknown>);

  it('uses Primary Vratmitra for the account-wide vratmitra label', () => {
    expect(enFlat['my_vratmitras.global_vm']).toBe('Primary Vratmitra');
    expect(enFlat['invitations_flow.type.VM_GLOBAL']).toBe('Primary Vratmitra');
    expect(enFlat['settings.vratmitraGlobal']).toBe('Primary Vratmitra');
    expect(mrFlat['my_vratmitras.global_vm']).toBe('प्राइमरी व्रतमित्र');
    expect(mrFlat['invitations_flow.type.VM_GLOBAL']).toBe('प्राइमरी व्रतमित्र');
    expect(mrFlat['settings.vratmitraGlobal']).toBe('प्राइमरी व्रतमित्र');
  });

  it('uses Primary for the scope pill instead of Overall', () => {
    expect(enFlat['my_vratarthis.global_scope']).toBe('Primary');
    expect(enFlat['invitations_flow.scopeGlobal']).toBe('Primary');
    expect(mrFlat['my_vratarthis.global_scope']).toBe('प्राइमरी');
    expect(mrFlat['invitations_flow.scopeGlobal']).toBe('प्राइमरी');
  });

  it('describes the invitation and settings copy with primary', () => {
    expect(enFlat['invitations_flow.scopeGlobalOnly']).toContain('primary vratmitra');
    expect(enFlat['settings.vratmitraDesc']).toContain('primary Vratmitra');
    expect(enFlat['settings.vratmitraNone']).toBe('No primary Vratmitra yet.');
    expect(enFlat['settings.vratmitraChangeConfirm']).toContain('primary Vratmitra');
    expect(enFlat['settings.vratmitraRemoveConfirm']).toContain('primary Vratmitra');
    expect(mrFlat['invitations_flow.scopeGlobalOnly']).toContain('प्राइमरी व्रतमित्र');
    expect(mrFlat['settings.vratmitraDesc']).toContain('प्राइमरी व्रतमित्र');
    expect(mrFlat['settings.vratmitraNone']).toContain('प्राइमरी व्रतमित्र');
    expect(mrFlat['settings.vratmitraChangeConfirm']).toContain('प्राइमरी व्रतमित्र');
    expect(mrFlat['settings.vratmitraRemoveConfirm']).toContain('प्राइमरी व्रतमित्र');
  });

  it('keeps Journey Vratmitra distinct from Primary Vratmitra', () => {
    expect(enFlat['my_vratmitras.journey_vm']).toBe('Journey Vratmitra');
    expect(enFlat['invitations_flow.type.VM_JOURNEY']).toBe('Journey Vratmitra');
    expect(mrFlat['my_vratmitras.journey_vm']).toBe('प्रवास व्रतमित्र');
    expect(mrFlat['invitations_flow.type.VM_JOURNEY']).toBe('प्रवास व्रतमित्र');
  });

  it('does not use Global or Overall in current user-facing vratmitra terms', () => {
    const deprecated = [
      'my_vratmitras.global_vm',
      'my_vratarthis.global_scope',
      'invitations_flow.scopeGlobalOnly',
      'invitations_flow.type.VM_GLOBAL',
      'invitations_flow.scopeGlobal',
      'settings.vratmitraDesc',
      'settings.vratmitraGlobal',
      'settings.vratmitraNone',
      'settings.vratmitraChangeConfirm',
      'settings.vratmitraRemoveConfirm',
    ];
    for (const key of deprecated) {
      expect(enFlat[key]).not.toMatch(/global vratmitra|Global Vratmitra|Overall/i);
      expect(mrFlat[key]).not.toMatch(/जागतिक|वैश्विक|एकूण/);
    }
  });

  it('keeps EN and MR message keys aligned', () => {
    expect(Object.keys(mrFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });
});
