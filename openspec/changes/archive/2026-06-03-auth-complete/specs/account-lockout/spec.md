## ADDED Requirements

### Requirement: Failed login counter in Redis
The system SHALL track the count of consecutive failed login attempts per email address using a Redis key `lockout:{email}` with a 1-hour TTL. Each failed attempt SHALL increment the counter. A successful login SHALL delete the key.

#### Scenario: Failed attempt increments counter
- **WHEN** a login attempt fails for a known or unknown email address
- **THEN** the Redis key `lockout:{email}` is incremented by 1 and its TTL is (re)set to 3600 seconds

#### Scenario: Successful login clears counter
- **WHEN** a login attempt succeeds
- **THEN** the Redis key `lockout:{email}` is deleted

### Requirement: Account locked after 10 failures
The system SHALL lock an account for 15 minutes after 10 failed login attempts within a 1-hour window. While locked, all login attempts for that email SHALL be rejected immediately without checking the password.

#### Scenario: Account locked on 10th failure
- **WHEN** the 10th failed login attempt occurs for an email within 1 hour
- **THEN** subsequent login attempts return 429 with error code `ACCOUNT_LOCKED` and a message indicating how many seconds remain in the lockout

#### Scenario: Locked account rejects valid password
- **WHEN** an account is locked and a login attempt is made with the correct password
- **THEN** the system returns 429 with `ACCOUNT_LOCKED` without checking the password

#### Scenario: Lockout expires after 15 minutes
- **WHEN** 15 minutes have elapsed since the lockout was set
- **THEN** login attempts are processed normally again (Redis TTL handles expiry)

### Requirement: Lockout fails open if Redis unavailable
The system SHALL allow login attempts to proceed normally if Redis is unavailable when checking lockout state. The failure SHALL be logged at `warn` level.

#### Scenario: Redis unavailable on lockout check
- **WHEN** Redis is unavailable and a login attempt is made
- **THEN** the login proceeds to credential validation (no lockout enforced), and a warning is logged
