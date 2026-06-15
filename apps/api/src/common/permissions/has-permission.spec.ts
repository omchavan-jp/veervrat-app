import { describe, it, expect } from 'vitest';
import { ErcStatus, Role, VmRelationshipState, ExperienceVisibility } from '@prisma/client';
import { hasPermission } from './has-permission';
import {
  JourneySlim,
  JourneyVmAssignmentSlim,
  VmRelationshipSlim,
  ErcSlim,
  ExperienceLogSlim,
  BlogSlim,
  BlogCommentSlim,
  TestAttemptSlim,
  InvitationSlim,
  PermissionResource,
} from './types';
import { SessionUser } from '../../modules/auth/types/auth.types';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeUser(roles: Role[], overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user-1',
    email: 'user@test.com',
    displayName: 'Test User',
    username: 'testuser',
    language: 'EN',
    gender: null,
    dob: null,
    avatarUrl: null,
    roles,
    emailVerifiedAt: new Date(),
    accountSetupCompletedAt: new Date(),
    onboardingCompletedAt: new Date(),
    ...overrides,
  };
}

function makeVmAssignment(vmId: string, state = VmRelationshipState.ACTIVE): JourneyVmAssignmentSlim {
  return { vmId, state };
}

function makeGlobalVmRel(vmId: string, vratarthiId: string, state = VmRelationshipState.ACTIVE): VmRelationshipSlim {
  return { vmId, vratarthiId, state };
}

function makeJourney(
  vratarthiId: string,
  vmAssignments: JourneyVmAssignmentSlim[] = [],
  globalVmRelationship: VmRelationshipSlim | null = null,
): JourneySlim {
  return { id: 'journey-1', vratarthiId, vmAssignments, globalVmRelationship };
}

function makeErc(createdById?: string, status: ErcStatus = ErcStatus.NOT_STARTED): ErcSlim {
  return { journeyId: 'journey-1', createdById, status };
}

function makeSubmittedErc(createdById?: string): ErcSlim {
  return { journeyId: 'journey-1', createdById, status: ErcStatus.SUBMITTED };
}

const VA = makeUser([Role.VRATARTHI]);
const VM = makeUser([Role.VRATMITRA], { id: 'vm-1' });
const ADMIN = makeUser([Role.ADMIN]);
const MOD = makeUser([Role.MODERATOR]);
const VA_ALSO_VM = makeUser([Role.VRATARTHI, Role.VRATMITRA]);

const ownJourney = makeJourney('user-1');
const otherJourney = makeJourney('other-user');

const journeyWithVm = makeJourney('user-1', [makeVmAssignment('vm-1')]);
const journeyWithOtherVm = makeJourney('user-1', [makeVmAssignment('other-vm')]);

const globalVmRel = makeGlobalVmRel('vm-1', 'user-1');
const journeyWithGlobalVm = makeJourney('user-1', [], globalVmRel);

// ─── Layer 1: Journey actions ─────────────────────────────────────────────────

describe('journey.create', () => {
  it('VA can create a journey', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'journey.create')).toBe(true);
  });
  it('VM (without VA role) cannot create a journey', () => {
    expect(hasPermission(VM, { type: 'platform' }, 'journey.create')).toBe(false);
  });
});

describe('journey.view', () => {
  const own: PermissionResource = { type: 'journey', journey: ownJourney };
  const other: PermissionResource = { type: 'journey', journey: otherJourney };
  const withVm: PermissionResource = { type: 'journey', journey: journeyWithVm };
  const withGlobal: PermissionResource = { type: 'journey', journey: journeyWithGlobalVm };

  it('VA can view their own journey', () => {
    expect(hasPermission(VA, own, 'journey.view')).toBe(true);
  });
  it("VA cannot view another VA's journey", () => {
    expect(hasPermission(VA, other, 'journey.view')).toBe(false);
  });
  it('journey VM can view their assigned journey', () => {
    expect(hasPermission(VM, withVm, 'journey.view')).toBe(true);
  });
  it('journey VM cannot view an unassigned journey', () => {
    expect(hasPermission(VM, own, 'journey.view')).toBe(false);
  });
  it('global VM can view journeys of their assigned VA', () => {
    expect(hasPermission(VM, withGlobal, 'journey.view')).toBe(true);
  });
  it('global VM from a different VA cannot view unrelated journey', () => {
    const unrelatedGlobal = makeJourney('other-user', [], makeGlobalVmRel('vm-1', 'other-user'));
    // VM is assigned to other-user, not user-1 — should not see own journey
    expect(hasPermission(VM, { type: 'journey', journey: ownJourney }, 'journey.view')).toBe(false);
  });
});

