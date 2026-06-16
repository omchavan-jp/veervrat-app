# blog-ui Specification

## Purpose
TBD - created by archiving change blogs. Update Purpose after archive.
## Requirements
### Requirement: Blog list and detail pages (guest-accessible)

The system SHALL provide a guest-accessible blog list page (paginated, each item: title, author → profile, date, excerpt) and a blog detail page (full rich-text body, author info, date, flat comments). The detail page SHALL let authenticated users add a comment and SHALL show a soft auth-prompt to guests instead. Comment authors, the blog author, and moderators SHALL see hide/delete controls per their permission; every comment SHALL have a report control for authenticated users. All pages handle loading/empty/error/success, are localized, and are responsive.

#### Scenario: guest browses and reads

- **WHEN** a guest opens the blog list and clicks a blog
- **THEN** the list (paginated) and the blog detail with comments render

#### Scenario: guest is prompted to authenticate to comment

- **WHEN** a guest attempts to comment
- **THEN** a soft auth-prompt is shown rather than a comment box

#### Scenario: permission-scoped comment controls

- **WHEN** a blog author or moderator views comments
- **THEN** hide/delete controls appear on the comments they may act on

### Requirement: Blog editor

The system SHALL provide a Tiptap blog editor (required title, rich-text body, image upload) reachable via "Write a blog" and edit-own, with Save-as-draft and Publish. It handles the four states, is localized, and responsive.

#### Scenario: author writes and publishes

- **WHEN** an author writes a title + body and publishes
- **THEN** the blog is published and appears in the list

#### Scenario: author saves a draft

- **WHEN** an author saves a draft
- **THEN** it is retained privately and editable later

#### Scenario: image upload embeds in the body

- **WHEN** the author adds an image
- **THEN** it is uploaded and embedded in the saved body

