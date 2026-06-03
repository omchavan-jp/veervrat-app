## ADDED Requirements

### Requirement: Per-request correlation ID
The system SHALL generate a UUID v4 correlation ID for every incoming HTTP request. If the request already carries an `X-Correlation-Id` header, that value SHALL be used instead of generating a new one. The correlation ID SHALL be bound into the Pino logger context so that every log line emitted during the request lifecycle includes a `correlationId` field.

#### Scenario: No correlation ID in request — generate one
- **WHEN** an HTTP request arrives without an `X-Correlation-Id` header
- **THEN** a UUID v4 is generated for that request

#### Scenario: Upstream provides correlation ID — reuse it
- **WHEN** an HTTP request arrives with `X-Correlation-Id: upstream-id-123`
- **THEN** `upstream-id-123` is used as the correlation ID, not overwritten

#### Scenario: Correlation ID appears in log lines
- **WHEN** any NestJS service logs a message during an HTTP request
- **THEN** the log line contains a `correlationId` field matching the request's correlation ID

### Requirement: Correlation ID returned in response header
The system SHALL set the `X-Correlation-Id` response header on every HTTP response, containing the correlation ID assigned to that request.

#### Scenario: Correlation ID echoed back to client
- **WHEN** any HTTP request is processed (success or error)
- **THEN** the response includes an `X-Correlation-Id` header with the request's correlation ID
