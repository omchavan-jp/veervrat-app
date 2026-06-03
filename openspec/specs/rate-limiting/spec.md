## ADDED Requirements

### Requirement: Global default rate limit
The system SHALL apply a global rate limit of 300 requests per minute per authenticated user (by user ID) and 60 requests per minute per IP for unauthenticated requests.

#### Scenario: Authenticated user within limit
- **WHEN** an authenticated user makes fewer than 300 requests within a 60-second window
- **THEN** all requests succeed normally

#### Scenario: Unauthenticated IP over limit
- **WHEN** an unauthenticated IP makes more than 60 requests within a 60-second window
- **THEN** the system returns 429 Too Many Requests with a `Retry-After` header

### Requirement: Login route rate limit
The system SHALL limit `POST /api/v1/auth/login` to 10 requests per 15 minutes per IP.

#### Scenario: Login over limit
- **WHEN** an IP makes more than 10 login attempts within 15 minutes
- **THEN** the system returns 429 with error code `RATE_LIMIT_EXCEEDED`

#### Scenario: Login within limit
- **WHEN** an IP makes 10 or fewer login attempts within 15 minutes
- **THEN** all login requests are processed normally

### Requirement: Signup route rate limit
The system SHALL limit `POST /api/v1/auth/register` to 5 requests per 1 hour per IP.

#### Scenario: Signup over limit
- **WHEN** an IP makes more than 5 signup attempts within 1 hour
- **THEN** the system returns 429 with error code `RATE_LIMIT_EXCEEDED`

### Requirement: Forgot-password route rate limit
The system SHALL limit `POST /api/v1/auth/forgot-password` to 5 requests per 1 hour per IP.

#### Scenario: Forgot-password over limit
- **WHEN** an IP makes more than 5 forgot-password requests within 1 hour
- **THEN** the system returns 429 with error code `RATE_LIMIT_EXCEEDED`

### Requirement: Health check exempt from rate limiting
The system SHALL exempt `GET /api/health` from all rate limiting.

#### Scenario: Health check not throttled
- **WHEN** any number of requests are made to `/api/health`
- **THEN** all requests return 200 regardless of rate limit state
