# cms-pages Specification

## Purpose
TBD - created by archiving change admin-content-management. Update Purpose after archive.
## Requirements
### Requirement: Admin-managed CMS pages
The system SHALL store editable bilingual content keyed by a stable string `key`, with a
title and a Tiptap rich-text body per language. Admins SHALL be able to create, update, and
delete CMS pages; each write SHALL be audit-logged and the body SHALL be sanitized.

#### Scenario: Admin upserts a CMS page
- **WHEN** an admin POSTs or PATCHes `/api/v1/admin/cms-pages` with `{ key, titleEn, bodyEn, ... }`
- **THEN** the page is persisted with a sanitized Tiptap body and `admin.upsert_cms_page` is audited

#### Scenario: Invalid Tiptap body rejected
- **WHEN** an admin submits a body that fails Tiptap sanitization
- **THEN** the system returns 400 and the page is not saved

#### Scenario: Non-admin denied
- **WHEN** a non-admin calls any `/api/v1/admin/cms-pages` write
- **THEN** the system returns 403

### Requirement: Public CMS page read
The system SHALL expose CMS page content by key to all visitors (guest-accessible) for
rendering explanatory copy in the UI.

#### Scenario: Guest reads a CMS page
- **WHEN** any visitor GETs `/api/v1/cms-pages/:key` for an existing key
- **THEN** the system returns the page's bilingual title and body

#### Scenario: Unknown key returns 404
- **WHEN** a visitor GETs `/api/v1/cms-pages/:key` for a key that does not exist
- **THEN** the system returns 404 so the client can fall back to default copy

