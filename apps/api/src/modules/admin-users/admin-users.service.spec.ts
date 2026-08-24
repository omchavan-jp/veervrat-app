import { describe, it, expect, vi } from 'vitest';
import { Capability, JourneyState, Role } from '@prisma/client';
import { AdminUsersService } from './admin-users.service';
import {
  AccessDeniedException,
  EntityInUseException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const base: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@x.com',
  displayName: 'U',
  username: 'u',
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  accountSetupCompletedAt: new Date(),
  onboardingCompletedAt: new Date(),
};
const ADMIN: SessionUser = { ...base, id: 'admin-1', roles: [Role.ADMIN] };
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };
const VA: SessionUser = { ...base, id: 'va-1', roles: [Role.VRATARTHI] };

function make(
  overrides: Record<string, any> = {},
  authOverrides: Record<string, any> = {},
  journeyOverrides: Record<string, any> = {},
) {
  const repo = {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    findDetail: vi
      .fn()
      .mockResolvedValue({ id: 'u9', journeys: [], testAttempts: [], experienceLogs: [] }),
    findById: vi.fn().mockResolvedValue({
      id: 'u9',
      displayName: 'Target',
      username: 'target_u',
      suspendedAt: null,
      anonymisedAt: null,
      deletedAt: null,
      roles: [{ role: Role.VRATARTHI }],
    }),
    addRoles: vi.fn().mockResolvedValue(undefined),
    removeRoles: vi.fn().mockResolvedValue(undefined),
    setSuspended: vi.fn().mockResolvedValue({ id: 'u9', suspendedAt: new Date() }),
    anonymise: vi
      .fn()
      .mockResolvedValue({ id: 'u9', anonymisedAt: new Date(), deletedAt: new Date() }),
    cancelPendingInvitations: vi.fn().mockResolvedValue({ count: 1 }),
    ...overrides,
  } as any;
  const auth = { forceLogout: vi.fn().mockResolvedValue(undefined), ...authOverrides } as any;
  const journeys = {
    adminOverrideState: vi
      .fn()
      .mockResolvedValue({ from: JourneyState.ACTIVE, to: JourneyState.PAUSED }),
    ...journeyOverrides,
  } as any;
  const users = {
    anonymiseAccount: vi.fn().mockResolvedValue({ id: 'u9', anonymisedAt: new Date() }),
  } as any;
  const capabilitiesRepo = {
    listForUser: vi.fn().mockResolvedValue([]),
    listDetailedForUser: vi.fn().mockResolvedValue([]),
    grant: vi.fn().mockResolvedValue(true),
    revoke: vi.fn().mockResolvedValue(true),
  } as any;
  const audit = { record: vi.fn() } as any;
  return {
    service: new AdminUsersService(repo, auth, journeys, users, capabilitiesRepo, audit),
    repo,
    auth,
    journeys,
    users,
    capabilitiesRepo,
    audit,
  };
}

