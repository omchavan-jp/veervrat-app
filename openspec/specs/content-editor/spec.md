# content-editor Specification

## Purpose
TBD - created by archiving change in-context-content-editor. Update Purpose after archive.
## Requirements
### Requirement: Content-edit mode gating
The in-context editor SHALL be available only when the web app is built/run with
`NEXT_PUBLIC_CONTENT_EDIT` set to `on`. When the variable is unset or any other value, the
editor overlay, its keyboard/mouse listeners, and its API calls SHALL NOT be present, and
the app SHALL behave byte-for-byte as it does today. The production build SHALL run with
the flag off.

#### Scenario: Editor available in content-edit mode
- **WHEN** the app is built with `NEXT_PUBLIC_CONTENT_EDIT=on` and an authorized editor views a page
- **THEN** Option/Alt-clicking text activates the editor overlay

#### Scenario: Inert in production
- **WHEN** the app is built without `NEXT_PUBLIC_CONTENT_EDIT` (production)
- **THEN** no editor overlay, listeners, or content-override requests exist anywhere in the running app

### Requirement: Option-click resolves the underlying message key(s)
In content-edit mode, Option/Alt-clicking a visible text element SHALL resolve the i18n
key(s) that produced it by reverse-lookup against the messages provided by
`useMessages()`. When several keys share the exact clicked text, the editor SHALL narrow
the candidates using DOM/route context available without any call-site changes — whether
the click occurred inside an open dialog (matched against keys whose path mentions
"modal"/"dialog"), and the current route's path segments (matched against each
candidate's leading namespace segment). When narrowing yields exactly one key, the edit
panel SHALL open directly bound to it, with no picker shown. When narrowing still yields
multiple keys (or would yield none, which is treated as no narrowing), the edit panel
SHALL open with all remaining candidates pre-selected via checkboxes, letting the editor
uncheck any that should not change together. No `t()` call site SHALL be required to
carry key metadata for this to work.

#### Scenario: Unique text resolves to its key
- **WHEN** the editor Option-clicks a button whose label matches exactly one message value
- **THEN** the edit panel opens bound to that key, with no picker

#### Scenario: Context narrows a multi-key match to one
- **WHEN** the editor Option-clicks text inside an open dialog and only one of the matching keys' paths mentions "modal"
- **THEN** the edit panel opens directly bound to that one key, with no picker

#### Scenario: A genuine tie falls back to multi-select
- **WHEN** narrowing still leaves more than one candidate key
- **THEN** the edit panel lists all remaining candidates as checkboxes, all pre-checked, and the editor can uncheck any before editing

### Requirement: Edit both locales with live preview, across all selected keys
The edit panel SHALL show the checked key(s)' current `en` and `mr` values (seeded from
the first checked key), both editable. On save it SHALL persist the changed value(s) via
the content-overrides API for every checked key, and the page SHALL reflect the new text
without a full reload (the override merges into the rendered messages). The panel SHALL
indicate when a checked key is missing a translation in either locale, and SHALL warn when
checked keys currently disagree in a locale before a save would make them uniform.

#### Scenario: Editing Marathi copy
- **WHEN** the editor changes the `mr` value for a key and saves
- **THEN** the value is persisted via the API and the visible Marathi text updates in place

#### Scenario: Missing-locale indicator
- **WHEN** the selected key has an `en` value but no `mr` value
- **THEN** the panel flags the missing `mr` translation

#### Scenario: Batch edit applies to every checked key
- **WHEN** the editor has two keys checked and saves a new `en` value
- **THEN** both keys are staged with that value, each validated against its own current value's ICU placeholders

#### Scenario: Divergent values are flagged before overwrite
- **WHEN** two checked keys currently have different `mr` values
- **THEN** the panel shows a warning that saving will make them all match the new text

### Requirement: ICU placeholder and plural safety (client)
Before sending a save, the editor SHALL compare the placeholder / plural-`select` token set
of the edited value against the current value's token set and SHALL block the save with an
inline error when they differ. This SHALL be a client-side guard in addition to the
authoritative server-side check.

#### Scenario: Dropping a placeholder is blocked
- **WHEN** the current value is `"Hello {name}"` and the editor tries to save `"Hello there"`
- **THEN** the save is blocked with an error noting the missing `{name}` placeholder

### Requirement: Publish control surfaces the round-trip
The editor SHALL provide a Publish control that calls the content-overrides publish
endpoint and, on success, surfaces the resulting GitHub pull-request URL. The editor SHALL
NOT write directly to the message files or to `dev`/`main`.

#### Scenario: Publishing opens a PR
- **WHEN** the editor triggers Publish after staging several edits
- **THEN** a pull request updating `messages/en.json` and `messages/mr.json` is opened and its URL is shown

### Requirement: Editor chrome is localized
All of the editor's own UI strings (panel labels, buttons, validation messages) SHALL be
sourced from next-intl messages with `en` and `mr` translations — no hardcoded UI text,
consistent with the codebase rule.

#### Scenario: Marathi editor chrome
- **WHEN** an editor whose locale is `mr` opens the edit panel
- **THEN** the panel's own labels and buttons render from the `mr` catalog

