import { describe, it, expect } from 'vitest';
import { extractUploadKeys } from './upload-references';

const image = (src: string) => ({ type: 'image', attrs: { src } });
const doc = (...content: unknown[]) => ({ type: 'doc', content });

describe('extractUploadKeys', () => {
  it('finds keys in an absolute URL, as deployed environments produce', () => {
    expect(
      extractUploadKeys(doc(image('https://api.uat.veervrat.example/api/v1/uploads/abc-1.png'))),
    ).toEqual(['abc-1.png']);
  });

  it('finds keys in a relative URL, as local development produces', () => {
    expect(extractUploadKeys(doc(image('/api/v1/uploads/abc-1.png')))).toEqual(['abc-1.png']);
  });

  it('finds images nested anywhere, not just at the top level', () => {
    const nested = doc({
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [image('/api/v1/uploads/deep.png')] }],
    });
    expect(extractUploadKeys(nested)).toEqual(['deep.png']);
  });

  it('de-duplicates the same image used twice', () => {
    expect(
      extractUploadKeys(doc(image('/api/v1/uploads/same.png'), image('/api/v1/uploads/same.png'))),
    ).toEqual(['same.png']);
  });

  it('ignores unrelated images', () => {
    // Binding one of these would attach an arbitrary external URL to a log as though it were
    // an upload of ours.
    expect(
      extractUploadKeys(
        doc(
          image('https://example.com/cat.png'),
          image('https://example.com/uploads/cat.png'),
          image('/api/v1/uploads/real.png'),
        ),
      ),
    ).toEqual(['real.png']);
  });

  it('does not walk off a path that only starts like an upload URL', () => {
    // Anchored at the end, so a longer path cannot smuggle a key out of a directory.
    expect(extractUploadKeys(doc(image('/api/v1/uploads/a.png/../../secret')))).toEqual([]);
  });

  it.each([[null], [undefined], [{}], [[]], ['a string'], [42]])(
    'returns nothing for %p rather than throwing',
    (body) => {
      expect(extractUploadKeys(body)).toEqual([]);
    },
  );
});
