## ADDED Requirements

### Requirement: Re-authenticating returns a person to what they were doing

When a person proves themselves with a Google round trip in order to complete an action, the system
SHALL return them to that action, with what they had entered still present, and SHALL tell them the
outcome of the verification.

Re-authentication is a full-page redirect, so anything the page held is lost unless it is
deliberately carried. The proof itself is unaffected: what it establishes, how long it lasts, and
that it is single-use are unchanged.

#### Scenario: Deleting an account, verified with Google

- **GIVEN** a person with no password who has opened *Delete account*
- **WHEN** they verify with Google and return
- **THEN** the delete-account flow is open again
- **AND** it states that they are verified and may confirm

#### Scenario: Changing an email address, verified with Google

- **GIVEN** a person with no password who has typed a new address and not yet submitted it
- **WHEN** they verify with Google and return
- **THEN** the address they typed is still in the field
- **AND** they can complete the change without entering it again

#### Scenario: Verified as a different Google account

- **GIVEN** a person who signs in during the round trip as a Google account that is not theirs
- **WHEN** they return
- **THEN** they are returned to the flow they were in
- **AND** they are told the verification was for a different account and authorises nothing

#### Scenario: The draft cannot be recovered

- **GIVEN** a browser that blocks or has cleared session storage
- **WHEN** the person returns from a verification
- **THEN** the flow they were in still opens
- **AND** the form renders with an empty field rather than failing

### Requirement: What was typed is not carried through the redirect

The system SHALL NOT place a person's entered data in the OAuth `state`, the redirect URL, or any
other value that leaves the browser.

An address someone is moving to is personal data. A value carried through the round trip is visible
to the identity provider, recorded in the redirect URL, and retained in server access logs and
browser history — which is why the same rule already applies to the date of birth carried at
signup.

#### Scenario: The flow travels, the draft does not

- **WHEN** a person begins a Google re-authentication from an email change
- **THEN** the request carries only which flow they were in
- **AND** the address they typed is held in the browser only
