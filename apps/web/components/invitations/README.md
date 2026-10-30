# invitations

## Overview

Displays received invitations and their response actions.

## Interface

- ReceivedInvitations queries received invitations, displays inviter identity, scope and expiry, and provides accept and decline controls [received-invitations.tsx:ReceivedInvitations].

## Invariants

- Renders no section when received list is empty; both actions are disabled while either mutation is pending [received-invitations.tsx:ReceivedInvitations].

## Side Effects

- Accepts or declines by token, displays feedback, and invalidates invitation and my-vms queries [received-invitations.tsx:ReceivedInvitations].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
