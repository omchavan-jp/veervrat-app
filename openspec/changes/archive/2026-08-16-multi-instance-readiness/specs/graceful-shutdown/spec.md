## ADDED Requirements

### Requirement: API terminates gracefully on shutdown signals

The API MUST respond to `SIGTERM` and `SIGINT` by shutting down in an orderly manner:
refusing new connections, allowing in-flight requests to complete, and releasing external
resources (database and Redis connections) before the process exits.

Container platforms replace a running revision by sending `SIGTERM` and waiting a bounded
grace period before sending `SIGKILL`. A process that does not handle `SIGTERM` is killed
mid-request, surfacing errors to users on every deployment.

Shutdown MUST be bounded: if orderly shutdown has not completed within a configurable
timeout (`SHUTDOWN_TIMEOUT_MS`, default 10000), the process MUST exit anyway rather than
remain open until it is force-killed.

NestJS lifecycle hooks (`onModuleDestroy`, `onApplicationShutdown`) MUST be active, so that
providers implementing them — notably `PrismaService.onModuleDestroy` — actually run.

#### Scenario: In-flight requests complete during shutdown

- **WHEN** the process receives `SIGTERM` while a request is being handled
- **THEN** that request runs to completion and its response is sent
- **AND** the process exits only afterwards

#### Scenario: Database connections are released on shutdown

- **WHEN** the process receives `SIGTERM`
- **THEN** `PrismaService.onModuleDestroy` runs and disconnects the Prisma client
- **AND** no connection is left dangling on the database server

#### Scenario: A hung shutdown handler cannot block exit indefinitely

- **WHEN** the process receives `SIGTERM` and a shutdown handler does not settle within
  `SHUTDOWN_TIMEOUT_MS`
- **THEN** the process exits regardless, without waiting for `SIGKILL`

#### Scenario: New requests are not accepted after the signal

- **WHEN** the process has received `SIGTERM`
- **THEN** the HTTP server stops accepting new connections
