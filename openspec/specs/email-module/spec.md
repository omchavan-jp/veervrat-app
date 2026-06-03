## ADDED Requirements

### Requirement: EmailService with production/dev abstraction
The system SHALL provide an `EmailService` with two methods: `sendTransactional(to, template, data)` (blocking, awaits delivery confirmation) and `sendNotification(to, template, data)` (fire-and-forget, non-blocking). In production with `RESEND_API_KEY` set, both methods SHALL send via the Resend SDK. When `NODE_ENV !== 'production'` or `RESEND_API_KEY` is absent, both methods SHALL log the recipient, subject, and text content to the console with a `[EMAIL DEV]` prefix instead of sending.

#### Scenario: Email sent in production
- **WHEN** `NODE_ENV === 'production'` and `RESEND_API_KEY` is set and `sendTransactional` is called
- **THEN** the email is delivered via the Resend API and the method awaits the response

#### Scenario: Email logged in development
- **WHEN** `NODE_ENV !== 'production'` and `sendTransactional` or `sendNotification` is called
- **THEN** the email content is logged to the console with `[EMAIL DEV]` prefix and no HTTP call to Resend is made

#### Scenario: sendNotification does not block caller
- **WHEN** `sendNotification` is called
- **THEN** the caller proceeds immediately without waiting for email delivery

### Requirement: Verify-email template
The system SHALL provide a bilingual `VerifyEmailEmail` React Email template accepting `{ displayName, verifyUrl, language }`. The template SHALL render subject and body in English when `language === 'EN'` and in Marathi when `language === 'MR'`.

#### Scenario: English verification email rendered
- **WHEN** `language === 'EN'` and the template is rendered
- **THEN** the subject is "Verify your Veervrat account" and the body contains the `verifyUrl` in English text

#### Scenario: Marathi verification email rendered
- **WHEN** `language === 'MR'` and the template is rendered
- **THEN** the subject and body are in Marathi

### Requirement: Password-reset template
The system SHALL provide a bilingual `PasswordResetEmail` React Email template accepting `{ displayName, resetUrl, language }`.

#### Scenario: Password reset email rendered
- **WHEN** the template is rendered with a `resetUrl`
- **THEN** the body contains the `resetUrl` as a clickable link and the email expires notice (1 hour)

### Requirement: Auth service uses EmailService
The system SHALL replace the current `logger.log(...)` stub in `AuthService.register` and `AuthService.forgotPassword` with actual `EmailService.sendTransactional()` calls.

#### Scenario: Verification email sent on register
- **WHEN** a new user registers with email/password
- **THEN** `EmailService.sendTransactional` is called with the verification URL and the user's language preference

#### Scenario: Reset email sent on forgot-password
- **WHEN** a valid forgot-password request is made
- **THEN** `EmailService.sendTransactional` is called with the reset URL and the user's language preference
