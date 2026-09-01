/**
 * Surviving the Google re-authentication round trip (#208).
 *
 * Proving yourself with Google is a **full-page redirect**: the browser leaves for Google and comes
 * back to `/settings?reauth=ok`. Everything the page held in React state goes with it — the open
 * dialog, and the email address the person had typed. They returned to a settings page that looked
 * untouched, with no sign anything had happened, and had to know to reopen the thing they were
 * already in and type the address again.
 *
 * Two things are carried, by two different mechanisms, and the split is the point.
 *
 * | What | Where | Why |
 * |---|---|---|
 * | which flow | the OAuth `state`, server-mediated | present whenever the redirect is — including in a new tab or after a browser clears site data, which is exactly when showing the wrong thing would be worst |
 * | what was typed | `sessionStorage`, here | it is an **email address**. In `state` it would travel to Google, sit in the redirect URL, and land in access logs and browser history — to save one field of retyping |
 *
 * That second rule is not new. The guard already carries the signup date of birth as a record id
 * rather than a value, for the same reason, and says so.
 */

const DRAFT_KEY = 'veervrat:reauth-email-draft';

/** The settings flows a re-authentication can be begun from. Mirrors the API's allowlist. */
export type ReauthFlow = 'delete' | 'email';

/**
 * `sessionStorage`, not `localStorage`: scoped to the tab and cleared when it closes, which is
 * about as long as a half-finished email change is worth keeping. `localStorage` would leave the
 * address somebody was moving to sitting on a shared machine indefinitely.
 *
 * ⚠️ Every access is wrapped. A private window, blocked site data, or a thumbnailing context
 * throws on `sessionStorage` — and failing to restore a draft must never stop the page rendering.
 * The cost of losing it is retyping one field, which is exactly today's behaviour.
 */
export function saveEmailDraft(value: string): void {
  try {
    if (value) window.sessionStorage.setItem(DRAFT_KEY, value);
  } catch {
    // No draft survives. The field comes back empty, as it does today.
  }
}

/** Reads the draft and removes it — a draft that outlives its flow is a stale value waiting to be
 * restored into the wrong context. */
export function takeEmailDraft(): string {
  try {
    const value = window.sessionStorage.getItem(DRAFT_KEY);
    window.sessionStorage.removeItem(DRAFT_KEY);
    return value ?? '';
  } catch {
    return '';
  }
}

export function clearEmailDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear, or nothing readable. Either way there is nothing to do.
  }
}

/** What the API sent us back. Anything unrecognised is treated as absent. */
export type ReauthReturn = {
  outcome: 'ok' | 'wrong_account' | null;
  flow: ReauthFlow | null;
};

/**
 * Reads the outcome and flow from the URL the callback redirected to.
 *
 * Both are validated rather than trusted: `state` makes a round trip through Google, so the flow
 * has already been checked against an allowlist server-side, and is checked again here. A value
 * that is not one of ours reads as absent, which degrades to landing on settings with the proof
 * held — the behaviour before this change.
 */
export function readReauthReturn(search: string): ReauthReturn {
  const params = new URLSearchParams(search);
  const rawOutcome = params.get('reauth');
  const rawFlow = params.get('flow');
  return {
    outcome: rawOutcome === 'ok' || rawOutcome === 'wrong_account' ? rawOutcome : null,
    flow: rawFlow === 'delete' || rawFlow === 'email' ? rawFlow : null,
  };
}

/** The URL that begins a round trip, carrying which flow to come back to — and nothing else. */
export function verifyWithGoogleUrl(apiBaseUrl: string, flow: ReauthFlow): string {
  return `${apiBaseUrl}/auth/google?intent=reauth&flow=${flow}`;
}
