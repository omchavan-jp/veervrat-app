# Profile Details Editing (Settings)

Tracked as GitHub issue [#1](https://github.com/veer-vrat/veervrat-app/issues/1).

## Why

A beta tester who set a wrong birthdate at signup has no way to see or correct it, and
profile fields (username, gender, birthdate) are not editable anywhere. The backend
already supports all of this (`PATCH /users/me` accepts displayName, username, gender,
dob; availability check exists) — the gap is purely settings UI.

Decisions (recorded on issue #1): birthdate freely editable; username editable with an
availability check and a warning that the public profile URL changes; gender editable;
all inside the existing Settings → Profile section.

## What Changes

- Settings → Profile section gains username (debounced availability check + URL-change
  warning), gender (radio + custom, as at onboarding), and birthdate (DatePicker)
  alongside the existing display-name field; one Save submits only changed fields.
- `/profile` page gets an "Edit in settings" link.
- No backend, schema, or permission changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `account-settings`: adds a requirement that profile details (display name, username,
  gender, birthdate) are self-editable from settings.

## Impact

- `apps/web/app/(app)/settings/page.tsx` (ProfileSection), `apps/web/app/(app)/profile/page.tsx`,
  `messages/en.json` + `mr.json`. No new dependencies.
