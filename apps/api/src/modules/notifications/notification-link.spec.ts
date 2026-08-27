import { describe, it, expect } from 'vitest';
import { NotificationEventType } from '@prisma/client';
import { notificationLinkPath } from './notification-link';

const ALL_EVENTS = Object.values(NotificationEventType);

describe('every notification has somewhere to go', () => {
  // The defect this replaces: 10 of 22 event types had no destination in the web app's own map,
  // so the notification rendered and clicking it did nothing. There is one map now, and this
  // asserts it covers the enum — a new event type without a destination fails here.
  it('maps every event type in the enum to a path', () => {
    const unmapped = ALL_EVENTS.filter((e) => {
      const path = notificationLinkPath(e, null, null, null);
      return !path || !path.startsWith('/');
    });

    expect(unmapped, 'event types with no destination').toEqual([]);
  });

  it('finds the events it is meant to be checking', () => {
    // An empty enum read would make the test above pass while checking nothing.
    expect(ALL_EVENTS.length).toBeGreaterThan(15);
  });
});

describe('destinations that depend on what the notification carries', () => {
  it('opens the blog a new comment is on', () => {
    expect(notificationLinkPath('BLOG_COMMENT_NEW', 'blog', 'b1', null)).toBe(
      '/community/blogs/b1',
    );
  });

  it('falls back to the blog list when the resource is not a blog', () => {
    expect(notificationLinkPath('BLOG_COMMENT_NEW', null, null, null)).toBe('/community/blogs');
  });

  // NEW_FOLLOWER stores the follower's *id*, and /u/[username] cannot be built from an id. That
  // is why it had no destination at all rather than merely a wrong one.
  it('opens the follower’s profile using their username', () => {
    expect(notificationLinkPath('NEW_FOLLOWER', 'user', 'u1', 'aarav')).toBe('/u/aarav');
  });

  it('falls back when the username is absent rather than building /u/undefined', () => {
    expect(notificationLinkPath('NEW_FOLLOWER', 'user', 'u1', null)).toBe('/profile');
  });

  it('opens the journey when one is named', () => {
    expect(notificationLinkPath('JOURNEY_DORMANT', 'journey', 'j1', null)).toBe('/journeys/j1');
  });

  // VM_WITHDREW is created with resourceType 'user', not 'journey' — so it cannot name a journey
  // and must not pretend to.
  it('falls back to the journey list when the resource is not a journey', () => {
    expect(notificationLinkPath('VM_WITHDREW', 'user', 'u1', null)).toBe('/journeys');
  });

  it('sends a moderator to the queue they act in', () => {
    expect(notificationLinkPath('CUSTOM_ERC_REVIEW_REQUESTED', null, null, null)).toBe(
      '/moderation/custom-erc',
    );
    expect(notificationLinkPath('COMMENT_REPORTED', 'blog_comment', 'c1', null)).toBe(
      '/moderation',
    );
  });

  it('sends work-queue events to the shared entry', () => {
    for (const event of [
      'ERC_CLOSURE_SUBMITTED',
      'CUSTOM_ERC_APPROVED',
      'VM_SUGGESTION_NEW',
    ] as NotificationEventType[]) {
      expect(notificationLinkPath(event, null, null, null)).toBe('/actions');
    }
  });
});
