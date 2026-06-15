## ADDED Requirements

### Requirement: Experience log editor

The system SHALL provide a Tiptap-based experience-log editor reachable from the dashboard "Log your experience" CTA, a sidebar entry, and the journey Status Overview ("Log experience", pre-tagged to that journey). The editor SHALL support rich text (bold, italic, headings, links, lists), inline image upload (via the experience upload endpoint), an entity tag selector (weakness/virtue/subvirtue/sentence/exposure/resolution/challenge/journey — optional, multiple), a "Save as draft" action, and a visibility selector (Only me / Friends / Public) applied on publish. The editor SHALL handle loading, empty, error, and success states; all strings localized via next-intl; and render correctly at mobile, tablet, and desktop widths.

#### Scenario: VA writes and saves a draft

- **WHEN** a VA writes content and clicks "Save as draft"
- **THEN** the entry is created as a draft (Only me) and the VA can return to it later

#### Scenario: VA publishes with a visibility tier

- **WHEN** a VA publishes a draft and selects Public
- **THEN** the entry becomes published and Public

#### Scenario: journey-scoped editor is pre-tagged

- **WHEN** a VA opens the editor from a journey's Status Overview
- **THEN** the entry is pre-associated with that journey

#### Scenario: image upload embeds in the body

- **WHEN** a VA adds an image in the editor
- **THEN** the image is uploaded and embedded inline in the saved Tiptap body

#### Scenario: dashboard CTA is enabled and navigates to the editor

- **WHEN** a VA clicks "Log your experience" on the dashboard
- **THEN** the experience-log editor opens
