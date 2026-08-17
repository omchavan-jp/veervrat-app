## MODIFIED Requirements

### Requirement: EmailService with production/dev abstraction

The system SHALL provide an `EmailService` with two methods: `sendTransactional(to, subject,
html, text)` (blocking, awaits delivery) and `sendNotification(to, subject, html, text)`
(fire-and-forget, non-blocking).

In production with SMTP configured, both methods SHALL send over **SMTP**. When
`NODE_ENV !== 'production'` or SMTP is not configured, both SHALL log the recipient, subject and
text content with an `[EMAIL DEV]` prefix instead of sending, so local development needs no
credentials.

The transport SHALL be configured from `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and
`SMTP_SECURE`, with the sending identity from `EMAIL_FROM`.

`SMTP_SECURE` SHALL distinguish implicit TLS from STARTTLS: false selects STARTTLS (the
submission port, 587), true selects implicit TLS (465). Choosing wrongly fails the TLS handshake
with an error that does not name the cause, so the two MUST NOT be conflated.

Delivery failure SHALL NOT be silent. `sendTransactional` propagates the error to its caller;
`sendNotification` logs a warning and does not disturb the caller. An SMTP relay provides no
bounce webhook, so a send the relay accepts is the strongest signal available.

#### Scenario: Email sent in production over SMTP

- **WHEN** `NODE_ENV === 'production'`, SMTP is configured, and `sendTransactional` is called
- **THEN** the message is sent over SMTP and the method awaits the result

#### Scenario: STARTTLS on the submission port

- **WHEN** `SMTP_PORT` is 587 and `SMTP_SECURE` is false
- **THEN** the connection is established in the clear and upgraded via STARTTLS, not opened as
  implicit TLS

#### Scenario: Email logged in development

- **WHEN** `NODE_ENV !== 'production'`, or no SMTP host is configured
- **THEN** the content is logged with the `[EMAIL DEV]` prefix and no SMTP connection is opened

#### Scenario: sendNotification does not block caller

- **WHEN** `sendNotification` is called
- **THEN** the caller proceeds immediately without waiting for delivery

#### Scenario: Transactional failure reaches the caller

- **WHEN** the relay rejects a `sendTransactional` message
- **THEN** the error propagates, so a failed verification email cannot be mistaken for success
