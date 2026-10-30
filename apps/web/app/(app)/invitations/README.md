# invitations

## Overview

Invitation search, sending, received invitation composition, reminder, cancel, and share UI. [apps/web/app/(app)/invitations/page.tsx:InvitationsPage]

## Interface

- Exports default InvitationsPage and composes ReceivedInvitations; local InvitationRow accepts inv, onRemind, onCancel, and remindPending. [apps/web/app/(app)/invitations/page.tsx:InvitationsPage] [apps/web/app/(app)/invitations/page.tsx:InvitationRow]
- STATUS_TINT supplies PENDING, ACCEPTED, DECLINED, EXPIRED, and CANCELLED styles; isEmail checks a basic non-whitespace local/domain/dot pattern. [apps/web/app/(app)/invitations/page.tsx:STATUS_TINT] [apps/web/app/(app)/invitations/page.tsx:isEmail]

## Invariants

- User search uses a 250ms debounced value and is enabled only at trimmed length >= 2 with no selected user; selected users receive VM_GLOBAL invitations, while the no-result email action sends PLATFORM invitations. [apps/web/app/(app)/invitations/page.tsx:InvitationsPage]
- Reminder, share, and cancel controls render for PENDING invitations; reminder is disabled while pending or when reminderSentAt is non-null. [apps/web/app/(app)/invitations/page.tsx:InvitationRow]

## Side Effects

- Queries usersApi.search and invitationsApi.list; send, sendReminder, and cancel mutations invalidate queryKeys.invitations.list on success, with send clearing selection/query and send/reminder emitting success or error toasts. [apps/web/app/(app)/invitations/page.tsx:InvitationsPage]
- Copies inv.shareMessage using navigator.clipboard.writeText and resets copied state after 1500ms. [apps/web/app/(app)/invitations/page.tsx:InvitationRow]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
