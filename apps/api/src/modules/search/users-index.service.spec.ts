import { describe, it, expect, vi } from 'vitest';
import { UsersIndexService } from './users-index.service';

function makeService(index: Record<string, unknown> | null) {
  const meili = {
    enabled: index !== null,
    index: vi.fn().mockReturnValue(index),
    ensureIndex: vi.fn().mockResolvedValue(undefined),
  };
  const service = new UsersIndexService(meili as never);
  return { service, meili };
}

describe('UsersIndexService', () => {
  it('upsert delegates to the index addDocuments', async () => {
    const addDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
    const { service } = makeService({ addDocuments });
    await service.upsert({ id: 'u1', username: 'om', displayName: 'Om', isPublic: true });
    expect(addDocuments).toHaveBeenCalledWith([{ id: 'u1', username: 'om', displayName: 'Om', isPublic: true }]);
  });

  it('indexed document never contains an email field', async () => {
    const addDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
    const { service } = makeService({ addDocuments });
    await service.upsert({ id: 'u1', username: 'om', displayName: 'Om', isPublic: true });
    const doc = addDocuments.mock.calls[0][0][0];
    expect(doc).not.toHaveProperty('email');
  });

  it('swallows a sync failure (never throws into the write path)', async () => {
    const addDocuments = vi.fn().mockRejectedValue(new Error('meili down'));
    const { service } = makeService({ addDocuments });
    await expect(
      service.upsert({ id: 'u1', username: 'om', displayName: 'Om', isPublic: true }),
    ).resolves.toBeUndefined();
  });

  it('search returns [] when Meili is disabled', async () => {
    const { service } = makeService(null);
    expect(await service.search('om', 'req-1')).toEqual([]);
  });

  it('search filters isPublic, excludes self, and returns ids in order', async () => {
    const search = vi.fn().mockResolvedValue({
      hits: [{ id: 'a' }, { id: 'req-1' }, { id: 'b' }],
    });
    const { service } = makeService({ search });
    const ids = await service.search('om', 'req-1');
    expect(search).toHaveBeenCalledWith('om', expect.objectContaining({ filter: 'isPublic = true' }));
    expect(ids).toEqual(['a', 'b']);
  });

  it('search returns [] on backend error', async () => {
    const search = vi.fn().mockRejectedValue(new Error('boom'));
    const { service } = makeService({ search });
    expect(await service.search('om', 'req-1')).toEqual([]);
  });
});