describe('journey.pause', () => {
  it('VA can pause their own journey', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'journey.pause')).toBe(true);
  });
  it('VM cannot pause a journey', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'journey.pause')).toBe(false);
  });
});

describe('journey.resume', () => {
  it('VA can resume their own journey', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'journey.resume')).toBe(true);
  });
  it('VM cannot resume a journey', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'journey.resume')).toBe(false);
  });
});

describe('journey.complete', () => {
  it('VA can submit their journey for completion', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'journey.complete')).toBe(true);
  });
  it('assigned journey VM can approve journey completion', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'journey.complete')).toBe(true);
  });
  it('unassigned VM cannot approve journey completion', () => {
    expect(hasPermission(VM, { type: 'journey', journey: ownJourney }, 'journey.complete')).toBe(false);
  });
});

// ─── Layer 1: ERC actions ─────────────────────────────────────────────────────

describe('erc.select', () => {
  const ercRes: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc() };
  it('VA can select ERC for their own journey', () => {
    expect(hasPermission(VA, ercRes, 'erc.select')).toBe(true);
  });
  it('VM cannot select ERC', () => {
    expect(hasPermission(VM, ercRes, 'erc.select')).toBe(false);
  });
});

describe('erc.suggest', () => {
  const assignedErc: PermissionResource = { type: 'erc', journey: journeyWithVm, erc: makeErc() };
  const unassignedErc: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc() };
  it('assigned VM can suggest ERC', () => {
    expect(hasPermission(VM, assignedErc, 'erc.suggest')).toBe(true);
  });
  it('VA cannot suggest ERC', () => {
    expect(hasPermission(VA, unassignedErc, 'erc.suggest')).toBe(false);
  });
  it('unassigned VM cannot suggest ERC', () => {
    expect(hasPermission(VM, unassignedErc, 'erc.suggest')).toBe(false);
  });
});

describe('erc.approve_closure', () => {
  const noVmJourney = makeJourney('user-1', []);
  const noVmErc: PermissionResource = { type: 'erc', journey: noVmJourney, erc: makeErc() };
  const withVmErc: PermissionResource = { type: 'erc', journey: journeyWithVm, erc: makeErc() };
  const assignedVmErc: PermissionResource = { type: 'erc', journey: journeyWithVm, erc: makeErc() };

  it('VA can self-approve when no VM is assigned', () => {
    expect(hasPermission(VA, noVmErc, 'erc.approve_closure')).toBe(true);
  });
  it('VA cannot self-approve when a VM is assigned', () => {
    expect(hasPermission(VA, withVmErc, 'erc.approve_closure')).toBe(false);
  });
  it('assigned VM can approve ERC closure', () => {
    expect(hasPermission(VM, assignedVmErc, 'erc.approve_closure')).toBe(true);
  });
  it('unassigned VM cannot approve ERC closure', () => {
    expect(hasPermission(VM, noVmErc, 'erc.approve_closure')).toBe(false);
  });
});

describe('erc.deactivate', () => {
  const ercRes: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc() };
  it('VA can deactivate ERC in their own journey', () => {
    expect(hasPermission(VA, ercRes, 'erc.deactivate')).toBe(true);
  });
  it('VM cannot deactivate ERC', () => {
    expect(hasPermission(VM, ercRes, 'erc.deactivate')).toBe(false);
  });
});

