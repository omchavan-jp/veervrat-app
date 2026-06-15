# follow-ui Specification

## Purpose
TBD - created by archiving change public-profile. Update Purpose after archive.
## Requirements
### Requirement: Follow controls and social data on the public profile

The public profile page (`/u/:username`) SHALL show a Follow/Unfollow button for authenticated viewers (hidden or prompting login for guests; never shown on one's own profile), follower and following counts, the VM credibility stat when present, and the user's public experience entries. The follow button SHALL reflect current state and update optimistically on click, reconciling with the server result. All strings localized; the page responsive across mobile/tablet/desktop.

#### Scenario: authenticated viewer follows from the profile

- **WHEN** an authenticated viewer clicks Follow on another user's profile
- **THEN** the button switches to Following and the follower count increments, persisting on reload

#### Scenario: viewer unfollows

- **WHEN** a viewer who follows the user clicks Following/Unfollow
- **THEN** the relationship is removed and the button reverts

#### Scenario: own profile shows no follow button

- **WHEN** a user views their own public profile
- **THEN** no Follow button is shown

#### Scenario: guest is prompted to authenticate

- **WHEN** a guest attempts to follow
- **THEN** they are prompted to log in rather than silently failing

#### Scenario: credibility and public experiences render

- **WHEN** a profile has a credibility stat and public experience entries
- **THEN** both are displayed on the profile page

### Requirement: Follow counts on own profile

The own-profile page SHALL display the user's follower and following counts.

#### Scenario: own profile shows counts

- **WHEN** a user opens their own profile
- **THEN** their follower and following counts are shown

