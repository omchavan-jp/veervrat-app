# virtues-browser-ui Specification

## Purpose
TBD - created by archiving change virtues-browser. Update Purpose after archive.
## Requirements
### Requirement: Virtues & Weaknesses browser

The system SHALL provide a guest-accessible browser page with two sections — Virtues (primary) and Weaknesses (secondary). Each virtue shows name (Devanagari-primary + English), description excerpt, and subvirtue count; each weakness shows name, description excerpt, and links to its detail. The page is reachable from a "Virtues & Weaknesses" navigation entry, is localized, responsive, and handles loading/empty/error/success.

#### Scenario: guest browses virtues and weaknesses

- **WHEN** a guest opens the Virtues & Weaknesses browser
- **THEN** both sections render with virtues (primary) and weaknesses (secondary)

#### Scenario: navigation entry present

- **WHEN** an authenticated user views the app navigation
- **THEN** a "Virtues & Weaknesses" entry links to the browser

### Requirement: Virtue, subvirtue, and sentence detail pages

Clicking a virtue SHALL open a virtue detail (description + clickable subvirtues). Clicking a subvirtue SHALL open a subvirtue detail (description, parent virtue, tackled weaknesses as clickable links, sentences list). Clicking a sentence SHALL open a sentence-info page showing text (EN + MR), subvirtue + virtue, and — for an authenticated VA — an active-journey indicator. All pages are guest-accessible, bilingual (Devanagari-primary), and responsive.

#### Scenario: drill from virtue to subvirtue to sentence

- **WHEN** a user clicks a virtue, then a subvirtue, then a sentence
- **THEN** each detail page renders with its bilingual content and links

#### Scenario: sentence info exposes no journey-start

- **WHEN** any user views a sentence-info page
- **THEN** no "Start journey" action is present; CTAs route through the test flow

#### Scenario: guest CTA shows soft auth prompt

- **WHEN** a guest activates a "Take a test" / "Choose a weakness" CTA on a sentence
- **THEN** a soft auth-prompt is shown rather than proceeding or failing silently

### Requirement: Guest-accessible weakness detail

The browser SHALL link weaknesses to a guest-accessible weakness detail showing name (Devanagari-primary + English), description, and the subvirtues that help tackle it (clickable). For an authenticated VA, the test entry/history affordances remain available via the study flow.

#### Scenario: guest reads a weakness detail

- **WHEN** a guest opens a weakness detail from the browser
- **THEN** the description and linked subvirtues render, with no authenticated-only test actions