describe('erc.remove', () => {
  const ercRes: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc() };
  it('VA can remove ERC from their own journey', () => {
    expect(hasPermission(VA, ercRes, 'erc.remove')).toBe(true);
  });
  it('VM cannot remove ERC', () => {
    expect(hasPermission(VM, ercRes, 'erc.remove')).toBe(false);
  });
});

// ─── Layer 1: Custom ERC actions ─────────────────────────────────────────────

describe('custom_erc.create', () => {
  const ownErc: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc('user-1') };
  const assignedErc: PermissionResource = { type: 'erc', journey: journeyWithVm, erc: makeErc('vm-1') };
  it('VA can create custom ERC in their own journey', () => {
    expect(hasPermission(VA, ownErc, 'custom_erc.create')).toBe(true);
  });
  it('assigned VM can create custom ERC', () => {
    expect(hasPermission(VM, assignedErc, 'custom_erc.create')).toBe(true);
  });
  it('unassigned VM cannot create custom ERC', () => {
    const unassigned: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc('vm-1') };
    expect(hasPermission(VM, unassigned, 'custom_erc.create')).toBe(false);
  });
});

describe('custom_erc.submit_for_review', () => {
  const ownErc: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc('user-1') };
  it('VA can submit custom ERC for review', () => {
    expect(hasPermission(VA, ownErc, 'custom_erc.submit_for_review')).toBe(true);
  });
  it('assigned VM can submit custom ERC for review', () => {
    const assignedErc: PermissionResource = { type: 'erc', journey: journeyWithVm, erc: makeErc('vm-1') };
    expect(hasPermission(VM, assignedErc, 'custom_erc.submit_for_review')).toBe(true);
  });
});

describe('custom_erc.edit', () => {
  const ownErc: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc('user-1') };
  const otherErc: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc('other-user') };
  const ownSubmitted: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeSubmittedErc('user-1') };
  it('user can edit their own custom ERC (pre-submission)', () => {
    expect(hasPermission(VA, ownErc, 'custom_erc.edit')).toBe(true);
  });
  it("user cannot edit another user's custom ERC", () => {
    expect(hasPermission(VA, otherErc, 'custom_erc.edit')).toBe(false);
  });
  it('user cannot edit their own custom ERC after submission', () => {
    expect(hasPermission(VA, ownSubmitted, 'custom_erc.edit')).toBe(false);
  });
});

describe('custom_erc.delete', () => {
  const ownErc: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc('user-1') };
  const otherErc: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeErc('other-user') };
  const ownSubmitted: PermissionResource = { type: 'erc', journey: ownJourney, erc: makeSubmittedErc('user-1') };
  it('user can delete their own custom ERC (pre-submission)', () => {
    expect(hasPermission(VA, ownErc, 'custom_erc.delete')).toBe(true);
  });
  it("user cannot delete another user's custom ERC", () => {
    expect(hasPermission(VA, otherErc, 'custom_erc.delete')).toBe(false);
  });
  it('user cannot delete their own custom ERC after submission', () => {
    expect(hasPermission(VA, ownSubmitted, 'custom_erc.delete')).toBe(false);
  });
});

// ─── Layer 1: Test actions ────────────────────────────────────────────────────

describe('test.take', () => {
  it('VA can take a test', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'test.take')).toBe(true);
  });
  it('VM (without VA role) cannot take a test', () => {
    expect(hasPermission(VM, { type: 'platform' }, 'test.take')).toBe(false);
  });
});

