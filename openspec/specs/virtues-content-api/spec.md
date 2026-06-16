# virtues-content-api Specification

## Purpose
TBD - created by archiving change virtues-browser. Update Purpose after archive.
## Requirements
### Requirement: Virtues list and detail

`GET /api/v1/virtues` SHALL return all virtues (name EN + MR, description, subvirtue count), guest-accessible. `GET /api/v1/virtues/:id` SHALL return a virtue with its subvirtues (each: name EN + MR, description), guest-accessible.

#### Scenario: guest lists virtues

- **WHEN** a guest calls `GET /api/v1/virtues`
- **THEN** all virtues are returned with their subvirtue counts

#### Scenario: guest reads a virtue detail

- **WHEN** a guest calls `GET /api/v1/virtues/:id`
- **THEN** the virtue and its subvirtues are returned

#### Scenario: NEGATIVE — unknown virtue id

- **WHEN** `GET /api/v1/virtues/:id` is called with an id that does not exist
- **THEN** the response is 404

### Requirement: Subvirtue detail

`GET /api/v1/subvirtues/:id` SHALL return a subvirtue (name EN + MR, description), its parent virtue, the weaknesses it helps tackle (each clickable to weakness detail), and its sentences. Guest-accessible.

#### Scenario: guest reads a subvirtue detail

- **WHEN** a guest calls `GET /api/v1/subvirtues/:id`
- **THEN** the subvirtue, its parent virtue, the tackled weaknesses, and its sentences are returned

#### Scenario: NEGATIVE — unknown subvirtue id

- **WHEN** the id does not exist
- **THEN** the response is 404

### Requirement: Sentence info

`GET /api/v1/sentences/:id` SHALL return a sentence (text EN + MR) with its subvirtue and virtue, guest-accessible. When the requester is an authenticated VA, the response SHALL include whether they have an active journey for this sentence. It SHALL NOT expose any journey-creation action.

#### Scenario: guest reads sentence info

- **WHEN** a guest calls `GET /api/v1/sentences/:id`
- **THEN** the sentence text, subvirtue, and virtue are returned, without an active-journey indicator

#### Scenario: authenticated VA sees active-journey indicator

- **WHEN** an authenticated VA with an active journey for the sentence calls `GET /api/v1/sentences/:id`
- **THEN** the response indicates an active journey exists for that sentence

#### Scenario: NEGATIVE — unknown sentence id

- **WHEN** the id does not exist
- **THEN** the response is 404

