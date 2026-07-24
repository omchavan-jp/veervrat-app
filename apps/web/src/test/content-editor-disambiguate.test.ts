import { describe, it, expect } from 'vitest';
import { disambiguateKeys } from '@/lib/content-editor/disambiguate';

describe('content-editor disambiguateKeys', () => {
  it('returns a single key unchanged', () => {
    expect(disambiguateKeys(['a.b'], { insideDialog: false, routeSegments: [] })).toEqual([
      'a.b',
    ]);
  });

  it('narrows to the one key mentioning "modal" when clicked inside a dialog', () => {
    const keys = ['study.browser.whyLink', 'study.browser.whyModal.title', 'study.why.title'];
    expect(
      disambiguateKeys(keys, { insideDialog: true, routeSegments: ['study'] }),
    ).toEqual(['study.browser.whyModal.title']);
  });

  it('excludes modal-named keys when clicked outside a dialog', () => {
    const keys = ['study.browser.whyLink', 'study.browser.whyModal.title', 'study.why.link'];
    expect(
      disambiguateKeys(keys, { insideDialog: false, routeSegments: ['study'] }).sort(),
    ).toEqual(['study.browser.whyLink', 'study.why.link'].sort());
  });

  it('filters out keys from an unrelated top-level namespace via route segments', () => {
    const keys = ['study.why.title', 'profile.sectionAccount'];
    expect(
      disambiguateKeys(keys, { insideDialog: false, routeSegments: ['study'] }),
    ).toEqual(['study.why.title']);
  });

  it('falls back to the full set when filtering would remove everything', () => {
    const keys = ['journeys.detail.title', 'profile.title'];
    expect(
      disambiguateKeys(keys, { insideDialog: true, routeSegments: ['study'] }).sort(),
    ).toEqual(keys.sort());
  });
});