describe('test.view_results', () => {
  const ownAttempt: TestAttemptSlim = { userId: 'user-1', weaknessId: 'w-1' };
  const otherAttempt: TestAttemptSlim = { userId: 'other-user', weaknessId: 'w-1' };

  it('VA can view their own test results', () => {
    const res: PermissionResource = { type: 'test_attempt', attempt: ownAttempt, journey: null };
    expect(hasPermission(VA, res, 'test.view_results')).toBe(true);
  });
  it('VA cannot view another VA test results', () => {
    const res: PermissionResource = { type: 'test_attempt', attempt: otherAttempt, journey: null };
    expect(hasPermission(VA, res, 'test.view_results')).toBe(false);
  });
  it('global VM can view test results of their assigned VA', () => {
    const res: PermissionResource = {
      type: 'test_attempt',
      attempt: { userId: 'user-1', weaknessId: 'w-1' },
      journey: journeyWithGlobalVm,
    };
    expect(hasPermission(VM, res, 'test.view_results')).toBe(true);
  });
  it('journey VM can view test results for their assigned journey', () => {
    const res: PermissionResource = {
      type: 'test_attempt',
      attempt: { userId: 'user-1', weaknessId: 'w-1' },
      journey: journeyWithVm,
    };
    expect(hasPermission(VM, res, 'test.view_results')).toBe(true);
  });
  it('unassigned VM cannot view test results', () => {
    const res: PermissionResource = { type: 'test_attempt', attempt: otherAttempt, journey: null };
    expect(hasPermission(VM, res, 'test.view_results')).toBe(false);
  });
});

// ─── Layer 1: Chat actions ────────────────────────────────────────────────────

describe('chat.view', () => {
  it('VA can view chat for their own journey', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'chat.view')).toBe(true);
  });
  it('assigned VM can view chat', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'chat.view')).toBe(true);
  });
  it('unassigned VM cannot view chat', () => {
    expect(hasPermission(VM, { type: 'journey', journey: ownJourney }, 'chat.view')).toBe(false);
  });
});

describe('chat.send', () => {
  it('VA can send chat in their own journey', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'chat.send')).toBe(true);
  });
  it('assigned VM can send chat', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'chat.send')).toBe(true);
  });
  it('unassigned VM cannot send chat', () => {
    expect(hasPermission(VM, { type: 'journey', journey: ownJourney }, 'chat.send')).toBe(false);
  });
});

// ─── Layer 1: Chat room (1:1 thread) — relationship must be verified ───────────
// The room string alone is never trusted; the service computes relationshipVerified.
describe('chat room resource', () => {
  const room = `chat:${['user-1', 'vm-1'].sort().join(':')}`;

  it('POSITIVE: participant with a verified relationship can view', () => {
    expect(hasPermission(VA, { type: 'room', id: room, relationshipVerified: true }, 'chat.view')).toBe(true);
  });
  it('POSITIVE: participant with a verified relationship can send', () => {
    expect(hasPermission(VM, { type: 'room', id: room, relationshipVerified: true }, 'chat.send')).toBe(true);
  });
  it('NEGATIVE: participant in the string but NO verified relationship is denied (forged room)', () => {
    expect(hasPermission(VA, { type: 'room', id: room, relationshipVerified: false }, 'chat.view')).toBe(false);
    expect(hasPermission(VM, { type: 'room', id: room, relationshipVerified: false }, 'chat.send')).toBe(false);
  });
  it('NEGATIVE: non-participant cannot use a room even if a relationship exists elsewhere', () => {
    const outsider = makeUser([Role.VRATARTHI], { id: 'outsider-9' });
    expect(hasPermission(outsider, { type: 'room', id: room, relationshipVerified: true }, 'chat.view')).toBe(false);
  });
});

// ─── Layer 1: Experience log actions ─────────────────────────────────────────

describe('experience_log.create', () => {
  const log: ExperienceLogSlim = { authorId: 'user-1', journeyId: 'journey-1', visibility: ExperienceVisibility.ONLY_ME, isDraft: true };
  it('VA can create an experience log for their own journey', () => {
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log };
    expect(hasPermission(VA, res, 'experience_log.create')).toBe(true);
  });
  it('VM cannot create experience logs', () => {
    const res: PermissionResource = { type: 'experience_log', journey: journeyWithVm, log };
    expect(hasPermission(VM, res, 'experience_log.create')).toBe(false);
  });
  it("VA cannot create experience log for another VA's journey", () => {
    const res: PermissionResource = { type: 'experience_log', journey: otherJourney, log };
    expect(hasPermission(VA, res, 'experience_log.create')).toBe(false);
  });
});

