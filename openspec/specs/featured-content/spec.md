# featured-content Specification

## Purpose
TBD - created by archiving change admin-content-management. Update Purpose after archive.
## Requirements
### Requirement: Featured content curation
The system SHALL allow admins and moderators to mark blogs and experience logs as featured,
and SHALL surface the featured flag on the corresponding public read endpoints so the UI can
present featured rails/carousels. Toggling featured SHALL be audit-logged.

#### Scenario: Moderator features a blog
- **WHEN** a moderator PATCHes `/api/v1/moderation/blogs/:id/featured` with `{ featured: true }`
- **THEN** the blog's featured flag is set and `moderator.feature_blog` is audited

#### Scenario: Vratarthi denied
- **WHEN** a vratarthi calls a featured-toggle endpoint
- **THEN** the system returns 403

#### Scenario: Featured filter on public list
- **WHEN** any visitor GETs the public blogs list with `?featured=true`
- **THEN** only featured, published blogs are returned

#### Scenario: Featured flag surfaced
- **WHEN** any visitor reads the public blogs or experiences list
- **THEN** each item includes its `featured` boolean

