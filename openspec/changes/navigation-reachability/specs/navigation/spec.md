## ADDED Requirements

### Requirement: Every page is reachable without knowing its address

The system SHALL make each page reachable from the navigation or from a link on another page,
except where arriving by an emailed link is the page's purpose.

A page that exists, works, and is linked from nowhere is indistinguishable from one that was never
built — and it fails silently, because nothing reports a page nobody visited.

#### Scenario: The public experience pool

- **GIVEN** a signed-in person who has never seen the pool
- **WHEN** they look at the navigation
- **THEN** they can reach it without typing a URL

#### Scenario: A page reached only by an emailed link

- **GIVEN** a page such as email verification, which carries a token
- **WHEN** the reachability check runs
- **THEN** it passes by being on a named exception list, with its reason recorded

### Requirement: The way back is the same everywhere

Where a page sits in a hierarchy, the system SHALL show that ancestry in one consistent form, and
each ancestor SHALL be a link.

Four hand-built back links across four pages used two different icons and two kinds of destination.
A person cannot learn a rule that is only sometimes true.

#### Scenario: Reading a sentence

- **GIVEN** a person on a sentence page
- **WHEN** they look at the top of it
- **THEN** they see its subvirtue and its virtue, both as links
- **AND** reaching the virtue takes one click rather than two

#### Scenario: A page with no single parent

- **GIVEN** a weakness, which belongs to several subvirtues
- **WHEN** the page renders
- **THEN** no ancestry is claimed
- **AND** a way back to the browser is still offered, in the same form as elsewhere