describe('experience_log.view', () => {
  const ownLog: ExperienceLogSlim = { authorId: 'user-1', journeyId: 'journey-1', visibility: ExperienceVisibility.ONLY_ME, isDraft: false };
  const otherPublished = (visibility: ExperienceVisibility, isDraft = false): ExperienceLogSlim => ({ authorId: 'other-user', journeyId: 'journey-1', visibility, isDraft });
  it('author can view their own experience log', () => {
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log: ownLog };
    expect(hasPermission(VA, res, 'experience_log.view')).toBe(true);
  });
  it('author can view their own draft', () => {
    const draft: ExperienceLogSlim = { ...ownLog, isDraft: true };
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log: draft };
    expect(hasPermission(VA, res, 'experience_log.view')).toBe(true);
  });
  it('anyone can view a PUBLIC published entry', () => {
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log: otherPublished(ExperienceVisibility.PUBLIC) };
    expect(hasPermission(VA, res, 'experience_log.view')).toBe(true);
  });
  it('assigned VM can view a journey-tagged entry', () => {
    const res: PermissionResource = { type: 'experience_log', journey: journeyWithVm, log: otherPublished(ExperienceVisibility.ONLY_ME) };
    expect(hasPermission(VM, res, 'experience_log.view')).toBe(true);
  });
  it('unassigned VM cannot view an ONLY_ME entry', () => {
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log: otherPublished(ExperienceVisibility.ONLY_ME) };
    expect(hasPermission(VM, res, 'experience_log.view')).toBe(false);
  });
  it('NEGATIVE: a third party cannot view an ONLY_ME entry', () => {
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log: otherPublished(ExperienceVisibility.ONLY_ME) };
    expect(hasPermission(VA, res, 'experience_log.view')).toBe(false);
  });
  it('NEGATIVE: FRIENDS entry is hidden from third party (pre-follow-system, fail-closed)', () => {
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log: otherPublished(ExperienceVisibility.FRIENDS) };
    expect(hasPermission(VA, res, 'experience_log.view')).toBe(false);
  });
  it('NEGATIVE: a PUBLIC but still-draft entry is not visible to non-authors', () => {
    const res: PermissionResource = { type: 'experience_log', journey: ownJourney, log: otherPublished(ExperienceVisibility.PUBLIC, true) };
    expect(hasPermission(VA, res, 'experience_log.view')).toBe(false);
  });
});

describe('experience_log.edit', () => {
  const ownLog: ExperienceLogSlim = { authorId: 'user-1', journeyId: 'journey-1', visibility: ExperienceVisibility.ONLY_ME, isDraft: false };
  const otherLog: ExperienceLogSlim = { authorId: 'other-user', journeyId: 'journey-1', visibility: ExperienceVisibility.ONLY_ME, isDraft: false };
  it('author can edit their own experience log', () => {
    expect(hasPermission(VA, { type: 'experience_log', journey: ownJourney, log: ownLog }, 'experience_log.edit')).toBe(true);
  });
  it("user cannot edit another user's experience log", () => {
    expect(hasPermission(VA, { type: 'experience_log', journey: ownJourney, log: otherLog }, 'experience_log.edit')).toBe(false);
  });
});

describe('experience_log.delete', () => {
  const ownLog: ExperienceLogSlim = { authorId: 'user-1', journeyId: 'journey-1', visibility: ExperienceVisibility.ONLY_ME, isDraft: false };
  const otherLog: ExperienceLogSlim = { authorId: 'other-user', journeyId: 'journey-1', visibility: ExperienceVisibility.ONLY_ME, isDraft: false };
  it('author can delete their own experience log', () => {
    expect(hasPermission(VA, { type: 'experience_log', journey: ownJourney, log: ownLog }, 'experience_log.delete')).toBe(true);
  });
  it("user cannot delete another user's experience log", () => {
    expect(hasPermission(VA, { type: 'experience_log', journey: ownJourney, log: otherLog }, 'experience_log.delete')).toBe(false);
  });
});

