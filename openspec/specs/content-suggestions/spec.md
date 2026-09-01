## ADDED Requirements

### Requirement: A content author can propose content anywhere in the product

The system SHALL allow a person holding the content-suggestion capability to place a suggestion on
any page, anchored to a part of that page, describing content that should exist there.

The people who know the material best cannot open a pull request. Every route from their attention
to the repository that passes through someone else's memory loses most of what was said.

#### Scenario: Proposing a section that does not exist

- **GIVEN** an author viewing a page for a particular weakness
- **WHEN** they enter suggestion mode and click the place a description belongs
- **THEN** they can write the content they propose, in English or Marathi
- **AND** the suggestion records which page, which weakness, and where on the page it was made
- **AND** none of that location detail has to be typed

#### Scenario: Proposing a change to text that is already there

- **GIVEN** an author who clicks existing text
- **WHEN** they choose to change its wording
- **THEN** the existing text is carried into the suggestion as it stands
- **AND** the suggestion records both what is there now and what is proposed

#### Scenario: A page with no dynamic entity

- **GIVEN** a page that is not about a particular record
- **WHEN** an author places a suggestion on it
- **THEN** the suggestion is still recorded, against the route
- **AND** the absence of an entity does not prevent it

### Requirement: A suggestion SHALL remain actionable after the page changes

The system SHALL record several independent signals of a suggestion's location, so that a later
reader can find the place it refers to even after the page has been restructured.

A location recorded only as a position in the document is worthless after the next redeploy, and a
suggestion nobody can place is a suggestion nobody can act on.

#### Scenario: The page has been restructured

- **GIVEN** a suggestion whose recorded document position no longer matches anything
- **WHEN** a reader opens it
- **THEN** it still identifies the route and the entity it was made against
- **AND** it still carries the visible text of the element it was placed on

### Requirement: Only a capability holder may create a suggestion, and the API SHALL enforce it

The system SHALL refuse to create a suggestion for a caller who does not hold the capability,
independently of whether the interface offered them the option.

Both existing capability-gated features in this product were gated only in the browser: the
feedback widget's environment flag reached the web tier while the API admitted any authenticated
user, and the content editor's flag was set in no environment at all. A control that only hides a
button is not a control.

#### Scenario: A caller without the capability

- **GIVEN** an authenticated person who has not been granted the capability
- **WHEN** they call the API directly to create a suggestion
- **THEN** the request is refused

#### Scenario: The capability is revoked

- **GIVEN** an author whose capability has been withdrawn
- **WHEN** they attempt to create a suggestion
- **THEN** the request is refused
- **AND** the suggestions they already made are unaffected

### Requirement: An administrator can see and triage every suggestion

The system SHALL make all suggestions visible to administrators in one place, and SHALL record the
outcome of each as a decision rather than only a status.

Gathering that ends in a list nobody converts into anything is worse than not gathering: it spends
the author's attention and returns nothing.

#### Scenario: Reviewing what has been suggested

- **GIVEN** suggestions made by several authors across the product
- **WHEN** an administrator opens the triage view
- **THEN** all of them are listed, whoever made them
- **AND** each shows where it was made and what is proposed

#### Scenario: Accepting a suggestion

- **GIVEN** a suggestion an administrator accepts
- **WHEN** they record the outcome
- **THEN** the suggestion records what it became — content in the product, or work to be done
- **AND** an accepted suggestion is distinguishable from one that has actually shipped

#### Scenario: Declining a suggestion

- **GIVEN** a suggestion an administrator declines
- **WHEN** they record the outcome
- **THEN** a reason is recorded
- **AND** the author can read it

### Requirement: An author can see their own suggestions

The system SHALL show an author the suggestions they have made, both in a list and marked on the
page where each was placed.

Someone who cannot see that their last suggestion registered will not make a twentieth.

#### Scenario: Returning to a page already annotated

- **GIVEN** an author who has placed suggestions on a page
- **WHEN** they open that page again
- **THEN** their own suggestions are marked where they were placed

#### Scenario: Another author's page

- **GIVEN** suggestions made by a different author
- **WHEN** an author views that page
- **THEN** they do not see the other author's suggestions
- **AND** an administrator still sees all of them
