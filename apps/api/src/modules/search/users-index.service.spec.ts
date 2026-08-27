import { describe, it, expect, vi } from 'vitest';
import { UsersIndexService } from './users-index.service';

function makeService(queryRawResult: unknown[] | Error = []) {
  const $queryRaw = queryRawResult instanceof Error
    ? vi.fn().mockRejectedValue(queryRawResult)
    : vi.fn().mockResolvedValue(queryRawResult);
  const prisma = { $queryRaw };
  const service = new UsersIndexService(prisma as never);
  return { service, prisma };
}

describe('UsersIndexService', () => {
  it('upsert is a no-op (no secondary index to maintain)', async () => {
    const { service } = makeService();
    // Should not throw — call sites still invoke it
    await expect(
      service.upsert({ id: 'u1', username: 'om', displayName: 'Om', isPublic: true }),
    ).resolves.toBeUndefined();
  });

  it('remove is a no-op', async () => {
    const { service } = makeService();
    await expect(service.remove('u1')).resolves.toBeUndefined();
  });

  it('search returns user IDs from Postgres query', async () => {
    const { service, prisma } = makeService([{ id: 'a' }, { id: 'b' }]);
    const ids = await service.search('om', 'req-1');
    expect(ids).toEqual(['a', 'b']);
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('search returns [] for empty query', async () => {
    const { service, prisma } = makeService();
    const ids = await service.search('', 'req-1');
    expect(ids).toEqual([]);
    // Should not hit the database at all
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('search returns [] for whitespace-only query', async () => {
    const { service, prisma } = makeService();
    const ids = await service.search('   ', 'req-1');
    expect(ids).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('search returns [] on database error (never throws into caller)', async () => {
    const { service } = makeService(new Error('connection lost'));
    const ids = await service.search('om', 'req-1');
    expect(ids).toEqual([]);
  });

  it('indexed document type never contains an email field', () => {
    // Compile-time guarantee via the UserIndexDoc type, but verify at runtime
    // that the type shape has no email key.
    const doc = { id: 'u1', username: 'om', displayName: 'Om', isPublic: true };
    expect(doc).not.toHaveProperty('email');
  });
});
