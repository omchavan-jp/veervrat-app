## ADDED Requirements

### Requirement: A copy of the database exists outside the Azure subscription

A dump of each environment's database MUST exist on storage that is not inside the Azure
subscription hosting that environment, and MUST be no older than the stated retention window.

Azure's managed Postgres backups do not satisfy this. They live in the same subscription and the
same region as the database they protect, so they survive deletion, corruption and operator error
but not the loss of the subscription itself.

A dump written to Azure Blob does not satisfy it either. Blob is staging; the requirement is met
only once a dump has been retrieved to storage outside Azure.

#### Scenario: The subscription becomes unavailable

- **WHEN** the Azure subscription is suspended, expires, or is otherwise lost
- **THEN** a dump no older than the retention window exists on storage unaffected by that loss
- **AND** the key needed to decrypt it is also available outside that subscription

#### Scenario: The job succeeds but nothing is retrieved

- **WHEN** the dump job has run successfully for several days
- **AND** no pull to off-Azure storage has succeeded in that time
- **THEN** the state is reported as unmet, not as healthy
- **AND** a successful job run alone MUST NOT be treated as evidence that this requirement holds

### Requirement: Dumps are encrypted before leaving the platform

A dump MUST be encrypted before it leaves the process that created it. The decryption key MUST be
stored in at least one location outside the Azure subscription, in addition to Key Vault.

A key held only in Key Vault fails in precisely the scenario the dumps exist for: if the
subscription is what was lost, every surviving dump is ciphertext nobody can open.

#### Scenario: Restoring after losing the subscription

- **WHEN** a restore is attempted using only artifacts that survive losing the subscription
- **THEN** the pulled dump and the off-Azure key copy are sufficient to complete it
- **AND** the procedure does not depend on Key Vault, the Azure CLI, or any Azure credential

### Requirement: Dumps have a stated retention and are deleted past it

Dumps MUST be deleted once older than a stated retention window, in every location holding them.
The window MUST be recorded in `ops/data-map.md`.

A dump is a complete copy of the personal data the platform holds. An unbounded accumulation of
them is a growing liability, and the privacy policy has to be able to state how long they are
kept.

#### Scenario: A dump passes the retention window

- **WHEN** a dump becomes older than the stated window
- **THEN** it is deleted from Blob and from off-Azure storage
- **AND** the deletion happens as part of the scheduled work, not as a manual chore

### Requirement: The restore procedure has been performed, not just written

The procedure for restoring from a logical dump MUST have been carried out against a real dump
before this capability is considered delivered, and the written procedure MUST describe what was
actually done.

Restoring from a logical dump is a different operation from point-in-time restore and inherits
none of its assurance. An export nobody has restored from is a file, not a backup.

#### Scenario: Rehearsal

- **WHEN** the restore procedure is rehearsed
- **THEN** a real dump is restored into a scratch database and the restored rows are inspected
- **AND** the outcome is recorded, including anything the procedure did not cover
