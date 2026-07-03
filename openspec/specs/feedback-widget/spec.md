# feedback-widget Specification

## Purpose
TBD - created by archiving change beta-feedback-widget. Update Purpose after archive.
## Requirements
### Requirement: Floating feedback button on authenticated pages
The web app SHALL render a floating feedback button on all authenticated pages (the
(app), (vratmitra), (moderation), and (admin) route groups) when
`NEXT_PUBLIC_FEEDBACK_MODE` is `test` or `public`, and SHALL render nothing when the
variable is unset or has any other value. The button SHALL NOT appear on public/
unauthenticated pages (login, signup, password reset).

#### Scenario: Test mode shows the button
- **WHEN** the app is built with `NEXT_PUBLIC_FEEDBACK_MODE=test` and an authenticated user views the dashboard
- **THEN** the floating feedback button is visible

#### Scenario: Widget disabled when unset
- **WHEN** the app is built without `NEXT_PUBLIC_FEEDBACK_MODE`
- **THEN** no feedback button or related UI is rendered anywhere

### Requirement: Button is draggable and snaps to viewport corners
The user SHALL be able to drag the floating button; on release it SHALL animate to the
nearest of the four viewport corners (respecting safe-area insets). The chosen corner
SHALL persist in `localStorage` (as a corner identifier, default bottom-right) and be
restored on subsequent page loads regardless of viewport size. A plain click (no drag)
SHALL open the feedback modal, never trigger a drag.

#### Scenario: Snap to nearest corner and persist
- **WHEN** the user drags the button and releases it nearer the top-left of the viewport
- **THEN** the button animates to the top-left corner, and after a page reload it appears in the top-left corner

#### Scenario: Click opens the modal
- **WHEN** the user clicks the button without dragging
- **THEN** the feedback modal opens and the button does not move

### Requirement: Feedback modal — observations list and raise form
In `test` mode the modal SHALL have two tabs: an **Observations** tab listing open
feedback items (title, `ISSUE`/`IMPROVEMENT` tag chip, status chip, upvote count with a
+1 toggle reflecting the user's own upvote state) and a **Raise new** tab with a form
(type required, title required, description optional; React Hook Form + Zod validation).
In `public` mode the modal SHALL show only the raise form. Successful submission SHALL
show a confirmation and refresh the observations list.

#### Scenario: Raising an observation from the modal
- **WHEN** a tester submits the form with `type=IMPROVEMENT` and a title
- **THEN** the item is created via the API, a confirmation is shown, and the new item appears in the Observations tab

#### Scenario: Public mode hides the list
- **WHEN** the app is built with `NEXT_PUBLIC_FEEDBACK_MODE=public` and a user opens the modal
- **THEN** only the raise-new form is shown, with no observations tab

#### Scenario: Upvote from the list
- **WHEN** a tester taps +1 on an observation they haven't upvoted
- **THEN** the count increments optimistically and the toggle reflects their upvoted state

### Requirement: Reports auto-capture client context
When submitting feedback, the widget SHALL automatically attach the current route
(pathname), UI locale, viewport dimensions, and build commit SHA
(`NEXT_PUBLIC_COMMIT_SHA`, fallback `dev`) without any user input.

#### Scenario: Context attached transparently
- **WHEN** a tester on `/journeys/123` with locale `mr` submits feedback
- **THEN** the created item records `route=/journeys/123`, `locale=mr`, the viewport size, and the build SHA, none of which appeared in the form

### Requirement: Widget is fully bilingual
The widget SHALL source every visible string from next-intl messages with both `en`
and `mr` translations (button label/aria, tab names, form labels, validation messages,
status/tag chips, confirmations) — no hardcoded UI text.

#### Scenario: Marathi locale
- **WHEN** a user with locale `mr` opens the widget
- **THEN** every visible string renders from the `mr` message catalog

