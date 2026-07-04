# Design — Profile Details Editing

## Context

Backend complete: `PATCH /users/me` (UpdateProfileDto: displayName, username w/
uniqueness, gender nullable, dob nullable) and `GET /auth/check-username`. The settings
page uses local useState + TanStack mutations (not RHF) — the new fields follow the
page's existing style. Onboarding already has the exact UI patterns to mirror
(debounced username status line, gender radio with 'other' custom input, DatePicker).

## Goals / Non-Goals

**Goals:** self-service correction of profile fields with the same UX language as
onboarding; only changed fields sent; URL-change warning when username differs.

**Non-Goals:** avatar upload; email change (separate existing flow); clearing gender/dob
to null via UI (backend supports it; add later if asked); any backend change.

## Decisions

- **D1 — Follow the settings page's useState style**, not RHF: the page's other
  sections all use useState + mutation; consistency beats the RHF convention here.
- **D2 — Username status reuses the onboarding logic** (400ms debounce,
  checking/available/taken/invalid states, own-username short-circuits to available).
  Save disabled while status is taken/invalid/checking and username changed.
- **D3 — Warning, not confirmation**: an inline notice appears when username differs
  from current, stating the profile URL will change. No modal.
- **D4 — Gender mapping**: stored value 'Male'/'Female' selects the radio; any other
  non-null value selects 'other' with the custom input prefilled.

## Risks / Trade-offs

- [409 race on username despite availability check] → mutation error surfaces the
  taken message inline (same as onboarding).
- [Old profile links break after username change] → accepted per decision; warning
  shown.

## Migration Plan

UI-only; ships with the normal web deploy. Rollback = revert commit.

## Open Questions

None.