// ─── Layer 1: Social actions ─────────────────────────────────────────────────

const ownBlog: BlogSlim = { authorId: 'user-1' };
const otherBlog: BlogSlim = { authorId: 'other-user' };
const ownComment: BlogCommentSlim = { blogId: 'blog-1', authorId: 'user-1' };
const otherComment: BlogCommentSlim = { blogId: 'blog-1', authorId: 'other-user' };

describe('blog.create', () => {
  it('VA can create a blog', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'blog.create')).toBe(true);
  });
  it('VM can create a blog', () => {
    expect(hasPermission(VM, { type: 'platform' }, 'blog.create')).toBe(true);
  });
});

describe('blog.edit', () => {
  it('author can edit their own blog', () => {
    expect(hasPermission(VA, { type: 'blog', blog: ownBlog }, 'blog.edit')).toBe(true);
  });
  it("user cannot edit another user's blog", () => {
    expect(hasPermission(VA, { type: 'blog', blog: otherBlog }, 'blog.edit')).toBe(false);
  });
});

describe('blog.delete', () => {
  it('author can delete their own blog', () => {
    expect(hasPermission(VA, { type: 'blog', blog: ownBlog }, 'blog.delete')).toBe(true);
  });
  it("user cannot delete another user's blog", () => {
    expect(hasPermission(VA, { type: 'blog', blog: otherBlog }, 'blog.delete')).toBe(false);
  });
});

describe('comment.create', () => {
  it('VA can create a comment', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'comment.create')).toBe(true);
  });
  it('VM can create a comment', () => {
    expect(hasPermission(VM, { type: 'platform' }, 'comment.create')).toBe(true);
  });
});

describe('comment.delete', () => {
  it('comment author can delete their own comment', () => {
    expect(hasPermission(VA, { type: 'blog_comment', blog: otherBlog, comment: ownComment }, 'comment.delete')).toBe(true);
  });
  it('blog author cannot delete another user\'s comment (use comment.hide instead)', () => {
    expect(hasPermission(VA, { type: 'blog_comment', blog: ownBlog, comment: otherComment }, 'comment.delete')).toBe(false);
  });
  it('random user cannot delete an unrelated comment', () => {
    expect(hasPermission(VA, { type: 'blog_comment', blog: otherBlog, comment: otherComment }, 'comment.delete')).toBe(false);
  });
});

describe('comment.hide', () => {
  it('blog author can hide a comment on their own blog', () => {
    expect(hasPermission(VA, { type: 'blog_comment', blog: ownBlog, comment: otherComment }, 'comment.hide')).toBe(true);
  });
  it('random user cannot hide a comment on another blog', () => {
    expect(hasPermission(VA, { type: 'blog_comment', blog: otherBlog, comment: otherComment }, 'comment.hide')).toBe(false);
  });
});

describe('comment.report', () => {
  it('VA can report a comment', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'comment.report')).toBe(true);
  });
  it('VM can report a comment', () => {
    expect(hasPermission(VM, { type: 'platform' }, 'comment.report')).toBe(true);
  });
});

describe('follow.create / follow.remove', () => {
  it('VA can follow', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'follow.create')).toBe(true);
  });
  it('VM can follow', () => {
    expect(hasPermission(VM, { type: 'platform' }, 'follow.create')).toBe(true);
  });
  it('VA can remove follow', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'follow.remove')).toBe(true);
  });
});

// ─── Layer 1: Invitation actions ─────────────────────────────────────────────

