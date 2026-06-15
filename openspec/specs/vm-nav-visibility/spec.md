# vm-nav-visibility Specification

## Purpose
TBD - created by archiving change actions-guidance. Update Purpose after archive.
## Requirements
### Requirement: Conditional VM navigation with independent badges

The app shell SHALL display the Vratmitra navigation items (My Vratarthis, VM Guidance) only to users who currently hold at least one active VM assignment (global or journey-level), and SHALL hide them entirely for users with no active VM assignment. Each navigation item SHALL show its own independent pending-count badge — the VA Guidance (`/actions`) badge reflects the VA pending count and the VM Guidance (`/vratmitra/guidance`) badge reflects the VM pending count — with no combined badge. Badge counts and nav visibility SHALL re-evaluate on VM-relationship and approval changes via TanStack Query invalidation, without a full page reload.

#### Scenario: user with a VM assignment sees VM nav items

- **WHEN** a user who holds an active VM assignment loads the app shell
- **THEN** the My Vratarthis and VM Guidance nav items are visible

#### Scenario: user without any VM assignment does not see VM nav items

- **WHEN** a user with no active VM assignment loads the app shell
- **THEN** the VM nav items are absent entirely

#### Scenario: nav badges are independent

- **WHEN** a user has pending VA actions and pending VM actions
- **THEN** the `/actions` nav badge shows the VA count and the `/vratmitra/guidance` nav badge shows the VM count, each independently

#### Scenario: visibility updates without reload after assignment change

- **WHEN** a user's VM assignment is added or removed and the relevant query is invalidated
- **THEN** the VM nav items appear or disappear without a full page reload

