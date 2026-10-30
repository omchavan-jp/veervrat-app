# layout

## Overview

Authenticated application chrome, navigation and notification UI.

## Interface

- Exports ShellUser and AppShell with user and children [app-shell.tsx:ShellUser] [app-shell.tsx:AppShell].
- Exports Header, NotificationBell and NotificationPanel [header.tsx:Header] [notification-bell.tsx:NotificationBell] [notification-panel.tsx:NotificationPanel].

## Invariants

- Mentor navigation requires assignments; moderation and admin links depend on roles; action badges are independent [app-shell.tsx:useNavGroups].
- Content editor requires runtime enablement and CONTENT_EDIT grant; auth gating belongs to caller [app-shell.tsx:AppShell].
- Unknown notification event types render raw; unread badge caps display at 99+ [notification-panel.tsx:NotificationRow] [notification-bell.tsx:NotificationBell].

## Side Effects

- Fetches action counts and polls unread notifications every 30 seconds [app-shell.tsx:useNavGroups] [notification-bell.tsx:NotificationBell].
- Persists sidebar collapse in localStorage and invokes logout mutation [app-shell.tsx:AppShell] [app-shell.tsx:LeftRail] [header.tsx:Header].
- Marks notifications read or all read, invalidates list/count, and navigates to item links [notification-panel.tsx:NotificationPanel].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
