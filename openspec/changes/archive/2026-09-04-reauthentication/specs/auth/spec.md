## ADDED Requirements

### Requirement: Self-service actions SHALL NOT depend on how a person signs in

Every action a person can take on their own account SHALL be available regardless of which
sign-in method the account uses.

Sensitive actions are gated on proof of identity, and today that proof is always a password. An
account created through Google has none, so it cannot change its email, set a password, or
**delete itself** — and deletion is a right, not a convenience.

The system SHALL accept, as that proof, any sign-in method the account actually has.

#### Scenario: Deleting a Google-only account

- **GIVEN** an account that signs in only with Google
- **WHEN** the person asks to delete it and proves their identity with Google
- **THEN** the account is deleted, exactly as it would be for an account with a password

#### Scenario: Changing the email on a Google-only account

- **GIVEN** an account that signs in only with Google
- **WHEN** the person changes their email address and proves their identity with Google
- **THEN** the change proceeds as it would for an account with a password

#### Scenario: Proof is present-tense

- **GIVEN** a sensitive action requiring re-authentication
- **WHEN** the proof offered was issued earlier and merely replayed
- **THEN** it is refused
- **AND** the person is asked to prove their identity now

### Requirement: An account SHALL always be able to reach a second way in

A person whose account has one sign-in method SHALL be told so, and SHALL be able to add another.

An account with a single method is one lost credential away from being unrecoverable, and there
is no administrative route to restore access. The person cannot weigh that risk without being
told it exists.

#### Scenario: An account with only Google

- **GIVEN** an account whose only sign-in method is Google
- **WHEN** the person opens their account settings
- **THEN** they are told that Google is currently the only way into the account
- **AND** they can begin adding a password

#### Scenario: Adding a password is authorised by the mailbox

- **GIVEN** a person adding a password to an account that has none
- **WHEN** they begin from a signed-in session
- **THEN** a link is sent to the account's email address
- **AND** the password is set only by following that link, because a credential that outlives the
  session must not be created by the session alone

#### Scenario: Removing the last way in

- **GIVEN** an account whose only sign-in method is Google
- **WHEN** the person tries to disconnect that Google account
- **THEN** it is refused, because it would leave no way to sign in

### Requirement: A person asking to reset a password SHALL be told what is true

The system SHALL distinguish, in its response, between an address with no account, an account
that has a password, and an account that signs in another way.

Answering identically in all three cases is intended to conceal whether an address is registered.
It does not: account creation already refuses a duplicate address and says so. The concealment is
therefore ineffective, while a person who mistypes their address waits for a message that will
never arrive, unable to tell a typo from a delivery failure.

Rate limiting, not ambiguity, is what prevents an address list being checked in bulk.

#### Scenario: An address with no account

- **GIVEN** an address that has no account
- **WHEN** a password reset is requested for it
- **THEN** the person is told no account exists for that address

#### Scenario: An account that signs in with Google

- **GIVEN** an account with no password
- **WHEN** a password reset is requested for it
- **THEN** the person is told the account signs in with Google
- **AND** is offered the means to add a password
