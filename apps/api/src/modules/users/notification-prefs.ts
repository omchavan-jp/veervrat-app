// Per-event email opt-out preferences (spec/25). Stored as a JSON map of event → boolean on
// the user; a missing key means email is enabled (all emailable events default on — only an
// explicit `false` opts out). Mirrors profile-visibility.ts.
//
// Only the events that send email by default (the ✅ rows in spec/25) are togglable here.
// In-app-only events are never emailed, and chat email is a per-VM setting (spec/18) — both
// are intentionally excluded.

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

export type NotificationPrefs = Partial<Record<EmailableEvent, boolean>>;

const EMAILABLE_SET = new Set<string>(EMAILABLE_EVENTS);

// True unless the user has explicitly opted out of email for this event.
export function isEmailEnabled(prefs: NotificationPrefs, event: EmailableEvent): boolean {
  return prefs[event] !== false;
}

// Normalizes arbitrary JSON from the DB into a typed prefs map, dropping unknown keys and
// non-boolean values.
export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== 'object') return {};
  const out: NotificationPrefs = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (EMAILABLE_SET.has(key) && typeof value === 'boolean') {
      out[key as EmailableEvent] = value;
    }
  }
  return out;
}
