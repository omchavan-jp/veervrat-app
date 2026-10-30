# feedback

## Overview

Feedback entry widget, observation list and submission dialog.

## Interface

- FeedbackWidget exports the widget and re-exports FeedbackMode [feedback-widget.tsx:FeedbackWidget] [feedback-widget.tsx:FeedbackMode].
- FeedbackModal accepts open/onOpenChange and provides observations and raise tabs [feedback-modal.tsx:FeedbackModal].

## Invariants

- Widget requires feedback mode not off and FEEDBACK_WIDGET grant; API remains authority [feedback-widget.tsx:FeedbackWidget].
- Form accepts four types, title 1–120 characters and optional description up to 2000 [feedback-modal.tsx:feedbackFormSchema].
- Observation list defaults to unresolved items and upvotes optimistically roll back on error [feedback-modal.tsx:ObservationsList].

## Side Effects

- Reads and writes widget corner in localStorage and listens for resize [feedback-widget.tsx:FeedbackWidgetInner].
- Lists, creates and toggles feedback upvotes; creation captures route, locale, viewport and commit SHA and invalidates queries [feedback-modal.tsx:RaiseForm] [feedback-modal.tsx:ObservationsList].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
