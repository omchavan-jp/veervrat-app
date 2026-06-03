## ADDED Requirements

### Requirement: Structured JSON logging via Pino
The system SHALL use `nestjs-pino` as the NestJS `LoggerService`. Every log line emitted via the NestJS `Logger` SHALL be a JSON object containing at minimum: `level`, `time`, and `message`. In development (`NODE_ENV` not `production`), logs SHALL be formatted via `pino-pretty` for human readability.

#### Scenario: JSON log in production
- **WHEN** a NestJS module calls `this.logger.log('message')` and `NODE_ENV=production`
- **THEN** a single-line JSON object is written to stdout containing `level`, `time`, and `message`

#### Scenario: Pretty-printed log in development
- **WHEN** a NestJS module calls `this.logger.log('message')` and `NODE_ENV=development`
- **THEN** the output is human-readable pino-pretty format rather than raw JSON

### Requirement: Sensitive field redaction
The logger SHALL redact `req.headers.cookie` and `req.body.password` in all log output. These fields SHALL appear as `[Redacted]` and SHALL never be logged in plain text under any circumstances.

#### Scenario: Cookie header not logged
- **WHEN** an HTTP request with a `Cookie` header is processed
- **THEN** no log line contains the raw cookie value

#### Scenario: Password body not logged
- **WHEN** a login request containing `{ "password": "secret" }` is processed
- **THEN** no log line contains the string `"secret"`

### Requirement: Configurable log level via environment variable
The logger SHALL read the log level from the `LOG_LEVEL` environment variable. When `LOG_LEVEL` is absent, the level SHALL default to `info`. Log lines below the configured level SHALL be suppressed.

#### Scenario: Default level suppresses debug
- **WHEN** `LOG_LEVEL` is not set and a module calls `this.logger.debug('msg')`
- **THEN** no output is produced for that call

#### Scenario: Debug level enables debug output
- **WHEN** `LOG_LEVEL=debug` and a module calls `this.logger.debug('msg')`
- **THEN** the log line is emitted
