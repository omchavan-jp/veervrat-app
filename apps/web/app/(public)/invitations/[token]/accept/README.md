# accept

## Overview

Invitation token preview and accept/decline outcomes with inviter identity [apps/web/app/(public)/invitations/[token]/accept/page.tsx:InvitationAcceptPage].

## Interface

- Default export InvitationAcceptPage reads route token and authentication; fetches invitationsApi.byToken under ['invitation', token] [apps/web/app/(public)/invitations/[token]/accept/page.tsx:InvitationAcceptPage].

## Invariants

- Preview query retries disabled; failed preview or non-PENDING status makes invitation unusable; response buttons shown only while usable and authenticated, disabled while either mutation pending [apps/web/app/(public)/invitations/[token]/accept/page.tsx:InvitationAcceptPage].
- The parent public layout exempts authenticated visitors only when a truthy `token` search parameter exists. The token in this route's path does not satisfy that check, so a signed-in visit without that search parameter is redirected before the acceptance UI is shown [apps/web/app/(public)/layout-client.tsx:PublicLayoutClient].

## Side Effects

- Calls invitationsApi.accept/decline(token), updates accepted/declined/error outcome and displays errorMessage; unauthenticated viewers receive signup/login links [apps/web/app/(public)/invitations/[token]/accept/page.tsx:InvitationAcceptPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
