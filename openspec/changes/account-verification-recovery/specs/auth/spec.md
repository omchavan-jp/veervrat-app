## ADDED Requirements

### Requirement: A user who controls their mailbox can always reach a verified state

The system SHALL provide at least one route to a verified email address that does not depend on
the original verification message still being available.

Login refuses an address whose email is unverified. If the only route to verification is a single
message, an account whose message was lost, filtered, or never delivered becomes permanently
unusable with no recourse — which has already occurred in production use.

Any route that marks an address verified MUST rest on proof of control of that mailbox at least
as strong as clicking the original verification link.

#### Scenario: The verification email never arrived

- **GIVEN** a registered account whose email was never verified
- **WHEN** the user requests a new verification message and follows the link
- **THEN** the address is verified and the user can log in

#### Scenario: Completing a password reset verifies the address

- **GIVEN** a registered account whose email is unverified
- **WHEN** the user completes a password reset using a token delivered to that address
- **THEN** the address is marked verified, because receiving the token proves control of the
  mailbox
- **AND** the user can log in with the new password without any further step

#### Scenario: Linking a Google account verifies the address

- **GIVEN** an unverified credential account, and a Google sign-in for the same address that
  Google reports as verified
- **WHEN** the user completes linking by confirming their existing password
- **THEN** the address is marked verified

#### Scenario: Google has not verified the address

- **GIVEN** a Google identity whose `email_verified` claim is false or absent
- **WHEN** linking completes
- **THEN** the accounts are linked but the address is **not** marked verified, because the
  external assertion this relies on was not made

### Requirement: Verification resend does not disclose whether an account exists

`POST /auth/resend-verification` SHALL return an identical response for every input: unknown
address, already-verified address, address with no credential login, and genuinely unverified
address. It SHALL send a message only in the last case.

An endpoint that answers differently for a registered address answers the question "does this
person have an account here?" for any address. That disclosure is worse than the problem the
endpoint solves, and the platform's users include minors.

#### Scenario: Unknown address

- **WHEN** a resend is requested for an address with no account
- **THEN** the response is success, and no email is sent

#### Scenario: Already-verified address

- **WHEN** a resend is requested for an address that is already verified
- **THEN** the response is success, and no email is sent

#### Scenario: Google-only account

- **WHEN** a resend is requested for an address that can only sign in with Google
- **THEN** the response is success, and no email is sent

#### Scenario: Genuinely unverified account

- **WHEN** a resend is requested for an unverified credential account
- **THEN** the response is success, and a verification email is sent

### Requirement: Verification resend is rate limited and single-token

The endpoint SHALL be covered by the strict authentication throttle, and SHALL invalidate any
outstanding verification tokens for the account before issuing a new one.

The endpoint sends mail to an address supplied by the caller, so without limits it is a means of
delivering repeated mail to someone else's inbox. Invalidating prior tokens additionally means a
burst of requests cannot leave several usable links outstanding.

#### Scenario: Repeated requests are throttled

- **WHEN** resend is requested repeatedly from one source beyond the auth throttle limit
- **THEN** further requests are rejected by the throttle rather than sending mail

#### Scenario: Only the newest link works

- **GIVEN** a resend has been requested twice
- **WHEN** the link from the first message is used
- **THEN** it is rejected, and only the most recent link verifies the address

### Requirement: An unverified-login refusal explains itself and offers recovery

When login is refused because the address is unverified, the interface SHALL state that reason
and offer to send a new verification email, in the user's language.

A bare refusal is what converts a recoverable state into an abandoned account: the user cannot
discover that a remedy exists.

#### Scenario: Refusal offers the way out

- **WHEN** a user attempts to log in with correct credentials for an unverified address
- **THEN** the interface explains that the address must be verified and offers to resend
- **AND** the offer is available in both English and Marathi
