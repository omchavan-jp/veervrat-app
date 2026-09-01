import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveEmailDraft,
  takeEmailDraft,
  clearEmailDraft,
  readReauthReturn,
  verifyWithGoogleUrl,
} from '@/lib/reauth-return';

/**
 * What survives the Google round trip, and what must not (#208).
 *
 * The address someone is moving to is personal data. Carried in the OAuth `state` it would travel
 * to Google, sit in the redirect URL, and land in access logs and browser history — to save one
 * field of retyping. So it stays in the browser, and the assertions below check that **negatively**
 * as well as positively: it is not enough that the flow is carried, the address must be absent.
 */
const API = 'https://api.example.test/api/v1';

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('the draft stays in the browser', () => {
  it('round-trips what was typed', () => {
    saveEmailDraft('new@example.com');
    expect(takeEmailDraft()).toBe('new@example.com');
  });

  it('is spent once read — a draft that outlives its flow is restored into the wrong one', () => {
    saveEmailDraft('new@example.com');
    expect(takeEmailDraft()).toBe('new@example.com');
    expect(takeEmailDraft()).toBe('');
  });

  it('stores nothing when there is nothing to store', () => {
    saveEmailDraft('');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('can be cleared when the change succeeds', () => {
    saveEmailDraft('new@example.com');
    clearEmailDraft();
    expect(takeEmailDraft()).toBe('');
  });

  it('uses sessionStorage, not localStorage — a shared machine must not keep it', () => {
    saveEmailDraft('new@example.com');
    // localStorage survives the browser closing. The address someone was part-way through moving
    // to should not sit on a shared machine indefinitely.
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(1);
  });
});

describe('storage being unavailable does not break anything', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'sessionStorage', original);
  });

  function breakStorage() {
    // A private window, blocked site data, or a thumbnailing context throws on access — not
    // returns null. Code that only handles null still crashes.
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  }

  it('saving does not throw', () => {
    breakStorage();
    expect(() => saveEmailDraft('new@example.com')).not.toThrow();
  });

  it('reading returns nothing rather than throwing', () => {
    breakStorage();
    expect(() => takeEmailDraft()).not.toThrow();
    expect(takeEmailDraft()).toBe('');
  });

  it('clearing does not throw', () => {
    breakStorage();
    expect(() => clearEmailDraft()).not.toThrow();
  });
});

describe('what the URL carries', () => {
  it('carries the flow, and only the flow', () => {
    const url = verifyWithGoogleUrl(API, 'email');
    expect(url).toContain('intent=reauth');
    expect(url).toContain('flow=email');
  });

  it('never carries what was typed', () => {
    // The negative half, and the one that matters. A URL containing the address would put it in
    // Google's logs and the browser's history.
    saveEmailDraft('secret@example.com');
    const url = verifyWithGoogleUrl(API, 'email');
    expect(url).not.toContain('secret@example.com');
    expect(url).not.toContain('@');
  });

  it('reads back an outcome and a flow we published', () => {
    expect(readReauthReturn('?reauth=ok&flow=delete')).toEqual({ outcome: 'ok', flow: 'delete' });
    expect(readReauthReturn('?reauth=wrong_account&flow=email')).toEqual({
      outcome: 'wrong_account',
      flow: 'email',
    });
  });

  it('treats anything unrecognised as absent', () => {
    // `flow` makes a round trip through Google, so it is validated again here. An unknown value
    // degrades to landing on settings with the proof held — the behaviour before this change.
    expect(readReauthReturn('?reauth=ok&flow=../../etc')).toEqual({ outcome: 'ok', flow: null });
    expect(readReauthReturn('?reauth=maybe&flow=delete')).toEqual({
      outcome: null,
      flow: 'delete',
    });
    expect(readReauthReturn('')).toEqual({ outcome: null, flow: null });
  });
});
