import { NotificationEventType } from '@prisma/client';

/**
 * Where a notification takes you. **One map, used by both channels.**
 *
 * There used to be two: this one for the email deep link, and `eventTypeToPath` in the web app's
 * notification panel for the bell. Nothing kept them in step, and they had drifted badly — 10 of
 * 22 event types were unmapped in the bell, so the notification rendered and clicking it did
 * nothing, while the same notification's email link worked. Another 7 pointed somewhere different
 * depending on which one you clicked.
 *
 * Repointing the second map would have been the third such correction (its own comment records a
 * previous drift to `/dashboard`). So the second map is gone: the API returns `link` on every
 * notification and the bell follows it. The two channels now agree **by construction** rather than
 * by anyone remembering.
 *
 * `/actions` is the shared work-queue fallback: several of these live in a different place for a
 * vratarthi than for a vratmitra or a moderator, and `/actions` is the entry both reach.
 */
export function notificationLinkPath(
  event: NotificationEventType,
  resourceType: string | null,
  resourceId: string | null,
  actorUsername?: string | null,
): string {
  switch (event) {
    // ── Invitations ──────────────────────────────────────────────────────────
    // ⚠️ `/invitations` is the SENDER's page — it lists what you sent. For the invitee this is
    // the wrong destination, and it is why #22 has been open since 2026-07-18. It stays here
    // because there is nowhere better to point yet: the API cannot answer "what was I invited
    // to" at all (no `listByInvitee`). Fixing the link before that surface exists would just be
    // a fourth wrong destination.
    case NotificationEventType.VM_INVITATION_RECEIVED:
    case NotificationEventType.VM_INVITATION_ACCEPTED:
    case NotificationEventType.VM_INVITATION_DECLINED:
    case NotificationEventType.VM_INVITATION_EXPIRED:
    case NotificationEventType.INVITEE_JOINED_PLATFORM:
      return '/invitations';

    // ── Moderation ───────────────────────────────────────────────────────────
    case NotificationEventType.CUSTOM_ERC_REVIEW_REQUESTED:
      return '/moderation/custom-erc';

    // Carries the comment id, and there is no route that opens a blog by one of its comments —
    // so the queue, which is where a moderator acts on it anyway.
    case NotificationEventType.COMMENT_REPORTED:
      return '/moderation';

    // ── Content ──────────────────────────────────────────────────────────────
    case NotificationEventType.BLOG_COMMENT_NEW:
      return resourceType === 'blog' && resourceId
        ? `/community/blogs/${resourceId}`
        : '/community/blogs';

    // The actor's profile. Requires their username: the notification stores the follower's *id*,
    // and `/u/[username]` cannot be built from an id, which is why this was unmapped rather than
    // merely wrong. The actor's username is now selected alongside their name.
    case NotificationEventType.NEW_FOLLOWER:
      return actorUsername ? `/u/${actorUsername}` : '/profile';

    // ── Journeys ─────────────────────────────────────────────────────────────
    case NotificationEventType.JOURNEY_DORMANT:
    case NotificationEventType.JOURNEY_COMPLETION_APPROVED:
    case NotificationEventType.VM_WITHDREW:
      return resourceType === 'journey' && resourceId ? `/journeys/${resourceId}` : '/journeys';

    // ── The work queue ───────────────────────────────────────────────────────
    // ERC submit/approve/return, journey completion submitted, custom-ERC outcomes and VM
    // suggestions all live in the queue: /actions for a vratarthi, /vratmitra/guidance for a
    // vratmitra, and /actions is the shared entry.
    case NotificationEventType.NEW_ERC_AVAILABLE:
    case NotificationEventType.ERC_CLOSURE_SUBMITTED:
    case NotificationEventType.ERC_CLOSURE_APPROVED:
    case NotificationEventType.ERC_RETURNED_FOR_REVISIT:
    case NotificationEventType.JOURNEY_COMPLETION_SUBMITTED:
    case NotificationEventType.CUSTOM_ERC_APPROVED:
    case NotificationEventType.CUSTOM_ERC_REJECTED:
    case NotificationEventType.VM_SUGGESTION_NEW:
    case NotificationEventType.VM_SUGGESTION_DISMISSED:
      return '/actions';

    /**
     * Never emitted. The enum value and its UI label exist; **no code anywhere creates one**
     * (verified 2026-08-27 across the whole repository). Chat is realtime over a socket and the
     * notification for it was never built — see `openspec/changes/my-vratmitras-chat`.
     *
     * Kept in the switch rather than left to a `default`, so that the exhaustiveness check below
     * keeps working and so the next person does not spend an afternoon wondering where the link
     * goes. If chat notifications are built later, give this a real destination.
     */
    case NotificationEventType.CHAT_MESSAGE_RECEIVED:
      return '/my-vratmitras';
  }
}
