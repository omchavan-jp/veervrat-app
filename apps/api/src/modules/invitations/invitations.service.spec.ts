import { describe, it, expect, vi } from 'vitest';
import { InvitationType, InvitationStatus, Role } from '@prisma/client';
import { InvitationsService } from './invitations.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
  InvitationExpiredException,
  InvitationNotPendingException,
  InvitationNotCancellableException,
  InvitationReminderAlreadySentException,
  PendingGlobalVmInviteException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const VA: SessionUser = {
  id: 'va-1',
  email: 'va@x.com',
  displayName: 'VA User',
  username: 'va',
  roles: [Role.VRATARTHI],
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  accountSetupCompletedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const VM: SessionUser = {
  id: 'vm-1',
  email: 'vm@x.com',
  displayName: 'VM User',
  username: 'vm',
  roles: [Role.VRATMITRA],
  language: 'EN',
  gender: null,
  dob: null,
  avatarUrl: null,
  emailVerifiedAt: new Date(),
  accountSetupCompletedAt: new Date(),
  onboardingCompletedAt: new Date(),
};

const OTHER_VA: SessionUser = { ...VA, id: 'other-va-1', email: 'other@x.com' };

const PENDING_INVITE = {
  id: 'inv-1',
  inviterId: VA.id,
  inviteeEmail: VM.email,
  inviteeId: VM.id,
  type: InvitationType.VM_GLOBAL,
  scopeId: null,
  token: 'abc-token',
  status: InvitationStatus.PENDING,
  channel: 'IN_APP' as const,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  acceptedAt: null,
  createdAt: new Date(),
};

const JOURNEY_INVITE = {
  ...PENDING_INVITE,
  id: 'inv-2',
  type: InvitationType.VM_JOURNEY,
  scopeId: 'j-1',
  token: 'def-token',
};

function makeInvitationsRepo(overrides: Record<string, unknown> = {}) {
  return {
    create: vi.fn().mockResolvedValue(PENDING_INVITE),
    findByToken: vi.fn().mockResolvedValue(PENDING_INVITE),
    findById: vi.fn().mockResolvedValue(PENDING_INVITE),
    findPendingGlobalVmByInviter: vi.fn().mockResolvedValue(null),
    updateStatus: vi
      .fn()
      .mockImplementation((id, status) => Promise.resolve({ ...PENDING_INVITE, status })),
    markReminderSent: vi.fn().mockResolvedValue({ ...PENDING_INVITE, reminderSentAt: new Date() }),
    listByInviter: vi.fn().mockResolvedValue([PENDING_INVITE]),
    grantVratmitraRole: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeVmRelationshipsService(overrides: Record<string, unknown> = {}) {
  return {
    createFromGlobalInvite: vi.fn().mockResolvedValue({}),
    createFromJourneyInvite: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeUsersService(overrides: Record<string, unknown> = {}) {
  return {
    findByEmail: vi.fn().mockResolvedValue({
      id: VM.id,
      email: VM.email,
      displayName: VM.displayName,
      language: 'EN',
    }),
    findById: vi.fn().mockResolvedValue({
      id: VA.id,
      email: VA.email,
      displayName: VA.displayName,
      language: 'EN',
    }),
    findByUsernameWithEmail: vi
      .fn()
      .mockResolvedValue({ id: VM.id, username: 'vm', email: VM.email }),
    ...overrides,
  };
}

function makeJourneysRepo(overrides: Record<string, unknown> = {}) {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'j-1',
      vratarthiId: VA.id,
      vmAssignments: [],
      globalVmRelationship: null,
    }),
    buildJourneySlim: vi.fn().mockReturnValue({
      id: 'j-1',
      vratarthiId: VA.id,
      vmAssignments: [],
      globalVmRelationship: null,
    }),
    ...overrides,
  };
}

function makeEmailService() {
  return {
    renderTemplate: vi.fn().mockResolvedValue({ html: '<html/>', text: 'text' }),
    sendNotification: vi.fn(),
  };
}

function makeConfigService() {
  return { get: vi.fn().mockReturnValue('http://localhost:3000') };
}

function makeNotificationsService() {
  return { create: vi.fn().mockResolvedValue(undefined) };
}

function makeService(
  invitationsRepo = makeInvitationsRepo(),
  vmRelSvc = makeVmRelationshipsService(),
  usersSvc = makeUsersService(),
  journeysRepo = makeJourneysRepo(),
) {
  const svc = Object.create(InvitationsService.prototype) as InvitationsService;
  const s = svc as unknown as Record<string, unknown>;
  s['invitationsRepository'] = invitationsRepo;
  s['vmRelationshipsService'] = vmRelSvc;
  s['usersService'] = usersSvc;
  s['journeysRepository'] = journeysRepo;
  s['emailService'] = makeEmailService();
  s['notificationsService'] = makeNotificationsService();
  s['configService'] = makeConfigService();
  s['frontendUrl'] = 'http://localhost:3000';
  return svc;
}

// ─── sendVmInvitation ─────────────────────────────────────────────────────────

describe('InvitationsService — sendVmInvitation', () => {
  it('AUTH MATRIX POSITIVE: VA can send VM_GLOBAL invitation', async () => {
    const repo = makeInvitationsRepo();
    const svc = makeService(repo);
    await svc.sendVmInvitation(VA, { type: InvitationType.VM_GLOBAL, inviteeEmail: VM.email });
    expect(repo.create).toHaveBeenCalled();
  });

  it('AUTH MATRIX NEGATIVE: VM-only user cannot send invitation (403)', async () => {
    const svc = makeService();
    await expect(
      svc.sendVmInvitation(VM, { type: InvitationType.VM_GLOBAL, inviteeEmail: 'x@x.com' }),
    ).rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: second VM_GLOBAL invite while one pending → 409 PendingGlobalVmInviteException', async () => {
    const repo = makeInvitationsRepo({
      findPendingGlobalVmByInviter: vi.fn().mockResolvedValue(PENDING_INVITE),
    });
    const svc = makeService(repo);
    await expect(
      svc.sendVmInvitation(VA, { type: InvitationType.VM_GLOBAL, inviteeEmail: VM.email }),
    ).rejects.toThrow(PendingGlobalVmInviteException);
  });

  it('NEGATIVE: VA cannot send journey VM invite for journey they do not own', async () => {
    const journeysRepo = makeJourneysRepo({
      findById: vi.fn().mockResolvedValue({
        id: 'j-1',
        vratarthiId: 'other-va',
        vmAssignments: [],
        globalVmRelationship: null,
      }),
    });
    const svc = makeService(
      makeInvitationsRepo(),
      makeVmRelationshipsService(),
      makeUsersService(),
      journeysRepo,
    );
    await expect(
      svc.sendVmInvitation(VA, {
        type: InvitationType.VM_JOURNEY,
        inviteeEmail: VM.email,
        scopeId: 'j-1',
      }),
    ).rejects.toThrow(AccessDeniedException);
  });

  it('resolves a username to the user email (search-found invitee, email not client-exposed)', async () => {
    const repo = makeInvitationsRepo();
    const usersSvc = makeUsersService({
      findByUsernameWithEmail: vi
        .fn()
        .mockResolvedValue({ id: VM.id, username: 'veer', email: VM.email }),
      findByEmail: vi.fn().mockResolvedValue({
        id: VM.id,
        email: VM.email,
        displayName: VM.displayName,
        language: 'EN',
      }),
    });
    const svc = makeService(repo, makeVmRelationshipsService(), usersSvc);
    await svc.sendVmInvitation(VA, { type: InvitationType.VM_GLOBAL, inviteeUsername: 'veer' });
    expect(usersSvc.findByUsernameWithEmail).toHaveBeenCalledWith('veer');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ inviteeEmail: VM.email }));
  });

  it('PLATFORM: any authenticated user (even VM-only) can send a platform invite', async () => {
    const repo = makeInvitationsRepo({
      create: vi
        .fn()
        .mockResolvedValue({ ...PENDING_INVITE, type: InvitationType.PLATFORM, scopeId: null }),
    });
    const svc = makeService(repo);
    const result = await svc.sendVmInvitation(VM, {
      type: InvitationType.PLATFORM,
      inviteeEmail: 'newcomer@x.com',
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: InvitationType.PLATFORM, scopeId: null }),
    );
    expect(result.shareMessage).toContain('http://localhost:3000/signup?invite=');
  });

  it('NEGATIVE: PLATFORM + inviteeUsername (a found existing user) is rejected', async () => {
    const repo = makeInvitationsRepo();
    const svc = makeService(repo);
    await expect(
      svc.sendVmInvitation(VA, { type: InvitationType.PLATFORM, inviteeUsername: 'veer' }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

// ─── sendReminder ─────────────────────────────────────────────────────────────

describe('InvitationsService — sendReminder', () => {
  it('sends the one allowed reminder and stamps reminderSentAt', async () => {
    const repo = makeInvitationsRepo({
      findById: vi
        .fn()
        .mockResolvedValue({ ...PENDING_INVITE, inviterId: VA.id, reminderSentAt: null }),
      markReminderSent: vi
        .fn()
        .mockResolvedValue({ ...PENDING_INVITE, reminderSentAt: new Date() }),
    });
    const svc = makeService(repo);
    await svc.sendReminder(VA, PENDING_INVITE.id);
    expect(repo.markReminderSent).toHaveBeenCalledWith(PENDING_INVITE.id);
  });

  it('NEGATIVE: second reminder rejected', async () => {
    const repo = makeInvitationsRepo({
      findById: vi
        .fn()
        .mockResolvedValue({ ...PENDING_INVITE, inviterId: VA.id, reminderSentAt: new Date() }),
    });
    const svc = makeService(repo);
    await expect(svc.sendReminder(VA, PENDING_INVITE.id)).rejects.toThrow(
      InvitationReminderAlreadySentException,
    );
  });

  it('NEGATIVE: non-inviter cannot remind (403)', async () => {
    const repo = makeInvitationsRepo({
      findById: vi
        .fn()
        .mockResolvedValue({ ...PENDING_INVITE, inviterId: VA.id, reminderSentAt: null }),
    });
    const svc = makeService(repo);
    await expect(svc.sendReminder(OTHER_VA, PENDING_INVITE.id)).rejects.toThrow(
      AccessDeniedException,
    );
  });

  it('NEGATIVE: reminder on a non-pending invitation rejected', async () => {
    const repo = makeInvitationsRepo({
      findById: vi.fn().mockResolvedValue({
        ...PENDING_INVITE,
        inviterId: VA.id,
        status: InvitationStatus.ACCEPTED,
        reminderSentAt: null,
      }),
    });
    const svc = makeService(repo);
    await expect(svc.sendReminder(VA, PENDING_INVITE.id)).rejects.toThrow(
      InvitationNotPendingException,
    );
  });
});

// ─── acceptInvitation ─────────────────────────────────────────────────────────

describe('InvitationsService — acceptInvitation', () => {
  it('AUTH MATRIX POSITIVE: invitee (VM) can accept their own invitation', async () => {
    const vmRelSvc = makeVmRelationshipsService();
    const svc = makeService(makeInvitationsRepo(), vmRelSvc);
    await svc.acceptInvitation(VM, 'abc-token');
    expect(vmRelSvc.createFromGlobalInvite).toHaveBeenCalledWith(VA.id, VM.id, expect.any(Date));
  });

  it('AUTH MATRIX NEGATIVE: wrong user cannot accept (403)', async () => {
    const svc = makeService();
    await expect(svc.acceptInvitation(OTHER_VA, 'abc-token')).rejects.toThrow(
      AccessDeniedException,
    );
  });

  it('NEGATIVE: non-existent token → 404', async () => {
    const repo = makeInvitationsRepo({ findByToken: vi.fn().mockResolvedValue(null) });
    const svc = makeService(repo);
    await expect(svc.acceptInvitation(VM, 'bad-token')).rejects.toThrow(EntityNotFoundException);
  });

  it('NEGATIVE: expired invitation → 422 InvitationExpiredException', async () => {
    const repo = makeInvitationsRepo({
      findByToken: vi
        .fn()
        .mockResolvedValue({ ...PENDING_INVITE, expiresAt: new Date(Date.now() - 1000) }),
    });
    const svc = makeService(repo);
    await expect(svc.acceptInvitation(VM, 'abc-token')).rejects.toThrow(InvitationExpiredException);
  });

  it('NEGATIVE: non-pending invitation → 409 InvitationNotPendingException', async () => {
    const repo = makeInvitationsRepo({
      findByToken: vi
        .fn()
        .mockResolvedValue({ ...PENDING_INVITE, status: InvitationStatus.ACCEPTED }),
    });
    const svc = makeService(repo);
    await expect(svc.acceptInvitation(VM, 'abc-token')).rejects.toThrow(
      InvitationNotPendingException,
    );
  });

  it('POSITIVE: accepted VM_JOURNEY creates JourneyVmAssignment via VmRelationshipsService', async () => {
    const vmRelSvc = makeVmRelationshipsService();
    const repo = makeInvitationsRepo({ findByToken: vi.fn().mockResolvedValue(JOURNEY_INVITE) });
    const svc = makeService(repo, vmRelSvc);
    await svc.acceptInvitation(VM, 'def-token');
    expect(vmRelSvc.createFromJourneyInvite).toHaveBeenCalledWith('j-1', VM.id, expect.any(Date));
  });
});

// ─── declineInvitation ────────────────────────────────────────────────────────

describe('InvitationsService — declineInvitation', () => {
  it('AUTH MATRIX POSITIVE: invitee can decline their own invitation', async () => {
    const repo = makeInvitationsRepo();
    const svc = makeService(repo);
    await svc.declineInvitation(VM, 'abc-token');
    expect(repo.updateStatus).toHaveBeenCalledWith(PENDING_INVITE.id, InvitationStatus.DECLINED);
  });

  it('AUTH MATRIX NEGATIVE: wrong user cannot decline (403)', async () => {
    const svc = makeService();
    await expect(svc.declineInvitation(OTHER_VA, 'abc-token')).rejects.toThrow(
      AccessDeniedException,
    );
  });
});

// ─── cancelInvitation ─────────────────────────────────────────────────────────

describe('InvitationsService — cancelInvitation', () => {
  it('AUTH MATRIX POSITIVE: VA can cancel their own pending invitation', async () => {
    const repo = makeInvitationsRepo();
    const svc = makeService(repo);
    await svc.cancelInvitation(VA, 'inv-1');
    expect(repo.updateStatus).toHaveBeenCalledWith(PENDING_INVITE.id, InvitationStatus.CANCELLED);
  });

  it('AUTH MATRIX NEGATIVE: different VA cannot cancel (403)', async () => {
    const svc = makeService();
    await expect(svc.cancelInvitation(OTHER_VA, 'inv-1')).rejects.toThrow(AccessDeniedException);
  });

  it('NEGATIVE: cannot cancel already-accepted invitation → 409', async () => {
    const repo = makeInvitationsRepo({
      findById: vi.fn().mockResolvedValue({ ...PENDING_INVITE, status: InvitationStatus.ACCEPTED }),
    });
    const svc = makeService(repo);
    await expect(svc.cancelInvitation(VA, 'inv-1')).rejects.toThrow(
      InvitationNotCancellableException,
    );
  });
});