describe('vm_invitation.send', () => {
  it('VA can send a VM invitation', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'vm_invitation.send')).toBe(true);
  });
  it('VM (without VA role) cannot send an invitation', () => {
    expect(hasPermission(VM, { type: 'platform' }, 'vm_invitation.send')).toBe(false);
  });
});

describe('vm_invitation.accept', () => {
  const inv: InvitationSlim = { inviterId: 'user-1', inviteeId: 'vm-1' };
  const wrongInv: InvitationSlim = { inviterId: 'user-1', inviteeId: 'other-vm' };
  it('the invited VM can accept the invitation', () => {
    expect(hasPermission(VM, { type: 'invitation', invitation: inv }, 'vm_invitation.accept')).toBe(true);
  });
  it('a different VM cannot accept an invitation addressed to another VM', () => {
    expect(hasPermission(VM, { type: 'invitation', invitation: wrongInv }, 'vm_invitation.accept')).toBe(false);
  });
  it('VA cannot accept a VM invitation', () => {
    expect(hasPermission(VA, { type: 'invitation', invitation: inv }, 'vm_invitation.accept')).toBe(false);
  });
});

describe('vm_invitation.cancel', () => {
  const inv: InvitationSlim = { inviterId: 'user-1', inviteeId: 'vm-1' };
  const otherInv: InvitationSlim = { inviterId: 'other-user', inviteeId: 'vm-1' };
  const vmInv: InvitationSlim = { inviterId: 'vm-1', inviteeId: 'other-vm' };
  it('VA can cancel their own pending invitation', () => {
    expect(hasPermission(VA, { type: 'invitation', invitation: inv }, 'vm_invitation.cancel')).toBe(true);
  });
  it("VA cannot cancel another VA's invitation", () => {
    expect(hasPermission(VA, { type: 'invitation', invitation: otherInv }, 'vm_invitation.cancel')).toBe(false);
  });
  it('VM cannot cancel an invitation even if they are the inviter', () => {
    expect(hasPermission(VM, { type: 'invitation', invitation: vmInv }, 'vm_invitation.cancel')).toBe(false);
  });
});

describe('vm_invitation.decline', () => {
  const inv: InvitationSlim = { inviterId: 'user-1', inviteeId: 'vm-1' };
  it('the invited VM can decline', () => {
    expect(hasPermission(VM, { type: 'invitation', invitation: inv }, 'vm_invitation.decline')).toBe(true);
  });
  it('VA cannot decline a VM invitation', () => {
    expect(hasPermission(VA, { type: 'invitation', invitation: inv }, 'vm_invitation.decline')).toBe(false);
  });
});

describe('vm_relationship.withdraw', () => {
  it('VM can withdraw their own assignment', () => {
    expect(
      hasPermission(VM, { type: 'vm_relationship', relationship: { vmId: 'vm-1', vratarthiId: 'user-1' } }, 'vm_relationship.withdraw'),
    ).toBe(true);
  });
  it('different VM cannot withdraw an unrelated assignment', () => {
    expect(
      hasPermission(VM, { type: 'vm_relationship', relationship: { vmId: 'other-vm', vratarthiId: 'user-1' } }, 'vm_relationship.withdraw'),
    ).toBe(false);
  });
  it('VA cannot withdraw a vm_relationship even if their id matches vmId', () => {
    expect(
      hasPermission(VA, { type: 'vm_relationship', relationship: { vmId: 'user-1', vratarthiId: 'other-user' } }, 'vm_relationship.withdraw'),
    ).toBe(false);
  });
});

// ─── Layer 1: Remaining actions ───────────────────────────────────────────────

describe('weakness.attach', () => {
  it('VA can attach a weakness to their own journey', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'weakness.attach')).toBe(true);
  });
  it('VM cannot attach a weakness', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'weakness.attach')).toBe(false);
  });
});

describe('challenge.configure_threshold', () => {
  it('VA can configure threshold for their own journey', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'challenge.configure_threshold')).toBe(true);
  });
  it('assigned VM can configure threshold', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'challenge.configure_threshold')).toBe(true);
  });
  it('unassigned VM cannot configure threshold', () => {
    expect(hasPermission(VM, { type: 'journey', journey: ownJourney }, 'challenge.configure_threshold')).toBe(false);
  });
});

