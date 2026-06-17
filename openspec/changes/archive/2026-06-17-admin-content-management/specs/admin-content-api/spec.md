## ADDED Requirements

### Requirement: Admin taxonomy CRUD
The system SHALL provide admin-only endpoints to create, update, and delete virtues,
subvirtues, and weaknesses, and to link/unlink weaknesses to subvirtues with a priority.
Every write SHALL be audit-logged. Deletes SHALL be blocked when the entity is referenced.

#### Scenario: Admin creates a virtue
- **WHEN** an admin POSTs `/api/v1/admin/virtues` with `{ nameEn, nameMr?, description? }`
- **THEN** the virtue is created and an audit event `admin.create_virtue` is recorded

#### Scenario: Non-admin denied
- **WHEN** a moderator or vratarthi calls any `/api/v1/admin/virtues|subvirtues|weaknesses` write
- **THEN** the system returns 403 and no change is made

#### Scenario: Delete blocked when referenced
- **WHEN** an admin DELETEs a subvirtue that has sentences or weakness links
- **THEN** the system returns a domain error (409) and the subvirtue is not deleted

#### Scenario: Link weakness to subvirtue with priority
- **WHEN** an admin POSTs `/api/v1/admin/weakness-subvirtues` with `{ weaknessId, subvirtueId, priority }`
- **THEN** the link is created (or its priority updated) and `admin.link_weakness_subvirtue` is audited

### Requirement: Admin shloka management
The system SHALL provide admin-only endpoints to create, update, and delete shlokas including
formal entity tags and loose theme tags. Each create/update/delete SHALL keep the shlokas
search index current via the content index-sync seam. Every write SHALL be audit-logged.

#### Scenario: Admin creates a shloka and it becomes searchable
- **WHEN** an admin POSTs `/api/v1/admin/shlokas` with valid fields
- **THEN** the shloka is created, `syncShlokaToIndex` is invoked, and `admin.create_shloka` is audited

#### Scenario: Admin deletes a shloka and it leaves the index
- **WHEN** an admin DELETEs `/api/v1/admin/shlokas/:id`
- **THEN** the shloka is removed, `removeShlokaFromIndex` is invoked, and `admin.delete_shloka` is audited

#### Scenario: Non-admin denied shloka write
- **WHEN** a non-admin calls any `/api/v1/admin/shlokas` write
- **THEN** the system returns 403

### Requirement: Shloka scheduling and queue
The system SHALL allow admins to assign a shloka to a specific date (one shloka per date) and
to manage an ordered fallback queue used for auto-advance when no date is scheduled.

#### Scenario: Schedule a shloka for a date
- **WHEN** an admin PATCHes `/api/v1/admin/shlokas/schedule` with `{ date, shlokaId }`
- **THEN** the schedule entry is upserted for that date and `admin.schedule_shloka` is audited

#### Scenario: Reorder the queue
- **WHEN** an admin PATCHes `/api/v1/admin/shlokas/queue` with an ordered `shlokaIds` array
- **THEN** the queue is replaced so positions match the array order, transactionally, and `admin.reorder_shloka_queue` is audited

### Requirement: Admin Pothi section management
The system SHALL provide admin-only CRUD for Pothi sections, including ordered shloka
assignments, intro text, congregation response, and post-shloka commentary.

#### Scenario: Create a Pothi section with ordered shlokas
- **WHEN** an admin POSTs `/api/v1/admin/pothi/sections` with section fields and `shlokaIds[]`
- **THEN** the section and its ordered join rows are created and `admin.create_pothi_section` is audited

#### Scenario: Non-admin denied
- **WHEN** a non-admin calls any `/api/v1/admin/pothi/sections` write
- **THEN** the system returns 403

### Requirement: Admin resource management
The system SHALL provide admin-only CRUD for resources (file or link), including title,
one-liner, rich-text description, thumbnail URL, and formal + loose tags.

#### Scenario: Create a resource
- **WHEN** an admin POSTs `/api/v1/admin/resources` with valid fields
- **THEN** the resource is created and `admin.create_resource` is audited

#### Scenario: Non-admin denied
- **WHEN** a non-admin calls any `/api/v1/admin/resources` write
- **THEN** the system returns 403
