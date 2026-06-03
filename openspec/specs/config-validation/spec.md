## ADDED Requirements

### Requirement: Required env vars validated at startup
The system SHALL validate all required environment variables using a Joi schema in `AppConfigModule`. If any required variable is missing or invalid, the application SHALL throw a descriptive error listing all missing vars and exit before accepting any requests.

#### Scenario: Missing required var causes exit
- **WHEN** the application starts without `DATABASE_URL` set
- **THEN** NestJS throws a Joi validation error naming the missing variable and the process exits

#### Scenario: All missing vars reported at once
- **WHEN** the application starts without `DATABASE_URL` and `SESSION_SECRET`
- **THEN** the error message names both missing variables (not just the first)

#### Scenario: All required vars present — app starts
- **WHEN** `DATABASE_URL`, `SESSION_SECRET`, and `FRONTEND_URL` are all set
- **THEN** the application starts without error

### Requirement: Known optional vars have documented defaults
The following variables SHALL be optional with these defaults: `PORT` → `3001`, `LOG_LEVEL` → `info`, `NODE_ENV` → `development`. The application SHALL start successfully when they are absent.

#### Scenario: PORT defaults to 3001
- **WHEN** `PORT` is not set
- **THEN** the application listens on port 3001
