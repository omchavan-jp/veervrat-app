# invitations

## Overview

Invitations support platform signup and global or journey mentorship, with public token display and authenticated decisions. [invitations.service.ts:InvitationsService] [invitations.controller.ts:InvitationsController] [public-invitations.controller.ts:PublicInvitationsController]

## Interface

- Authenticated routes send, list, remind, cancel, accept and decline; the optional-session token lookup is throttled. [invitations.controller.ts:InvitationsController] [public-invitations.controller.ts:byToken]
- Authenticated controller must precede public controller so received is not matched as a token. [invitations.module.ts:InvitationsModule]
- [dto](./dto/README.md): Invitation DTOs validate invitation type, optional recipient and scope, and token parameters.

## Invariants

- VM sending requires permission; journey invitations require ownership, and only one pending global invitation per inviter is allowed. Platform invitations reject usernames. [invitations.service.ts:sendVmInvitation]
- Tokens use 32 random bytes; platform invitations expire after 30 days and VM invitations after seven. Acceptance requires permission, pending status and unexpired token; decline and cancel require pending status, and reminders are inviter-only and once per invitation. [invitations.repository.ts:create] [invitations.service.ts:acceptInvitation] [invitations.service.ts:declineInvitation] [invitations.service.ts:cancelInvitation] [invitations.service.ts:sendReminder]
- Received list selects pending invitations by invitee ID; public display selects inviter identity and invitation metadata without invitee details. [invitations.repository.ts:listByInvitee] [invitations.repository.ts:findByTokenForDisplay]

## Side Effects

- Creates and updates invitations, queues invitation or decline emails and creates notifications. Accepting a VM invitation creates its relationship and then grants VRATMITRA role; accepting a platform invitation creates neither, but still marks acceptance and emits VM_INVITATION_ACCEPTED. [invitations.service.ts:sendVmInvitation] [invitations.service.ts:acceptInvitation] [invitations.service.ts:declineInvitation] [invitations.repository.ts:grantVratmitraRole]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
