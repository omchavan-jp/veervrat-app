## ADDED Requirements

### Requirement: An invited person can see their invitations inside the product

The system SHALL show a person the invitations addressed to them, and SHALL let them accept or
decline each one without leaving that view.

Reported 2026-07-18: the invited vratmitra never sees the pending request on their side, so they
cannot accept. Every vratmitra relationship begins with this round trip, and it currently
completes only if the invitee finds and clicks an email.

#### Scenario: Someone has been invited

- **GIVEN** a person with a pending invitation addressed to them
- **WHEN** they open their invitations
- **THEN** the invitation is listed
- **AND** it says who sent it and what kind of relationship it proposes
- **AND** they can accept or decline it from there

#### Scenario: Someone who has both sent and received

- **GIVEN** a person who has sent an invitation and also received one
- **WHEN** they open their invitations
- **THEN** both are visible, and it is clear which is which

#### Scenario: Nothing pending

- **GIVEN** a person with no invitations addressed to them
- **WHEN** they open their invitations
- **THEN** they are told plainly that there are none
- **AND** it does not read as an error

#### Scenario: An invitation already dealt with

- **GIVEN** an invitation the person has already accepted or declined
- **WHEN** they open their invitations
- **THEN** it is not listed as pending

### Requirement: A notification about an invitation SHALL lead somewhere it can be acted on

The system SHALL send a person who follows an invitation notification to a view that shows that
invitation.

The link has been corrected twice and been wrong both times — first `/dashboard`, then the
sender's own page — because there was no destination that could show a received invitation.

#### Scenario: Following the notification

- **GIVEN** a person who has been notified of an invitation
- **WHEN** they follow the notification
- **THEN** they arrive somewhere the invitation is visible and actionable

### Requirement: An invitation SHALL say who sent it before it is accepted

The system SHALL show the inviter's identity on the page where an invitation is accepted, without
requiring the reader to already have an account.

Accepting makes someone a vratmitra: they gain read access to the vratarthi's journeys,
weaknesses, experience logs and check-ins. That is a consent decision, and it cannot be made by
someone who does not know who is asking.

#### Scenario: Opening an invitation link

- **GIVEN** a person who follows the link in an invitation
- **WHEN** the page opens
- **THEN** it names who invited them, and leads to that person's profile
- **AND** it says what kind of relationship is being proposed
- **AND** it does so whether or not they already have an account

#### Scenario: An invitation that can no longer be accepted

- **GIVEN** an invitation that has expired or has already been used
- **WHEN** the invited person opens it
- **THEN** they are told so before being offered a choice
- **AND** they are not left to discover it by pressing accept

#### Scenario: A token that was guessed

- **GIVEN** a token that does not correspond to any invitation
- **WHEN** it is used to read an invitation
- **THEN** the response is indistinguishable from one for an expired invitation
- **AND** nothing in it confirms whether the token was ever real
