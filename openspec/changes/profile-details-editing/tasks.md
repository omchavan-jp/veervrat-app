# Tasks — Profile Details Editing

## 1. Implementation

- [x] 1.1 Extend `ProfileSection` in `apps/web/app/(app)/settings/page.tsx`: username input with debounced availability status + URL-change warning, gender radio (Male/Female/other + custom), dob DatePicker (max today); Save sends only changed fields; success toast; 409 → inline taken message
- [x] 1.2 Add "Edit in settings" link on `apps/web/app/(app)/profile/page.tsx`
- [x] 1.3 i18n keys (en + mr) under `settings.*` for all new strings

## 2. Verify & ship

- [x] 2.1 typecheck + lint + web build green; manual dev-run sanity of the section
- [x] 2.2 Squash to dev, deploy, CHANGELOG entry, close #1
