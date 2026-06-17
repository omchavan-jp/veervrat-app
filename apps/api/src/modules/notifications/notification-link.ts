import { NotificationEventType } from '@prisma/client';

// Resolves a notification to a relative frontend path for the email deep link. Kept
// deliberately coarse: it lands the recipient on the most relevant page (the actions queue,
// the journey, the invitations list, the moderation queue) rather than a precise sub-view,
// because resourceType/resourceId are heterogeneous across call sites and the recipient's
// role (VA vs VM vs moderator) changes where the item actually lives. `/actions` is the
// shared work-queue fallback. Returns a leading-slash path; the caller prepends FRONTEND_URL.
export function notificationLinkPath(
  event: NotificationEventType,
  resourceType: string | null,
  resourceId: string | null,
): string {
  switch (event) {
    case NotificationEventType.VM_INVITATION_RECEIVED:
    case NotificationEventType.VM_INVITATION_ACCEPTED:
    case NotificationEventType.VM_INVITATION_DECLINED:
    case NotificationEventType.VM_INVITATION_EXPIRED:
    case NotificationEventType.INVITEE_JOINED_PLATFORM:
      return '/invitations';

    case NotificationEventType.CUSTOM_ERC_REVIEW_REQUESTED:
      return '/moderation/custom-erc';

    case NotificationEventType.JOURNEY_DORMANT:
    case NotificationEventType.JOURNEY_COMPLETION_APPROVED:
    case NotificationEventType.VM_WITHDREW:
      return resourceType === 'journey' && resourceId ? `/journeys/${resourceId}` : '/journeys';

    // ERC submit/approve/return + journey completion submitted all live in the work queue
    // (VA's /actions or VM's /vratmitra/guidance — /actions is the shared entry).
    default:
      return '/actions';
  }
}
