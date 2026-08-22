import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wipeUsers, readConfig, MAX_USERS_TO_WIPE } from './wipe-users';

function makePrisma(count: number) {
  return {
    user: { count: vi.fn().mockResolvedValue(count) },
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  };
}

const uat = { confirm: 'uat', environment: 'uat' };

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('wipeUsers', () => {
  it('does nothing when no confirmation is given', async () => {
    const prisma = makePrisma(5);
    expect(await wipeUsers(prisma as never, { confirm: '', environment: 'uat' })).toBe(0);
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('refuses when the confirmation names a different environment', async () => {
    // The guard that matters: a value left in one environment's configuration, or copied into
    // another, must not wipe the environment it lands in.
    const prisma = makePrisma(5);
    const code = await wipeUsers(prisma as never, { confirm: 'uat', environment: 'prod' });

    expect(code).toBe(1);
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('refuses a generic affirmative — the confirmation must name the target', async () => {
    const prisma = makePrisma(5);
    const code = await wipeUsers(prisma as never, { confirm: 'yes', environment: 'uat' });

    expect(code).toBe(1);
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('refuses above the threshold, because that is no longer a disposable dataset', async () => {
    const prisma = makePrisma(MAX_USERS_TO_WIPE + 1);
    const code = await wipeUsers(prisma as never, uat);

    expect(code).toBe(1);
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('wipes when confirmed and the dataset is small', async () => {
    const prisma = makePrisma(6);
    prisma.user.count.mockResolvedValueOnce(6).mockResolvedValueOnce(0);

    const code = await wipeUsers(prisma as never, uat);

    expect(code).toBe(0);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith('TRUNCATE TABLE "users" CASCADE');
  });

  it('truncates only `users`, letting CASCADE resolve the rest', async () => {
    // A hand-maintained table list would silently miss a table added later that references a
    // user. Naming one table keeps this correct as the schema grows.
    const prisma = makePrisma(2);
    prisma.user.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    await wipeUsers(prisma as never, uat);

    const sql = prisma.$executeRawUnsafe.mock.calls[0][0] as string;
    expect(sql).toContain('"users"');
    expect(sql).toContain('CASCADE');
    expect(sql).not.toContain('cms_pages');
    expect(sql).not.toContain('virtues');
  });

  it('fails if accounts survive the wipe', async () => {
    const prisma = makePrisma(3);
    prisma.user.count.mockResolvedValueOnce(3).mockResolvedValueOnce(3);

    expect(await wipeUsers(prisma as never, uat)).toBe(1);
  });

  it('is a no-op when there is nothing to remove', async () => {
    const prisma = makePrisma(0);
    expect(await wipeUsers(prisma as never, uat)).toBe(0);
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});

describe('readConfig', () => {
  it('trims, so a stray newline from a shell does not defeat the name match', () => {
    const c = readConfig({ WIPE_USERS_CONFIRM: ' uat\n', ENVIRONMENT: 'uat' });
    expect(c.confirm).toBe('uat');
    expect(c.environment).toBe('uat');
  });

  it('treats absent values as empty rather than undefined', () => {
    expect(readConfig({})).toEqual({ confirm: '', environment: '' });
  });
});
