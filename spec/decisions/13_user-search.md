# User Search
_Last updated: 2026-06-01 | Round: R2_

## Confirmed Decisions

### Search Scope
- Auth-required to use search. Guests can view profiles reached via blogs/experiences (soft prompt to sign up/login when they try).
- Search is available from multiple entry points: global VM section, journey VM section, general user discovery. Same underlying search, different context determines what action is offered after finding a user.

### Search Fields (v1)
- Searches across: **username**, **display name**, and **email** (email only matches on full exact email — no partial email search).
- Username and display name: fuzzy/partial match.
- All three fields searched simultaneously.

### Search Filters
- v1: no filters. Name/username/email only.
- v2: extend with filters (e.g. "has acted as VM", location, etc.) — to be brainstormed and designed.

### Invitation System
Two distinct invitation types, both tracked:

#### 1. Platform Invitation (invite to join Veervrat)
- Any authenticated user can invite anyone to join the platform.
- VA enters an email address → platform sends an invitation email (via Resend) with a signup link.
- VA can also share a platform-independent invite message (copy/paste) for WhatsApp, Instagram, Facebook, etc.
- Tracked: who invited whom, when, invite status (pending/accepted/expired).

#### 2. VM Invitation (invite as vratmitra)
- VA invites a specific user (existing on platform or not yet) to act as their VM for a specific scope:
  - Global VM
  - Journey-specific VM (for a specific journey)
- If the invitee is not yet on the platform: platform sends an invite link that pre-fills the VM role context ("You've been invited to be the vratmitra of [VA display name] for [scope]"). They must sign up first, then accept.
- If the invitee is already on the platform: standard VM invitation flow (already specced in lifecycle).
- VA can also share a platform-independent message (WhatsApp, Instagram, etc.) alongside or instead of the email invite.
- Tracked: inviter (VA), invitee (email or user ID), scope (global / journey ID), invited at, status (pending / accepted / declined / expired), invitation channel (in-app / email / external).

### Invite Code / Tracking
- Every invitation (platform or VM) generates a unique invite token/code.
- Tracked fields: inviter user ID, invitee email or user ID, invitation type (platform / VM-global / VM-journey), scope ID (journey ID if journey-scoped), invited at, accepted at, status, channel.
- Enables: attribution (who invited whom), VM context pre-fill on signup, analytics on invite funnel.

### Invite Expiry & Status
- Platform invite expiry: **30 days**. VM invite expiry: **7 days**.
- VA can see all invitation statuses (pending / accepted / declined / expired) from a dedicated Invitations section.
- Platform-independent message copy is **auto-generated** by the app (VA name, app name, invite link pre-filled) but VA can edit before sharing.
- VA is notified when a VM invite expires. Notification deep-links directly to the re-invite action.

### Invitation Edge Cases

**A — Global VM invite pending, VA tries to assign a different global VM:**
- VA is warned that a pending global VM invite exists.
- VA must cancel the pending invite before a new global VM can be assigned.
- Only one pending global VM invite allowed at a time.

**B — Journey VM invite pending, journey becomes inactive/completed/deleted:**
- Invite is auto-cancelled.
- When invitee clicks the link: resolves to a valid screen (not 404) showing "This VM invitation is no longer active" with a CTA to join the platform regardless.
- Separates "journey gone" from "platform unavailable."

**C — Non-platform invitee signs up after invite token expires:**
- Invitee sees "invite expired" message.
- VA is notified that the invitee joined the platform (so they can re-invite manually). Notification deep-links to re-invite action.

**D — VA deletes account while VM invite is pending:**
- Invite is auto-cancelled. Invitee sees "invitation no longer active" if they try to use the link.

### Last Active & Online Presence
- **Last active** is shown on public profiles and in search results: "Today", "1 day ago", "3 days ago", etc. (day-level granularity, not exact time).
- **Currently active** (online indicator) — shown when user is actively using the app. VA can toggle this on/off from settings. Default: on.
- VA can hide last active from their public profile (privacy setting, like WhatsApp last seen). Default: visible.
- When last active is hidden: field is absent entirely from search result display — not shown as "—" or any placeholder.

## Open Questions (area-specific)
- Search result ranking — exact match first, then fuzzy? TBD implementation detail.
- Currently active indicator — shown to everyone (guests, other VAs) or only to authenticated users?

## Flags
- ⚠ VM invitation for non-platform users requires a pre-filled signup flow — the invite link must carry context (VA identity, scope, role) through the signup process and surface it after account creation.
- ⚠ v2 search filters — note to brainstorm and design filter extension before v2 scope is set.
