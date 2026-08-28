import { describe, it, expect } from 'vitest';
import { BlogsIndexService } from './blogs-index.service';
import { SearchUnavailableException } from './search-unavailable.exception';

describe('BlogsIndexService', () => {
  const service = new BlogsIndexService();

  it('upsert is a no-op (does not throw)', async () => {
    await expect(
      service.upsert({ id: 'b1', title: 'T', bodyText: 'hello' }),
    ).resolves.toBeUndefined();
  });

  it('remove is a no-op (does not throw)', async () => {
    await expect(service.remove('b1')).resolves.toBeUndefined();
  });

  it('search throws SearchUnavailableException', async () => {
    await expect(service.search('veer')).rejects.toThrow(SearchUnavailableException);
  });

  it('SearchUnavailableException carries the entity type', async () => {
    await expect(service.search('veer')).rejects.toThrow('blogs');
  });
});
