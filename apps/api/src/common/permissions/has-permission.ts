import { ErcStatus, ExperienceVisibility } from '@prisma/client';
import { SessionUser } from '../../modules/auth/types/auth.types';
import {
  PermissionAction,
  PermissionResource,
  isVa,
  isVm,
  isAdmin,
  isAdminOrModerator,
  isJourneyOwner,
  isActiveJourneyVm,
  isGlobalVmForJourney,
  hasActiveJourneyVm,
  isRoomParticipant,
} from './types';

export function hasPermission(
  user: SessionUser,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  return checkLayerOne(user, resource, action) || checkLayerTwo(user, resource, action);
}

// ─── Layer 1: participant actions (VA / VM acting within their own data) ───────

function checkLayerOne(
  user: SessionUser,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  switch (action) {
    // ── Journey actions ──────────────────────────────────────────────────────

    case 'journey.create':
      return isVa(user);

    case 'journey.view': {
      if (resource.type !== 'journey') return false;
      const { journey } = resource;
      if (isVa(user) && isJourneyOwner(user, journey)) return true;
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      if (isVm(user) && isGlobalVmForJourney(user, journey)) return true;
      return false;
    }

    case 'journey.pause': {
      if (resource.type !== 'journey') return false;
      return isVa(user) && isJourneyOwner(user, resource.journey);
    }

    case 'journey.resume': {
      if (resource.type !== 'journey') return false;
      return isVa(user) && isJourneyOwner(user, resource.journey);
    }

    case 'journey.complete': {
      if (resource.type !== 'journey') return false;
      const { journey } = resource;
      if (isVa(user) && isJourneyOwner(user, journey)) return true;
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      return false;
    }

    // ── ERC actions ──────────────────────────────────────────────────────────

    case 'erc.select': {
      if (resource.type !== 'erc') return false;
      return isVa(user) && isJourneyOwner(user, resource.journey);
    }

    case 'erc.suggest': {
      if (resource.type !== 'erc') return false;
      return isVm(user) && isActiveJourneyVm(user, resource.journey);
    }

    case 'erc.approve_closure': {
      if (resource.type !== 'erc') return false;
      const { journey } = resource;
      // VA can self-approve only when no VM is assigned
      if (isVa(user) && isJourneyOwner(user, journey) && !hasActiveJourneyVm(journey)) return true;
      // Assigned journey VM approves
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      return false;
    }

    case 'erc.revisit': {
      if (resource.type !== 'erc') return false;
      return isVm(user) && isActiveJourneyVm(user, resource.journey);
    }

    case 'erc.deactivate': {
      if (resource.type !== 'erc') return false;
      return isVa(user) && isJourneyOwner(user, resource.journey);
    }

    case 'erc.remove': {
      if (resource.type !== 'erc') return false;
      return isVa(user) && isJourneyOwner(user, resource.journey);
    }

    // ── Custom ERC actions ───────────────────────────────────────────────────

    case 'custom_erc.create': {
      if (resource.type !== 'erc') return false;
      const { journey } = resource;
      if (isVa(user) && isJourneyOwner(user, journey)) return true;
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      return false;
    }

    case 'custom_erc.submit_for_review': {
      if (resource.type !== 'erc') return false;
      const { journey } = resource;
      if (isVa(user) && isJourneyOwner(user, journey)) return true;
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      return false;
    }

    case 'custom_erc.edit': {
      if (resource.type !== 'erc') return false;
      const { erc } = resource;
      const preSubmission =
        erc.status === ErcStatus.NOT_STARTED || erc.status === ErcStatus.IN_PROGRESS;
      return erc.createdById === user.id && preSubmission;
    }

    case 'custom_erc.delete': {
      if (resource.type !== 'erc') return false;
      const { erc } = resource;
      const preSubmission =
        erc.status === ErcStatus.NOT_STARTED || erc.status === ErcStatus.IN_PROGRESS;
      return erc.createdById === user.id && preSubmission;
    }

    // ── Test actions ─────────────────────────────────────────────────────────

    case 'test.take':
      return isVa(user);

    case 'test.view_results': {
      if (resource.type !== 'test_attempt') return false;
      const { attempt, journey } = resource;
      // Own results
      if (attempt.userId === user.id) return true;
      // Global VM for the test owner
      if (isVm(user) && journey !== null && isGlobalVmForJourney(user, journey)) return true;
      // Journey VM (assigned to a journey belonging to the test owner)
      if (isVm(user) && journey !== null && isActiveJourneyVm(user, journey)) return true;
      return false;
    }

    // ── Chat actions ─────────────────────────────────────────────────────────

    case 'chat.view': {
      if (resource.type === 'room') {
        return isRoomParticipant(user, resource.id, resource.relationshipVerified);
      }
      if (resource.type !== 'journey') return false;
      const { journey } = resource;
      if (isVa(user) && isJourneyOwner(user, journey)) return true;
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      if (isVm(user) && isGlobalVmForJourney(user, journey)) return true;
      return false;
    }

    case 'chat.send': {
      if (resource.type === 'room') {
        return isRoomParticipant(user, resource.id, resource.relationshipVerified);
      }
      if (resource.type !== 'journey') return false;
      const { journey } = resource;
      if (isVa(user) && isJourneyOwner(user, journey)) return true;
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      if (isVm(user) && isGlobalVmForJourney(user, journey)) return true;
      return false;
    }

    // ── Experience log actions ───────────────────────────────────────────────

    case 'experience_log.create': {
      if (resource.type !== 'experience_log') return false;
      const { journey } = resource;
      if (journey === null) return isVa(user); // global experience log
      return isVa(user) && isJourneyOwner(user, journey);
    }

    case 'experience_log.view': {
      if (resource.type !== 'experience_log') return false;
      const { log, journey } = resource;
      // Author always sees their own entries (incl. drafts).
      if (log.authorId === user.id) return true;
      // Drafts are never visible to anyone but the author.
      if (log.isDraft) return false;
      // Public, published entries are visible to anyone (incl. guests).
      if (log.visibility === ExperienceVisibility.PUBLIC) return true;
      // A VM assigned to (or global VM for) the entry's journey can view it (spec/14).
      if (isVm(user) && journey !== null && isActiveJourneyVm(user, journey)) return true;
      if (isVm(user) && journey !== null && isGlobalVmForJourney(user, journey)) return true;
      // FRIENDS tier = mutual follow (spec/10). The service resolves friendship and
      // passes viewerIsFriend; the permission function stays pure/synchronous.
      if (log.visibility === ExperienceVisibility.FRIENDS && resource.viewerIsFriend === true)
        return true;
      return false;
    }

    case 'experience_log.edit': {
      if (resource.type !== 'experience_log') return false;
      return resource.log.authorId === user.id;
    }

    case 'experience_log.delete': {
      if (resource.type !== 'experience_log') return false;
      return resource.log.authorId === user.id;
    }

    // ── Blog actions ─────────────────────────────────────────────────────────

    case 'blog.create':
      return isVa(user) || isVm(user);

    case 'blog.edit': {
      if (resource.type !== 'blog') return false;
      return resource.blog.authorId === user.id;
    }

    case 'blog.delete': {
      if (resource.type !== 'blog') return false;
      return resource.blog.authorId === user.id;
    }

    // ── Comment actions ──────────────────────────────────────────────────────

    case 'comment.create':
      return isVa(user) || isVm(user);

    case 'comment.delete': {
      if (resource.type !== 'blog_comment') return false;
      // Comment author, the blog author, or a moderator (spec/16 + spec/05 Layer 2).
      if (resource.comment.authorId === user.id) return true;
      if (resource.blog.authorId === user.id) return true;
      return isAdminOrModerator(user);
    }

    case 'comment.hide': {
      if (resource.type !== 'blog_comment') return false;
      // Blog author can hide any comment on their own blog; moderators on any blog.
      if (resource.blog.authorId === user.id) return true;
      return isAdminOrModerator(user);
    }

    case 'comment.report':
      return isVa(user) || isVm(user);

    // ── Follow actions ───────────────────────────────────────────────────────

    case 'follow.create':
      return isVa(user) || isVm(user);

    case 'follow.remove':
      return isVa(user) || isVm(user);

    // ── Invitation actions ───────────────────────────────────────────────────

    case 'vm_invitation.send':
      return isVa(user);

    case 'vm_invitation.accept': {
      if (resource.type !== 'invitation') return false;
      return isVm(user) && resource.invitation.inviteeId === user.id;
    }

    case 'vm_invitation.cancel': {
      if (resource.type !== 'invitation') return false;
      return isVa(user) && resource.invitation.inviterId === user.id;
    }

    case 'vm_invitation.decline': {
      if (resource.type !== 'invitation') return false;
      return isVm(user) && resource.invitation.inviteeId === user.id;
    }

    case 'vm_relationship.withdraw': {
      if (resource.type !== 'vm_relationship') return false;
      return isVm(user) && resource.relationship.vmId === user.id;
    }

    // ── Weakness / challenge / global VM ────────────────────────────────────

    case 'weakness.attach': {
      if (resource.type !== 'journey') return false;
      return isVa(user) && isJourneyOwner(user, resource.journey);
    }

    case 'challenge.configure_threshold': {
      if (resource.type !== 'journey') return false;
      const { journey } = resource;
      if (isVa(user) && isJourneyOwner(user, journey)) return true;
      if (isVm(user) && isActiveJourneyVm(user, journey)) return true;
      return false;
    }

    case 'global_vm.view_va_guidance': {
      if (resource.type !== 'journey') return false;
      return isVm(user) && isGlobalVmForJourney(user, resource.journey);
    }

    // ── Feedback actions (beta observations widget) ─────────────────────────
    // Any authenticated user may raise, read, and upvote feedback — identity is
    // established by the guard; no role or resource scoping applies.

    case 'feedback.create':
    case 'feedback.read':
    case 'feedback.upvote':
      return resource.type === 'platform';

    // ── Content editing (dev-only in-context editor) ─────────────────────────
    // Allowlist-backed: the content-overrides service computes membership from
    // CONTENT_EDITOR_USER_IDS and passes it as resource.isContentEditor. Deliberately
    // not granted by any role (not even admin) — least privilege for an outside editor.
    case 'content.edit':
      return resource.type === 'platform' && resource.isContentEditor === true;

    // Layer 2 actions — not handled here
    default:
      return false;
  }
}

// ─── Layer 2: platform actions (admin / moderator acting on any data) ─────────

function checkLayerTwo(
  user: SessionUser,
  _resource: PermissionResource,
  action: PermissionAction,
): boolean {
  switch (action) {
    // Admin-only
    case 'admin.view_any_journey':
    case 'admin.view_any_user':
    case 'admin.view_any_test_result':
    case 'admin.override_journey_state':
    case 'admin.manage_content':
    case 'admin.manage_users':
    case 'admin.view_platform_stats':
    case 'admin.manage_taxonomy':
    case 'admin.manage_pothi':
    case 'admin.manage_shlokas':
    case 'admin.manage_resources':
      return isAdmin(user);

    // Admin or moderator
    case 'moderator.review_custom_erc':
    case 'moderator.manage_display_content':
      return isAdminOrModerator(user);

    // comment.moderate — shared between admin and moderator
    case 'comment.moderate':
      return isAdminOrModerator(user);

    // Feedback triage — admin only
    case 'feedback.manage':
      return isAdmin(user);

    default:
      return false;
  }
}
