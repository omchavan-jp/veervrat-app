# api

## Overview

Typed web API clients for session, actions, administration, audit, blogs, CMS and content overrides. Typed web API clients and query-key/error helpers for product features.

## Interface

- Exports api, ApiError and setUnauthorizedHandler [client.ts:api]; actionsApi and action types [actions.ts:actionsApi]; adminUsersApi, roles and capabilities [admin-users.ts:adminUsersApi]; adminApi and taxonomy/content types [admin.ts:adminApi]; auditApi [audit.ts:auditApi].
- adminApi also lists, assigns and removes dated shloka schedule entries and lists/reorders the shloka queue; contentApi.today retrieves the selected daily shloka [admin.ts:adminApi.listSchedule] [admin.ts:adminApi.schedule] [admin.ts:adminApi.unschedule] [admin.ts:adminApi.listQueue] [admin.ts:adminApi.reorderQueue] [content.ts:contentApi.today].
- Exports authApi and User [auth.ts:authApi], blogsApi and blog types [blogs.ts:blogsApi], cmsApi and page types [cms.ts:cmsApi], and contentOverridesApi and override types [content-overrides.ts:contentOverridesApi].
- Content, suggestion and search clients: [content.ts:contentApi], [content-suggestions.ts:contentSuggestionsApi], [entity-search.ts:entitySearchApi].
- Dashboard, export, feedback, experiences and invitations clients: [dashboard.ts:dashboardApi], [data-export.ts:dataExportApi], [feedback.ts:feedbackApi], [experience-logs.ts:experienceLogsApi], [invitations.ts:invitationsApi].
- Journey, check-in, ERC, moderation, notifications and tests clients: [journeys.ts:journeysApi], [journeys.ts:checkinsApi], [journeys.ts:ercApi], [moderation.ts:moderationApi], [notifications.ts:notificationsApi], [tests.ts:testsApi].
- User, virtue, weakness, VM relationship and upload clients: [users.ts:usersApi], [virtues.ts:virtuesApi], [weaknesses.ts:weaknessesApi], [vm-relationships.ts:vmRelationshipsApi], [uploads.ts:uploadsApi].
- Cache keys and error helpers are exported as [query-keys.ts:queryKeys], [error-message.ts:errorMessage], [rate-limit.ts:rateLimitRetryAfter]; modules also export typed response and input shapes.

## Invariants

- Requests include credentials and JSON; mutations obtain an in-memory CSRF token and retry once on 403; 401 invokes the handler except for /auth/me, and 204 returns undefined [client.ts:request] [client.ts:notifyIfSessionEnded].
- API wrappers generally unwrap data; cmsApi.getByKey catches errors and returns null [cms.ts:cmsApi]. Google signup sends DOB and consent before redirect, returning an opaque pending ID; consent acceptance sends no versions [auth.ts:authApi].
- Override locales are en and mr, and upsert includes baseValue for server-side placeholder parity [content-overrides.ts:UpsertOverrideInput].
- Most clients unwrap the response data property [content.ts:contentApi]. Error messages expose nonblank API messages only for 4xx responses [error-message.ts:errorMessage].
- Rate-limit helper recognizes RATE_LIMITED and ACCOUNT_LOCKED, returning rounded-up seconds or zero for invalid countdowns [rate-limit.ts:rateLimitRetryAfter].
- Public profile fields can be omitted by visibility settings and exclude date of birth [users.ts:PublicProfile]; notification destinations come from the API [notifications.ts:NotificationItem].
- Invitation list is sent invitations; received is separate and token lookup can be unauthenticated [invitations.ts:invitationsApi].

## Side Effects

- API calls perform network reads and mutations, including account management, content curation, blog comments, and publishing staged overrides [client.ts:request] [admin-users.ts:adminUsersApi] [admin.ts:adminApi] [blogs.ts:blogsApi] [content-overrides.ts:contentOverridesApi].
- Client methods perform API GET and mutation requests, including account deletion, relationship changes and moderation [users.ts:usersApi] [vm-relationships.ts:vmRelationshipsApi] [moderation.ts:moderationApi].
- Uploads read browser files as base64 and POST JSON to image endpoints [uploads.ts:fileToBase64] [uploads.ts:uploadsApi]; export email requests a link [data-export.ts:dataExportApi].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
