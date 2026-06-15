# experience-log-list Specification

## Purpose
TBD - created by archiving change experience-logging. Update Purpose after archive.
## Requirements
### Requirement: Personal experience list

The system SHALL provide a personal "My Experiences" list (reachable from sidebar/profile) showing the VA's own entries — drafts and published — in reverse-chronological order. Each item SHALL show an excerpt, date, a visibility badge, tag badges, and edit/delete actions. The list SHALL handle loading, empty (encouraging, not a dead end), error, and success states; localized; responsive.

#### Scenario: VA sees own drafts and published entries

- **WHEN** a VA opens "My Experiences"
- **THEN** their drafts and published entries appear with visibility and tag badges

#### Scenario: empty state

- **WHEN** a VA with no entries opens "My Experiences"
- **THEN** a localized empty state inviting them to write their first entry is shown

#### Scenario: VA deletes an entry from the list

- **WHEN** a VA clicks delete on an entry and confirms
- **THEN** the entry is soft-deleted and removed from the list on success

### Requirement: Public experience pool page

The system SHALL provide a guest-browseable public experience pool page sourced from the public pool endpoint, paginated, showing each entry's author (linking to their profile), date, body excerpt, and tags. The page SHALL handle loading, empty, error, and success states; localized; responsive.

#### Scenario: guest browses public experiences

- **WHEN** a guest opens the public experiences page
- **THEN** Public entries from all users are shown with author links and tags

#### Scenario: load more / pagination

- **WHEN** there are more entries than one page
- **THEN** the page loads additional entries via the cursor without a full reload