describe('AdminUsersService', () => {
  it('NEGATIVE: moderator cannot list users', async () => {
    const { service } = make();
    await expect(service.list(MOD)).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('NEGATIVE: vratarthi cannot view a user', async () => {
    const { service } = make();
    await expect(service.getDetail(VA, 'u9')).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('admin lists + views users', async () => {
    const { service, repo } = make();
    await service.list(ADMIN);
    await service.getDetail(ADMIN, 'u9');
    expect(repo.list).toHaveBeenCalled();
    expect(repo.findDetail).toHaveBeenCalledWith('u9');
  });

  it('view 404 when user missing', async () => {
    const { service } = make({ findDetail: vi.fn().mockResolvedValue(null) });
    await expect(service.getDetail(ADMIN, 'u9')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('admin assigns a role', async () => {
    const { service, repo } = make();
    await service.updateRoles(ADMIN, 'u9', { add: [Role.MODERATOR] });
    expect(repo.addRoles).toHaveBeenCalledWith('u9', [Role.MODERATOR]);
  });

  it('admin cannot remove their own ADMIN role', async () => {
    const { service } = make();
    await expect(
      service.updateRoles(ADMIN, 'admin-1', { remove: [Role.ADMIN] }),
    ).rejects.toBeInstanceOf(EntityInUseException);
  });

  it('suspend sets flag and force-logs-out', async () => {
    const { service, repo, auth } = make();
    await service.setSuspended(ADMIN, 'u9', true);
    expect(repo.setSuspended).toHaveBeenCalledWith('u9', expect.any(Date));
    expect(auth.forceLogout).toHaveBeenCalledWith('u9');
  });

  it('unsuspend clears flag, no force-logout', async () => {
    const { service, repo, auth } = make();
    await service.setSuspended(ADMIN, 'u9', false);
    expect(repo.setSuspended).toHaveBeenCalledWith('u9', null);
    expect(auth.forceLogout).not.toHaveBeenCalled();
  });

  it('admin cannot suspend self', async () => {
    const { service } = make();
    await expect(service.setSuspended(ADMIN, 'admin-1', true)).rejects.toBeInstanceOf(
      EntityInUseException,
    );
  });

  it('anonymise delegates to the shared UsersService.anonymiseAccount seam', async () => {
    const { service, users } = make();
    await service.anonymise(ADMIN, 'u9', { reason: 'gdpr request' });
    expect(users.anonymiseAccount).toHaveBeenCalledWith('u9');
  });

  it('anonymise rejects already-anonymised', async () => {
    const { service } = make({
      findById: vi.fn().mockResolvedValue({ id: 'u9', anonymisedAt: new Date() }),
    });
    await expect(service.anonymise(ADMIN, 'u9', { reason: 'again please' })).rejects.toBeInstanceOf(
      EntityInUseException,
    );
  });

  it('admin cannot anonymise self', async () => {
    const { service } = make();
    await expect(
      service.anonymise(ADMIN, 'admin-1', { reason: 'self delete' }),
    ).rejects.toBeInstanceOf(EntityInUseException);
  });

  it('journey override returns from/to', async () => {
    const { service, journeys } = make();
    const r = await service.overrideJourneyState(ADMIN, 'j1', {
      state: JourneyState.PAUSED,
      reason: 'stuck',
    });
    expect(journeys.adminOverrideState).toHaveBeenCalledWith('j1', JourneyState.PAUSED);
    expect(r).toEqual({ id: 'j1', from: JourneyState.ACTIVE, to: JourneyState.PAUSED });
  });

  it('NEGATIVE: non-admin cannot override journey state', async () => {
    const { service } = make();
    await expect(
      service.overrideJourneyState(MOD, 'j1', { state: JourneyState.PAUSED, reason: 'x' }),
    ).rejects.toBeInstanceOf(AccessDeniedException);
  });
});

describe('AdminUsersService.updateCapabilities', () => {
  const admin = ADMIN;

  it('grants and audits exactly what changed', async () => {
    const { service, capabilitiesRepo, audit } = make();

    await service.updateCapabilities(admin, 'u9', { add: [Capability.FEEDBACK_WIDGET] });

    expect(capabilitiesRepo.grant).toHaveBeenCalledWith('u9', Capability.FEEDBACK_WIDGET, admin.id);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.capability.granted', resourceId: 'u9' }),
    );
  });

  it('records the unique username, not just displayName, in the audit metadata (#144)', async () => {
    // Display names collide — three accounts in pre-production already share "Om Chavan" — so
    // reconstructing "who was this granted to?" from an audit row needs something unique.
    // resourceId answers that too, but the metadata should not be silently ambiguous on its own.
    const { service, audit } = make();

    await service.updateCapabilities(admin, 'u9', { add: [Capability.FEEDBACK_WIDGET] });

    const call = audit.record.mock.calls[0][0] as { metadata: Record<string, unknown> };
    expect(call.metadata).toMatchObject({ displayName: 'Target', username: 'target_u' });
  });

  it('records the username on a revoke too', async () => {
    const { service, audit } = make();

    await service.updateCapabilities(admin, 'u9', { remove: [Capability.FEEDBACK_WIDGET] });

    const call = audit.record.mock.calls[0][0] as { metadata: Record<string, unknown> };
    expect(call.metadata).toMatchObject({ username: 'target_u' });
  });

  it('does not audit a grant that changed nothing', async () => {
    // An audit log that fills with grants that did not happen is worse than no log.
    const { service, capabilitiesRepo, audit } = make();
    capabilitiesRepo.grant.mockResolvedValue(false);

    await service.updateCapabilities(admin, 'u9', { add: [Capability.FEEDBACK_WIDGET] });

    expect(audit.record).not.toHaveBeenCalled();
  });

  it('audits a revoke', async () => {
    const { service, audit } = make();

    await service.updateCapabilities(admin, 'u9', { remove: [Capability.FEEDBACK_WIDGET] });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.capability.revoked' }),
    );
  });

  it('does not audit a revoke that changed nothing', async () => {
    const { service, capabilitiesRepo, audit } = make();
    capabilitiesRepo.revoke.mockResolvedValue(false);

    await service.updateCapabilities(admin, 'u9', { remove: [Capability.FEEDBACK_WIDGET] });

    expect(audit.record).not.toHaveBeenCalled();
  });

  it('revokes before granting, so add+remove of the same capability ends granted', async () => {
    const { service, capabilitiesRepo } = make();

    await service.updateCapabilities(admin, 'u9', {
      add: [Capability.FEEDBACK_WIDGET],
      remove: [Capability.FEEDBACK_WIDGET],
    });

    expect(capabilitiesRepo.revoke.mock.invocationCallOrder[0]).toBeLessThan(
      capabilitiesRepo.grant.mock.invocationCallOrder[0],
    );
  });

  it('refuses a non-admin', async () => {
    const { service, capabilitiesRepo } = make();

    await expect(
      service.updateCapabilities(VA, 'u9', {
        add: [Capability.FEEDBACK_WIDGET],
      }),
    ).rejects.toThrow();
    expect(capabilitiesRepo.grant).not.toHaveBeenCalled();
  });
});
