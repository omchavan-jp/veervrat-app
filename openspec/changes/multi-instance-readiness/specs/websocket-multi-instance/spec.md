## ADDED Requirements

### Requirement: WebSocket broadcasts reach clients on every replica

Socket.IO MUST use a Redis-backed adapter so that room membership and message broadcasts
are shared across all API replicas.

By default, Socket.IO keeps room membership in per-process memory. A message emitted to a
room on replica A is delivered only to sockets connected to replica A; clients connected to
replica B receive nothing — with **no error raised on either side**. In a chat feature this
presents as messages that appear for some participants and not others, intermittently and
depending on load-balancer routing.

The adapter requires two separate Redis connections, because a connection in subscriber mode
cannot issue other commands. These MUST be duplicated from the existing application Redis
client rather than configured independently, and MUST be connected before the server begins
accepting connections.

When no Redis is configured (`REDIS_URL` unset — local development), the API MUST start
normally using the default in-memory adapter, which is correct for a single process.

#### Scenario: Message reaches a participant on a different replica

- **GIVEN** two chat participants are connected to different API replicas and joined to the
  same room
- **WHEN** one sends a message
- **THEN** the other receives it

#### Scenario: Room membership is visible across replicas

- **GIVEN** a client joins a room on one replica
- **WHEN** a broadcast to that room is emitted from another replica
- **THEN** that client receives the broadcast

#### Scenario: Local development without Redis still serves WebSockets

- **GIVEN** `REDIS_URL` is not configured
- **WHEN** the API starts
- **THEN** WebSocket connections are served using the default in-memory adapter
