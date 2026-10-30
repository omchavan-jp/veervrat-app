# [id]

## Overview

User detail administration with role/capability toggles, account actions, journey state overrides and activity lists [apps/web/app/(admin)/admin/users/[id]/page.tsx:AdminUserDetailPage].

## Interface

- Default AdminUserDetailPage accepts params Promise containing id [apps/web/app/(admin)/admin/users/[id]/page.tsx:AdminUserDetailPage].
- UI role values are VRATARTHI, VRATMITRA, MODERATOR, ADMIN; capabilities are FEEDBACK_WIDGET, CONTENT_EDIT, CONTENT_SUGGEST, PRODUCT_DOCS_VIEW; journey options are NOT_STARTED, ACTIVE, PAUSED, DORMANT, COMPLETED [apps/web/app/(admin)/admin/users/[id]/page.tsx:ALL_ROLES] [apps/web/app/(admin)/admin/users/[id]/page.tsx:ALL_CAPABILITIES] [apps/web/app/(admin)/admin/users/[id]/page.tsx:JOURNEY_STATES].

## Invariants

- Detail query requires isAdmin; ready non-admins render null [apps/web/app/(admin)/admin/users/[id]/page.tsx:AdminUserDetailPage].
- CONTENT_EDIT toggle requires environment other than prod and contentEditEnabled; PRODUCT_DOCS_VIEW toggle requires productDocsMode granted [apps/web/app/(admin)/admin/users/[id]/page.tsx:AdminUserDetailPage].
- Anonymisation and override submission require a trimmed reason of at least three characters; override options exclude the current journey state; suspended/anonymised controls apply pending/anonymised disabled gates [apps/web/app/(admin)/admin/users/[id]/page.tsx:AdminUserDetailPage].

## Side Effects

- Invokes adminUsersApi detail/updateRoles/updateCapabilities/suspend/forceLogout/anonymise/overrideJourneyState; successful changes except forceLogout clear errors and invalidate detail and admin user queries; failures set error state [apps/web/app/(admin)/admin/users/[id]/page.tsx:AdminUserDetailPage].
- useAdminGuard redirects loaded authenticated non-admins to /dashboard [apps/web/hooks/use-admin-guard.ts:useAdminGuard].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
