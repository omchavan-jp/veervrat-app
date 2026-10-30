# lib

## Overview

Client-side age qualification helpers. Shared consent, localization, notification and return-path utilities. Client providers, runtime configuration, session representation, reauthentication and text utilities.

## Interface

- Exports MINIMUM_AGE_YEARS, latestQualifyingDob, latestQualifyingDobInputValue and meetsMinimumAge [age.ts:MINIMUM_AGE_YEARS] [age.ts:meetsMinimumAge].
- Exports [consents.ts:CURRENT_CONSENTS], [i18n-constants.ts:SUPPORTED_LOCALES], [i18n-constants.ts:Locale], [locale.ts:setLocaleCookie], [notification-events.ts:EMAILABLE_EVENTS], [notification-events.ts:EmailableEvent], and [product-docs-return.ts:safeProductDocsReturnTo].
- Providers and setMutationErrorToast/makeQueryClient configure React Query and global providers [providers.tsx:Providers] [query-client.ts:makeQueryClient] [query-client.ts:setMutationErrorToast].
- RuntimeConfigProvider/useRuntimeConfig and server/client config accessors expose environment configuration [runtime-config-provider.tsx:RuntimeConfigProvider] [runtime-config-provider.tsx:useRuntimeConfig] [runtime-config.ts:readServerRuntimeConfig] [runtime-config.ts:internalApiBase] [runtime-config.ts:publicApiBase] [runtime-config.ts:setClientRuntimeConfig] [runtime-config.ts:getRuntimeConfig].
- ReauthFlow, ReauthReturn, draft helpers, return parsing and Google URL helper support reauthentication [reauth-return.ts:ReauthFlow] [reauth-return.ts:ReauthReturn] [reauth-return.ts:saveEmailDraft] [reauth-return.ts:takeEmailDraft] [reauth-return.ts:clearEmailDraft] [reauth-return.ts:readReauthReturn] [reauth-return.ts:verifyWithGoogleUrl].
- SessionUser/Capability, SESSION_USER_HEADER and decodeSessionUser define session data [session-user.ts:SessionUser] [session-user.ts:Capability] [session-user.ts:SESSION_USER_HEADER] [session-user.ts:decodeSessionUser].
- initBrowserSentry, textToTiptapDoc, tiptapDocToText and cn provide tracking and conversion utilities [sentry-client.ts:initBrowserSentry] [tiptap-text.ts:textToTiptapDoc] [tiptap-text.ts:tiptapDocToText] [utils.ts:cn].
- [api](./api/README.md): Typed web API clients for session, actions, administration, audit, blogs, CMS and content overrides.
- [content-editor](./content-editor/README.md): Pure message catalog lookup, override and placeholder helpers for the content editor.
- [suggestions](./suggestions/README.md): Capture suggestion anchors, convert text bodies and resolve route entities.
- [validations](./validations/README.md): Zod schemas for authentication, signup and account setup.

## Invariants

- Minimum age is 18; comparison uses local calendar dates and includes the eighteenth birthday; server independently enforces the age gate [age.ts:meetsMinimumAge].
- Consent keys are terms and privacy; version is server-authoritative [consents.ts:CURRENT_CONSENTS]. Supported locales are en and mr [i18n-constants.ts:SUPPORTED_LOCALES].
- Return paths must be local product-docs paths; rejects protocol-relative paths and backslashes, returning pathname and query only [product-docs-return.ts:safeProductDocsReturnTo].
- Initial auth cache seeds only a non-null user once; 401 sets it to null; 403 invalidates it except for the auth query itself [providers.tsx:Providers] [query-client.ts:invalidateUserOnForbidden].
- Default queries have a 60-second staleTime and disable refetchOnWindowFocus; individual hooks can override these defaults. The global mutation error toast is skipped when a mutation has its own onError or meta.silent [query-client.ts:makeQueryClient].
- Feature modes fail closed; product docs are off in prod; client reads before provider setup throw [runtime-config.ts:readServerRuntimeConfig] [runtime-config.ts:getRuntimeConfig].
- Reauth outcomes and flows are allowlisted; draft storage failures are tolerated [reauth-return.ts:readReauthReturn] [reauth-return.ts:takeEmailDraft].

## Side Effects

- Writes lowercase NEXT_LOCALE browser cookie with one-year max age [locale.ts:setLocaleCookie].
- Provider registers and cleans up auth and toast callbacks; cache errors invalidate queries and can show mutation error toasts [providers.tsx:MutationErrorBridge] [providers.tsx:Providers] [query-client.ts:makeQueryClient].
- Reauth drafts write and remove sessionStorage; browser Sentry initializes once with a valid DSN [reauth-return.ts:saveEmailDraft] [reauth-return.ts:takeEmailDraft] [reauth-return.ts:clearEmailDraft] [sentry-client.ts:initBrowserSentry].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