describe('global_vm.view_va_guidance', () => {
  it('global VM can view VA guidance', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithGlobalVm }, 'global_vm.view_va_guidance')).toBe(true);
  });
  it('journey VM (not global) cannot view VA guidance', () => {
    expect(hasPermission(VM, { type: 'journey', journey: journeyWithVm }, 'global_vm.view_va_guidance')).toBe(false);
  });
  it('VA cannot view VA guidance via this action', () => {
    expect(hasPermission(VA, { type: 'journey', journey: ownJourney }, 'global_vm.view_va_guidance')).toBe(false);
  });
});

// ─── Layer 2: Admin-only actions ─────────────────────────────────────────────

describe('admin-only permissions', () => {
  const adminActions = [
    'admin.view_any_journey',
    'admin.view_any_user',
    'admin.view_any_test_result',
    'admin.override_journey_state',
    'admin.manage_content',
    'admin.manage_users',
    'admin.view_platform_stats',
    'admin.manage_taxonomy',
    'admin.manage_pothi',
    'admin.manage_shlokas',
    'admin.manage_resources',
  ] as const;

  for (const action of adminActions) {
    it(`admin can perform ${action}`, () => {
      expect(hasPermission(ADMIN, { type: 'platform' }, action)).toBe(true);
    });
    it(`moderator cannot perform ${action}`, () => {
      expect(hasPermission(MOD, { type: 'platform' }, action)).toBe(false);
    });
    it(`VA cannot perform ${action}`, () => {
      expect(hasPermission(VA, { type: 'platform' }, action)).toBe(false);
    });
  }
});

// ─── Layer 2: Admin + Moderator shared actions ────────────────────────────────

describe('moderator.review_custom_erc', () => {
  it('admin can review custom ERC', () => {
    expect(hasPermission(ADMIN, { type: 'platform' }, 'moderator.review_custom_erc')).toBe(true);
  });
  it('moderator can review custom ERC', () => {
    expect(hasPermission(MOD, { type: 'platform' }, 'moderator.review_custom_erc')).toBe(true);
  });
  it('VA cannot review custom ERC', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'moderator.review_custom_erc')).toBe(false);
  });
});

describe('moderator.manage_display_content', () => {
  it('admin can manage display content', () => {
    expect(hasPermission(ADMIN, { type: 'platform' }, 'moderator.manage_display_content')).toBe(true);
  });
  it('moderator can manage display content', () => {
    expect(hasPermission(MOD, { type: 'platform' }, 'moderator.manage_display_content')).toBe(true);
  });
  it('VA cannot manage display content', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'moderator.manage_display_content')).toBe(false);
  });
});

describe('comment.moderate', () => {
  it('admin can moderate comments', () => {
    expect(hasPermission(ADMIN, { type: 'platform' }, 'comment.moderate')).toBe(true);
  });
  it('moderator can moderate comments', () => {
    expect(hasPermission(MOD, { type: 'platform' }, 'comment.moderate')).toBe(true);
  });
  it('VA cannot moderate comments', () => {
    expect(hasPermission(VA, { type: 'platform' }, 'comment.moderate')).toBe(false);
  });
});

// ─── Edge case: multi-role user ───────────────────────────────────────────────

describe('multi-role user (VA + VM)', () => {
  it('VA+VM user can both create journeys and suggest ERC', () => {
    expect(hasPermission(VA_ALSO_VM, { type: 'platform' }, 'journey.create')).toBe(true);
    const assignedErc: PermissionResource = {
      type: 'erc',
      journey: makeJourney('other-user', [makeVmAssignment('user-1')]),
      erc: makeErc(),
    };
    expect(hasPermission(VA_ALSO_VM, assignedErc, 'erc.suggest')).toBe(true);
  });
});
