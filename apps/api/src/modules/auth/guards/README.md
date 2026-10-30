# guards

## Overview

Google Passport guard builds OAuth state and exports reauthentication state parser. [google-oauth.guard.ts:GoogleOAuthGuard] [google-oauth.guard.ts:parseReauthState]

## Interface

- Exports REAUTH_STATE='reauth', REAUTH_FLOWS=['delete','email'], ReauthFlow type, parseReauthState(state?) returning isReauth/optional flow, and GoogleOAuthGuard extending AuthGuard('google') with getAuthenticateOptions(context). [google-oauth.guard.ts:REAUTH_STATE] [google-oauth.guard.ts:REAUTH_FLOWS] [google-oauth.guard.ts:ReauthFlow] [google-oauth.guard.ts:parseReauthState] [google-oauth.guard.ts:GoogleOAuthGuard]
- SessionGuard.canActivate requires a session; OptionalSessionGuard.canActivate admits guests. [session.guard.ts:canActivate] [optional-session.guard.ts:canActivate]

## Invariants

- Nonempty string pending query takes precedence as state; intent=reauth emits reauth:<flow> only for allowlisted flow, otherwise reauth. Missing/other state is not reauth; unknown suffix after reauth: still counts as reauth but drops flow. [google-oauth.guard.ts:getAuthenticateOptions] [google-oauth.guard.ts:parseReauthState]
- The pending query value is passed through as state when it is a nonempty string; this guard does not validate that it is a record identifier. Reauthentication state uses a fixed marker and an optional allowlisted flow. [google-oauth.guard.ts:getAuthenticateOptions] [google-oauth.guard.ts:REAUTH_FLOWS]
- Missing or invalid required sessions throw SessionExpiredException; optional validation errors become null and still return true. [session.guard.ts:canActivate] [optional-session.guard.ts:canActivate]

## Side Effects

- Supplies state in Google Passport authentication options using HTTP query values. [google-oauth.guard.ts:getAuthenticateOptions]
- Read SESSION_COOKIE_NAME (default veervrat_session), read request cookies, call AuthService.validateSession, and set request.user and request.sessionId when valid. [session.guard.ts:canActivate] [optional-session.guard.ts:canActivate]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
