## 1. Module scaffold

- [x] 1.1 Create `apps/api/src/modules/users/` directory with `users.module.ts`, `users.controller.ts`, `users.service.ts`, `users.repository.ts`
- [x] 1.2 Create `apps/api/src/modules/users/dto/update-profile.dto.ts` (displayName, username, gender, dob, language — all optional)
- [x] 1.3 Create `apps/api/src/modules/users/dto/public-profile.dto.ts` (response type — not a class-validator DTO, just TypeScript interface/type)
- [x] 1.4 Register `UsersModule` in `AppModule`

## 2. Repository

- [x] 2.1 Implement `UsersRepository.findById(id)` — returns full user row with privacy fields
- [x] 2.2 Implement `UsersRepository.findByUsername(username)` — returns full user row with counts (journeys completed, active, tests taken, public experience logs)
- [x] 2.3 Implement `UsersRepository.updateProfile(id, fields)` — partial update of displayName, username, gender, dob, language
- [x] 2.4 Implement `UsersRepository.isUsernameTaken(username, excludeUserId)` — returns boolean

## 3. Service

- [x] 3.1 Implement `UsersService.getOwnProfile(userId)` — calls repository, returns full profile data
- [x] 3.2 Implement `UsersService.updateOwnProfile(userId, dto)` — validates username uniqueness (skip check if same as current), calls repository, returns updated profile
- [x] 3.3 Implement `UsersService.getPublicProfile(username, requestingUserId?)` — fetches user, returns 404 if private, strips hidden fields (showLastActive, showOnlineIndicator), computes lastActive label and isOnline flag
- [x] 3.4 Implement `UsersService.checkUsernameAvailable(username, requestingUserId)` — regex check + DB uniqueness; own username always returns true
- [x] 3.5 Add `lastActive` label helper (UTC diff → "Today" / "1 day ago" / "N days ago")
- [x] 3.6 Add `isOnline` helper (lastActiveAt within last 5 minutes)

## 4. Controller

- [x] 4.1 `GET /users/check-username` — no auth required; query param `username`; returns `{ available: boolean }`
- [x] 4.2 `GET /users/me` — `SessionGuard`; calls service.getOwnProfile; returns own profile
- [x] 4.3 `PATCH /users/me` — `SessionGuard`; `UpdateProfileDto`; calls service.updateOwnProfile; returns updated profile
- [x] 4.4 `GET /users/:username` — no auth guard (public); calls service.getPublicProfile; returns public profile
- [x] 4.5 Ensure `/users/check-username` route is declared BEFORE `/:username` to avoid param swallowing

## 5. Exceptions

- [x] 5.1 Add `UserUsernameTakenException` to `common/exceptions/app.exceptions.ts` (HTTP 409, error: `USER_USERNAME_TAKEN`)

## 6. Tests

- [x] 6.1 `users.service.spec.ts` — unit tests for service layer:
  - getPublicProfile returns 404 for private profile (positive: public profile returned, negative: private → EntityNotFoundException)
  - updateOwnProfile throws on duplicate username taken by another user
  - checkUsernameAvailable returns true for own username
  - lastActive label helper: "Today" when lastActiveAt is today, "1 day ago" when yesterday
- [x] 6.2 `users.integration.spec.ts` — auth matrix tests:
  - `GET /users/me` with valid session → 200 (positive); no session → 401 (negative)
  - `PATCH /users/me` with valid session → 200 (positive); no session → 401 (negative)
  - `GET /users/:username` public profile → 200 (positive); private profile → 404 (negative)
