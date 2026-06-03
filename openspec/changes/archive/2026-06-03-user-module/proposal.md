## Why

Auth handles identity (sessions, credentials, OAuth). User module handles profile data — the user as a domain entity. These must be separate: auth is about "who are you?", users is about "what is your profile?". Without the UsersModule, PATCH /users/me and public profile lookup have no home, blocking every feature that surfaces user data.

## What Changes

- New `UsersModule` (NestJS) with controller, service, repository
- `GET /api/v1/users/me` — full profile for the authenticated user (richer than auth/me)
- `PATCH /api/v1/users/me` — update own profile fields (displayName, username, gender, dob, language)
- `GET /api/v1/users/:username` — public profile (respects profilePrivate; hides toggled-off fields entirely)
- `GET /api/v1/users/check-username?username=X` — username availability (distinct from auth/check-username path; used by PATCH /users/me update flow)
- `PublicProfileDto` — response shape for public profile, filtering out private fields
- `UpdateProfileDto` — validated DTO for PATCH /users/me

## Capabilities

### New Capabilities
- `user-profile`: CRUD for user profile data — own profile read/write, public profile lookup, username check

### Modified Capabilities
_(none — no spec-level behavior changes to existing capabilities)_

## Impact

- New files: `apps/api/src/modules/users/` (module, controller, service, repository, 2 DTOs)
- `AppModule` gains `UsersModule` import
- No schema changes — all required fields exist on `User` model already (`displayName`, `username`, `avatarUrl`, `gender`, `dob`, `language`, `showLastActive`, `showOnlineIndicator`, `profilePrivate`, `lastActiveAt`, `createdAt`)
- No new dependencies
- Permissions: `SessionGuard` for authenticated routes; service-layer privacy check for public profile
