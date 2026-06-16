import { describe, it, expect, vi } from 'vitest';
import { BlogsIndexService } from './blogs-index.service';

function makeService(index: Record<string, unknown> | null) {
  const meili = {
    enabled: index !== null,
    index: vi.fn().mockReturnValue(index),
    ensureIndex: vi.fn().mockResolvedValue(undefined),
  };
  return new BlogsIndexService(meili as never);
}

describe('BlogsIndexService', () => {
  it('upsert delegates to addDocuments', async () => {
    const addDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
    const svc = makeService({ addDocuments });
    await svc.upsert({ id: 'b1', title: 'T', bodyText: 'hello' });
    expect(addDocuments).toHaveBeenCalledWith([{ id: 'b1', title: 'T', bodyText: 'hello' }]);
  });

  it('swallows sync failure (never throws)', async () => {
    const addDocuments = vi.fn().mockRejectedValue(new Error('down'));
    const svc = makeService({ addDocuments });
    await expect(svc.upsert({ id: 'b1', title: 'T', bodyText: 'x' })).resolves.toBeUndefined();
  });

  it('search returns [] when disabled', async () => {
    const svc = makeService(null);
    expect(await svc.search('veer')).toEqual([]);
  });

  it('search returns hit ids', async () => {
    const search = vi.fn().mockResolvedValue({ hits: [{ id: 'b2' }, { id: 'b1' }] });
    const svc = makeService({ search });
    expect(await svc.search('veer')).toEqual(['b2', 'b1']);
  });

  it('search returns [] on backend error', async () => {
    const search = vi.fn().mockRejectedValue(new Error('boom'));
    const svc = makeService({ search });
    expect(await svc.search('veer')).toEqual([]);
  });
});
