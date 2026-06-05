## ADDED Requirements

### Requirement: Exposures tab — pool + active items
The Exposures tab SHALL show a collapsible pool section at the top and active items below.

#### Scenario: Pool section shows filtered items with Select button
- **WHEN** the VA opens the Exposures tab
- **THEN** a collapsible "Available pool" section SHALL show at the top
- **THEN** each pool item SHALL display: title, description, tier badge, weakness tags, [Select] button
- **THEN** clicking [Select] SHALL add the item to the journey and move it to the active section

#### Scenario: Active items grouped by status
- **WHEN** the journey has selected exposures
- **THEN** items SHALL be displayed with: title, tier badge, status badge (Not started / In progress / Submitted / Approved), action button(s)
- **THEN** NOT_STARTED items show [Start] button
- **THEN** IN_PROGRESS items show [Submit for closure] button
- **THEN** SUBMITTED items show [Self-approve] button (only when no VM assigned)
- **THEN** APPROVED items show no action button (read-only)
- **THEN** all non-APPROVED items show [Deactivate] button; deactivated items show [Reactivate] and [Remove]

#### Scenario: Empty state
- **WHEN** no pool items match the journey's weaknesses
- **THEN** the pool section SHALL show "No exposures available for your weakness context."
- **WHEN** no exposures have been selected yet
- **THEN** the active section SHALL show the empty state from spec

### Requirement: Resolutions tab
Same as Exposures tab. Additional: frequency label shown on resolution cards. Check-in button present but check-in logging deferred to item 13.

#### Scenario: Resolution card shows frequency label
- **WHEN** a resolution has frequencyLabel set
- **THEN** the card SHALL display the frequency label (e.g. "Every evening")

### Requirement: Challenges tab
Same pattern as Exposures. Duration in days shown on cards. Suggestion threshold indicator shown (informational, not blocking).

#### Scenario: Challenge card shows duration
- **WHEN** a challenge has durationDays set
- **THEN** the card SHALL display the duration (e.g. "14 days")
