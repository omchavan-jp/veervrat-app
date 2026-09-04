## ADDED Requirements

### Requirement: An experience log can be read by anyone permitted to read it

The system SHALL provide a view for a single experience log, available to every viewer the API
permits — including a guest, where the log is published and public.

An experience log is a personal reflection, and the record a vratmitra's guidance is built on
(`spec/06`). A system that can capture one and never show it back has not stored it for anybody.

`ExperienceVisibility` distinguishes `ONLY_ME`, `FRIENDS` and `PUBLIC`, and the API enforces all
three. Without a view, that distinction cannot be observed by the person who chose it.

#### Scenario: An author opens their own log

- **GIVEN** an experience log
- **WHEN** its author opens it
- **THEN** the log's content is shown
- **AND** the author can see which visibility it currently has
- **AND** the author can reach the editor from there

#### Scenario: A guest opens a published public log

- **GIVEN** a published experience log whose visibility is `PUBLIC`
- **WHEN** a viewer with no session opens it
- **THEN** the log's content is shown, including any images it contains

### Requirement: A refusal SHALL be indistinguishable from a missing log

Where a viewer may not read a log, the system SHALL respond exactly as it does for a log that
does not exist.

Distinguishing the two confirms that a particular log exists and belongs to somebody, which is
what an unauthorised viewer would be probing for. This mirrors the API, which already refuses in
this shape.

#### Scenario: Someone else's private log

- **GIVEN** an experience log whose visibility is `ONLY_ME`
- **WHEN** a viewer who is not its author opens it
- **THEN** the response is identical to opening a log that does not exist
- **AND** nothing shown distinguishes "not allowed" from "not found"

### Requirement: Lists SHALL lead to the view

Every place the system lists experience logs SHALL link to the log itself.

The public pool currently links only to each author's profile, because there was nowhere else to
point. A list that names something the reader cannot open is the defect being fixed.

#### Scenario: Opening a log from the public pool

- **GIVEN** the public pool showing published logs
- **WHEN** a reader selects one
- **THEN** that log opens
