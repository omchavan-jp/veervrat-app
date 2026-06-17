## ADDED Requirements

### Requirement: Pothi page

The system SHALL provide a guest-accessible Pothi page rendering the sections in order (intro/commentary, shlokas with source citations, congregation response, post-shloka commentary, resource links), Devanagari-primary, with a "What is the Pothi?" modal and links to the Shlokas and Resources pages. It handles loading/empty/error/success, is localized, responsive.

#### Scenario: guest reads the Pothi page

- **WHEN** a guest opens the Pothi page
- **THEN** the sections render in order with their shlokas and commentary

#### Scenario: empty state

- **WHEN** no Pothi sections exist
- **THEN** a localized empty state is shown (not a broken page)

### Requirement: Shlokas library page

The system SHALL provide a guest-accessible Shlokas library page: a searchable grid/list with a source filter, each card showing reference + Devanagari + a theme label, opening a Shloka Detail modal (Devanagari + transliteration + meaning EN/MR + source + formal tag chips + loose labels + linked resources). A "Why we study shlokas" modal is accessible. Four states, localized, responsive.

#### Scenario: guest searches and opens a shloka

- **WHEN** a guest searches and clicks a shloka card
- **THEN** the detail modal opens with the shloka's full content and tags

### Requirement: Resources page

The system SHALL provide a guest-accessible Resources page: a filterable list (by type), each entry showing thumbnail, title, one-liner, type badge, and tags; a detail view shows the full rich-text description and tags. Four states, localized, responsive.

#### Scenario: guest browses resources

- **WHEN** a guest opens the Resources page
- **THEN** resources render with their type badges and tags, filterable by type
