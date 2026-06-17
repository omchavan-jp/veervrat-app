// Emailable notification events (the ✅ rows in spec/25) the user can opt out of from
// account settings. Mirrors the backend allowlist in modules/users/notification-prefs.ts.
export const EMAILABLE_EVENTS = [
  'VM_INVITATION_RECEIVED',
  'VM_INVITATION_ACCEPTED',
  'VM_INVITATION_DECLINED',
  'VM_INVITATION_EXPIRED',
  'INVITEE_JOINED_PLATFORM',
  'JOURNEY_DORMANT',
  'ERC_CLOSURE_SUBMITTED',
  'ERC_CLOSURE_APPROVED',
  'ERC_RETURNED_FOR_REVISIT',
  'JOURNEY_COMPLETION_SUBMITTED',
  'JOURNEY_COMPLETION_APPROVED',
  'CUSTOM_ERC_REVIEW_REQUESTED',
  'CUSTOM_ERC_APPROVED',
  'CUSTOM_ERC_REJECTED',
  'VM_WITHDREW',
] as const;

export type EmailableEvent = (typeof EMAILABLE_EVENTS)[number];
