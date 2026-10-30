# templates

## Overview

Bilingual React email templates cover account actions, exports, invitations and notifications. [DataExportEmail.tsx:DataExportEmail] [NotificationEmail.tsx:NotificationEmail] [VmInvitationEmail.tsx:VmInvitationEmail]

## Interface

- Exports React components and subject helpers for data export, email change, password reset, verification, platform and Vratmitra invitations and their accepted/declined notices, and event notifications. [DataExportEmail.tsx:getSubject] [EmailChangeEmail.tsx:getEmailChangeSubject] [PasswordResetEmail.tsx:getSubject] [VerifyEmailEmail.tsx:getSubject] [PlatformInvitationEmail.tsx:getSubject] [VmInvitationEmail.tsx:getSubject] [VmInvitationAcceptedEmail.tsx:getSubject] [VmInvitationDeclinedEmail.tsx:getSubject] [NotificationEmail.tsx:getNotificationSubject]

## Invariants

- Copy is selected by EN or MR; account action templates include links and stated expiry, with first-password wording distinct from reset. [PasswordResetEmail.tsx:PasswordResetEmail] [EmailChangeEmail.tsx:EmailChangeEmail] [VerifyEmailEmail.tsx:VerifyEmailEmail] [DataExportEmail.tsx:DataExportEmail]
- Notification copy is keyed by EmailableEvent and language, includes a link and settings footer; invitation copy distinguishes global and journey scope. [NotificationEmail.tsx:NotificationEmail] [VmInvitationEmail.tsx:VmInvitationEmail]

## Side Effects

- Components construct React elements; delivery is handled elsewhere. [NotificationEmail.tsx:NotificationEmail] [PlatformInvitationEmail.tsx:PlatformInvitationEmail]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
