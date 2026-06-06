import { Role, ErcStatus, VmRelationshipState } from '@prisma/client';
import { SessionUser } from '../../modules/auth/types/auth.types';

// Re-export for convenience
export type { SessionUser };

// ─── Permission Actions ───────────────────────────────────────────────────────

// Layer 1 — participant actions
type JourneyAction =
  | 'journey.create'
  | 'journey.view'
  | 'journey.pause'
  | 'journey.resume'
  | 'journey.complete';

type ErcAction =
  | 'erc.select'
  | 'erc.suggest'
  | 'erc.approve_closure'
  | 'erc.revisit'
  | 'erc.deactivate'
  | 'erc.remove';

type CustomErcAction =
  | 'custom_erc.create'
  | 'custom_erc.submit_for_review'
  | 'custom_erc.edit'
  | 'custom_erc.delete';

type TestAction = 'test.take' | 'test.view_results';

type ChatAction = 'chat.view' | 'chat.send';

type ExperienceLogAction =
  | 'experience_log.create'
  | 'experience_log.view'
  | 'experience_log.edit'
  | 'experience_log.delete';

type BlogAction = 'blog.create' | 'blog.edit' | 'blog.delete';

type CommentAction = 'comment.create' | 'comment.delete' | 'comment.hide' | 'comment.report';

type FollowAction = 'follow.create' | 'follow.remove';

type InvitationAction =
  | 'vm_invitation.send'
  | 'vm_invitation.accept'
  | 'vm_invitation.cancel'
  | 'vm_invitation.decline';

type VmRelationshipAction = 'vm_relationship.withdraw';

type WeaknessAction = 'weakness.attach';

type ChallengeAction = 'challenge.configure_threshold';

type GlobalVmAction = 'global_vm.view_va_guidance';

// Layer 2 — platform actions
type AdminAction =
  | 'admin.view_any_journey'
  | 'admin.view_any_user'
  | 'admin.view_any_test_result'
  | 'admin.override_journey_state'
  | 'admin.manage_content'
  | 'admin.manage_users'
  | 'admin.view_platform_stats'
  | 'admin.manage_taxonomy'
  | 'admin.manage_pothi'
  | 'admin.manage_shlokas'
  | 'admin.manage_resources';

type ModeratorAction =
  | 'moderator.review_custom_erc'
  | 'moderator.manage_display_content'
  | 'comment.moderate';

export type PermissionAction =
  | JourneyAction
  | ErcAction
  | CustomErcAction
  | TestAction
  | ChatAction
  | ExperienceLogAction
  | BlogAction
  | CommentAction
  | FollowAction
  | InvitationAction
  | VmRelationshipAction
  | WeaknessAction
  | ChallengeAction
  | GlobalVmAction
  | AdminAction
  | ModeratorAction;

// ─── Resource shapes (minimal — only the fields hasPermission inspects) ────────

export type JourneyVmAssignmentSlim = {
  vmId: string;
  state: VmRelationshipState;
};

export type VmRelationshipSlim = {
  vmId: string;
  vratarthiId: string;
  state: VmRelationshipState;
};

export type JourneySlim = {
  id: string;
  vratarthiId: string;
  vmAssignments: JourneyVmAssignmentSlim[];
  globalVmRelationship: VmRelationshipSlim | null;
};

export type ErcSlim = {
  journeyId: string;
  createdById?: string;
  status?: ErcStatus;
};

export type ExperienceLogSlim = {
  authorId: string;
  journeyId: string | null;
};

export type BlogSlim = {
  authorId: string;
};

export type BlogCommentSlim = {
  blogId: string;
  authorId: string;
};

export type TestAttemptSlim = {
  userId: string;
  weaknessId: string;
};

export type InvitationSlim = {
  inviterId: string;
  inviteeId: string | null;
};

export type VmRelationshipResourceSlim = {
  vmId: string;
  vratarthiId: string;
};

// ─── Discriminated union resource ─────────────────────────────────────────────

export type PermissionResource =
  | { type: 'platform' }
  | { type: 'journey'; journey: JourneySlim }
  | { type: 'erc'; journey: JourneySlim; erc: ErcSlim }
  | { type: 'experience_log'; journey: JourneySlim | null; log: ExperienceLogSlim }
  | { type: 'blog'; blog: BlogSlim }
  | { type: 'blog_comment'; blog: BlogSlim; comment: BlogCommentSlim }
  | { type: 'test_attempt'; attempt: TestAttemptSlim; journey: JourneySlim | null }
  | { type: 'invitation'; invitation: InvitationSlim }
  | { type: 'vm_relationship'; relationship: VmRelationshipResourceSlim }
  | { type: 'room'; id: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hasRole(user: SessionUser, role: Role): boolean {
  return user.roles.includes(role);
}

export function isVa(user: SessionUser): boolean {
  return hasRole(user, Role.VRATARTHI);
}

export function isVm(user: SessionUser): boolean {
  return hasRole(user, Role.VRATMITRA);
}

export function isAdmin(user: SessionUser): boolean {
  return hasRole(user, Role.ADMIN);
}

export function isModerator(user: SessionUser): boolean {
  return hasRole(user, Role.MODERATOR);
}

export function isAdminOrModerator(user: SessionUser): boolean {
  return isAdmin(user) || isModerator(user);
}

export function isJourneyOwner(user: SessionUser, journey: JourneySlim): boolean {
  return journey.vratarthiId === user.id;
}

export function isActiveJourneyVm(user: SessionUser, journey: JourneySlim): boolean {
  return journey.vmAssignments.some(
    (a) => a.vmId === user.id && a.state === VmRelationshipState.ACTIVE,
  );
}

export function isGlobalVmForJourney(user: SessionUser, journey: JourneySlim): boolean {
  const rel = journey.globalVmRelationship;
  return (
    rel !== null &&
    rel.vmId === user.id &&
    rel.vratarthiId === journey.vratarthiId &&
    rel.state === VmRelationshipState.ACTIVE
  );
}

export function hasActiveJourneyVm(journey: JourneySlim): boolean {
  return journey.vmAssignments.some((a) => a.state === VmRelationshipState.ACTIVE);
}

export function isRoomParticipant(user: SessionUser, roomId: string): boolean {
  const [, userId1, userId2] = roomId.split(':');
  return user.id === userId1 || user.id === userId2;
}
