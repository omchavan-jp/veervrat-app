## ADDED Requirements

### Requirement: A vratmitra can see the people they mentor

The system SHALL provide a vratmitra with a list of the vratarthis they are currently mentoring.

The vratmitra↔vratarthi relationship is the centre of the product, and it has been visible from
one side only: a vratarthi can see their vratmitras, and a vratmitra could see nobody.

#### Scenario: A vratmitra with vratarthis

- **GIVEN** a person who is the active vratmitra for one or more vratarthis
- **WHEN** they open their roster
- **THEN** each vratarthi is listed with their name and enough detail to recognise them
- **AND** each entry leads to that person's profile

#### Scenario: A vratmitra with nobody yet

- **GIVEN** a person who mentors nobody
- **WHEN** they open their roster
- **THEN** they are told plainly that they have no vratarthis yet
- **AND** it does not read as an error, because it is the ordinary starting condition

#### Scenario: A relationship that has ended

- **GIVEN** a relationship that has ended
- **WHEN** the former vratmitra opens their roster
- **THEN** that person is not listed

### Requirement: The roster SHALL NOT disclose journey content

The list SHALL show only what identifies a person and how long they have been here. It SHALL NOT
show their self-assessed weaknesses, their journeys' contents, or their reflections.

What a vratmitra may read about a vratarthi follows from the relationship. The roster is a list of
people, and a list is not consent.

#### Scenario: Looking at the roster

- **GIVEN** a vratmitra viewing their roster
- **WHEN** the list renders
- **THEN** no self-assessment, reflection or weakness appears in it

### Requirement: Vratmitra navigation appears only for a vratmitra

Navigation to vratmitra surfaces SHALL be shown only to someone who currently mentors, and SHALL
sit alongside that person's own vratarthi navigation rather than replacing it.

Most people here are both — a vratmitra is also walking their own vrat. A mode switch would tax
exactly those people on every visit, and an unconditional menu item would offer everyone else a
page that has nothing in it.

#### Scenario: Someone who is both a vratarthi and a vratmitra

- **GIVEN** a person with their own journeys who also mentors somebody
- **WHEN** they use the application
- **THEN** both their own navigation and the vratmitra navigation are available at once
- **AND** neither replaces nor hides the other

#### Scenario: Someone who mentors nobody

- **GIVEN** a person who is not a vratmitra to anyone
- **WHEN** they use the application
- **THEN** no vratmitra navigation is shown
