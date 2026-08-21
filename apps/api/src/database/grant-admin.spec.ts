import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role } from '@prisma/client';
import { grantAdmin, readConfig, AUDIT_ACTION } from './grant-admin';

type UserRow = {
  id: string;
  email: string;
  username: string;
  emailVerifiedAt: Date | null;
  roles: { role: Role }[];
};

function makePrisma(user: UserRow | null) {
  return {
    user: { findUnique: vi.fn().mockResolvedValue(user) },
    userRole: { create: vi.fn().mockResolvedValue({}) },
    auditEvent: { create: vi.fn().mockResolvedValue({}) },
  };
}

const verifiedVratarthi: UserRow = {
  id: 'u-1',
  email: 'om.chavan@jnanaprabodhini.org',
  username: 'om_chavan_admin',
  emailVerifiedAt: new Date('2026-08-21T00:00:00Z'),
  roles: [{ role: Role.VRATARTHI }],
};

const deps = { email: verifiedVratarthi.email, allowUnverified: false };

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('grantAdmin', () => {
  it('grants ADMIN when the user does not have it', async () => {
    const prisma = makePrisma(verifiedVratarthi);
    const code = await grantAdmin(prisma as never, deps);

    expect(code).toBe(0);
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'u-1', role: Role.ADMIN },
    });
  });

  it('preserves existing roles — the grant is additive, never a replacement', async () => {
    const prisma = makePrisma(verifiedVratarthi);
    await grantAdmin(prisma as never, deps);

    // Nothing may delete or overwrite the user's existing roles.
    expect(prisma.userRole.create).toHaveBeenCalledTimes(1);
    const audited = prisma.auditEvent.create.mock.calls[0][0].data.metadata;
    expect(audited.rolesBefore).toEqual([Role.VRATARTHI]);
    expect(audited.rolesAfter).toEqual([Role.VRATARTHI, Role.ADMIN]);
  });

  it('writes an awaited audit row naming the action and the target', async () => {
    const prisma = makePrisma(verifiedVratarthi);
    await grantAdmin(prisma as never, deps);

    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AUDIT_ACTION,
          resourceType: 'user',
          resourceId: 'u-1',
        }),
      }),
    );
  });

  it('fails the job if the audit write fails — the record beats convenience here', async () => {
    const prisma = makePrisma(verifiedVratarthi);
    prisma.auditEvent.create.mockRejectedValue(new Error('db down'));

    await expect(grantAdmin(prisma as never, deps)).rejects.toThrow('db down');
  });

  it('is idempotent: an existing admin is left alone and writes no second audit row', async () => {
    const prisma = makePrisma({
      ...verifiedVratarthi,
      roles: [{ role: Role.VRATARTHI }, { role: Role.ADMIN }],
    });

    const code = await grantAdmin(prisma as never, deps);

    expect(code).toBe(0);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('exits non-zero when no user has that email, rather than silently doing nothing', async () => {
    const prisma = makePrisma(null);
    const code = await grantAdmin(prisma as never, deps);

    expect(code).toBe(1);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it('does nothing and exits 0 when no email is configured', async () => {
    const prisma = makePrisma(verifiedVratarthi);
    const code = await grantAdmin(prisma as never, { email: '', allowUnverified: false });

    expect(code).toBe(0);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('refuses an unverified address by default', async () => {
    const prisma = makePrisma({ ...verifiedVratarthi, emailVerifiedAt: null });
    const code = await grantAdmin(prisma as never, deps);

    expect(code).toBe(1);
    expect(prisma.userRole.create).not.toHaveBeenCalled();
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('grants an unverified address only when deliberately overridden', async () => {
    const prisma = makePrisma({ ...verifiedVratarthi, emailVerifiedAt: null });
    const code = await grantAdmin(prisma as never, { ...deps, allowUnverified: true });

    expect(code).toBe(0);
    expect(prisma.userRole.create).toHaveBeenCalled();
    // The override must be visible in the audit trail, not just in the operator's memory.
    expect(prisma.auditEvent.create.mock.calls[0][0].data.metadata.emailVerified).toBe(false);
  });
});

describe('readConfig', () => {
  it('trims the email so a stray newline from a shell does not cause a false "no such user"', () => {
    expect(readConfig({ BOOTSTRAP_ADMIN_EMAIL: '  a@b.c\n' }).email).toBe('a@b.c');
  });

  it('treats the override as opt-in only on an exact true', () => {
    expect(readConfig({ BOOTSTRAP_ADMIN_ALLOW_UNVERIFIED: 'TRUE' }).allowUnverified).toBe(true);
    expect(readConfig({ BOOTSTRAP_ADMIN_ALLOW_UNVERIFIED: '1' }).allowUnverified).toBe(false);
    expect(readConfig({}).allowUnverified).toBe(false);
  });
});
