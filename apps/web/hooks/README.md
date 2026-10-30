# hooks

## Overview

Client hooks for auth, consent, journeys, tests, weaknesses, debounce, and notifications.

## Interface

- Auth and onboarding hooks expose session and mutations [use-auth.ts:useAuth] [use-auth.ts:useCompleteFramework]; admin gate exposes isAdmin and ready [use-admin-guard.ts:useAdminGuard].
- Consent hooks query and accept documents [use-consents.ts:useOutstandingConsents]; journey, ERC, and check-in hooks wrap API operations [use-journeys.ts:useErcMutation] [use-journeys.ts:useLogCheckin].
- Test hooks create, save, submit and report [use-tests.ts:useTest]; weakness list/detail, debouncing and toast adapter are exported [use-weaknesses.ts:useWeakness] [use-debounce.ts:useDebounce] [use-toast.ts:useToast].

## Invariants

- Auth 401 maps to null with retries disabled; window focus may refetch [use-auth.ts:useAuth]. Admin guard is a UI redirect, not the security boundary [use-admin-guard.ts:useAdminGuard].
- Consent query has infinite stale time; test detail always refetches on mount and submitted reports use infinite stale time [use-consents.ts:useOutstandingConsents] [use-tests.ts:useTest] [use-tests.ts:useTestReport].
- Journey and check-in detail queries require IDs; ERC mutations invalidate list, pool and journey detail [use-journeys.ts:useErcMutation] [use-journeys.ts:useCheckins].

## Side Effects

- Mutations call APIs, update or invalidate React Query caches and may navigate; login writes locale cookie and logout clears cache [use-auth.ts:useLogin] [use-auth.ts:useLogout] [use-consents.ts:useAcceptConsents] [use-journeys.ts:useCompleteJourney] [use-tests.ts:useSubmitTest].
- Admin guard redirects non-admin users; debounce manages a timer and toast adapter adds notifications [use-admin-guard.ts:useAdminGuard] [use-debounce.ts:useDebounce] [use-toast.ts:useToast].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
