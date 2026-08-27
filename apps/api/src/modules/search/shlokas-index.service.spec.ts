import { describe, it, expect } from 'vitest';
import { ShlokasIndexService } from './shlokas-index.service';
import { SearchUnavailableException } from './search-unavailable.exception';

describe('ShlokasIndexService', () => {
  const service = new ShlokasIndexService();

  it('upsert is a no-op (does not throw)', async () => {
    await expect(
      service.upsert({
        id: 's1',
        devanagariText: 'श्लोक',
        transliteration: 'shloka',
        meaningEn: 'verse',
        meaningMr: 'श्लोक',
        looseTags: ['dharma'],
      }),
    ).resolves.toBeUndefined();
  });

  it('remove is a no-op (does not throw)', async () => {
    await expect(service.remove('s1')).resolves.toBeUndefined();
  });

  it('search throws SearchUnavailableException', async () => {
    await expect(service.search('dharma')).rejects.toThrow(SearchUnavailableException);
  });

  it('SearchUnavailableException carries the entity type', async () => {
    await expect(service.search('dharma')).rejects.toThrow('shlokas');
  });
});
