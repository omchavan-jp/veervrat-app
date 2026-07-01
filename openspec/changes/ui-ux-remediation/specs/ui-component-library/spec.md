## ADDED Requirements

### Requirement: Shared primitive inventory

The web app SHALL provide a complete set of shared UI primitives under `apps/web/components/ui/`, each wrapping `@base-ui/react`, so that pages compose primitives instead of re-implementing controls. The inventory MUST include at minimum: Button, Input, Textarea, Select, Label, Field, Alert, Badge, StatusBadge, Card, Dialog, Tabs, Switch, RadioGroup, ToggleGroup, Collapsible, Tooltip, Avatar, EmptyState, Spinner, Popover, Separator, and a Toaster/toast mechanism. No new third-party dependency SHALL be added; all primitives wrap the already-installed `@base-ui/react`.

#### Scenario: A needed control has a primitive
- **WHEN** a page needs a text area, select, switch, radio group, toggle group, collapsible disclosure, tooltip, spinner, or toast
- **THEN** a corresponding primitive exists in `components/ui/` and the page uses it rather than a raw HTML element or a hand-rolled component

#### Scenario: No new dependency introduced
- **WHEN** a new primitive is added
- **THEN** it wraps `@base-ui/react` and `documentation/10_Platform-Engineering-Standard.md` requires no new library entry

### Requirement: Primitives implement all mandatory interactive states

Every interactive primitive (Button, Input, Textarea, Select, Switch, RadioGroup, ToggleGroup, Card-as-action, Toggle) SHALL implement the states defined in `documentation/15_Design-System.md`: default, hover, active/pressed, focus-visible (keyboard ring), disabled, error, and loading where applicable. State colors SHALL use semantic tokens (`danger`/`success`/`warning`), never brand `accent` for non-brand state meaning, and never inline hex/rgba literals.

#### Scenario: Keyboard focus is visible
- **WHEN** a user tabs to any interactive primitive
- **THEN** a visible focus ring is rendered via the focus-visible token

#### Scenario: Error state uses the semantic token
- **WHEN** a field or banner is in an error state
- **THEN** it renders with the `danger` token (not `accent`) and exposes the error to assistive tech

#### Scenario: Disabled and pending controls cannot be re-triggered
- **WHEN** a control is disabled or its mutation is pending
- **THEN** it is non-interactive and visually indicates the state, and only the affected control (not unrelated sibling controls) is disabled

### Requirement: Accessibility contract for primitives

Primitives SHALL be accessible by construction: form fields MUST have programmatic label association (via the Field wrapper / `htmlFor`+`id`) and wire `aria-invalid`/`aria-describedby` to validation errors; composite widgets (tabs, dialog, radio group, collapsible, toggle group) MUST expose the correct ARIA roles/state and keyboard interaction (and dialogs MUST trap focus and close on Escape); icon-only controls MUST have an accessible name; status/loading indicators MUST expose `role="status"` with an sr-only translated label; meaningful iconography MUST use `lucide-react` (decorative marked `aria-hidden`), not bare text glyphs.

#### Scenario: Field label is associated
- **WHEN** a form field is rendered via the Field wrapper
- **THEN** clicking the label focuses the input and a screen reader announces the field's name and any error

#### Scenario: Dialog is operable by keyboard
- **WHEN** a confirmation or modal dialog opens
- **THEN** focus is trapped within it, Escape closes it, and it exposes `role="dialog"`/`aria-modal`

#### Scenario: Loading indicator is announced
- **WHEN** a spinner is shown during an async operation
- **THEN** it exposes `role="status"` with an sr-only translated "loading" label and honors `prefers-reduced-motion`

### Requirement: Async views handle loading, error, and empty distinctly

Every view that reads server state SHALL render three distinct states — loading, error (with retry), and empty — and MUST NOT conflate an error with an empty result or hang on an infinite spinner. Mutations SHALL surface failures to the user (translated toast or inline Alert) rather than failing silently.

#### Scenario: Query error is distinguished from empty
- **WHEN** a data query fails
- **THEN** the view shows an error state with a retry affordance, distinct from the genuinely-empty state

#### Scenario: Mutation failure is surfaced
- **WHEN** a mutation (create/update/delete/submit) fails
- **THEN** the user receives a translated error message and is not left believing the action succeeded

### Requirement: All user-visible text and formatting is localized

User-visible strings SHALL be sourced from `next-intl` message files (`messages/en.json`, `messages/mr.json`) with en/mr parity — no hardcoded EN/MR literals in components. Dates and relative times SHALL be formatted via `next-intl` in the active locale.

#### Scenario: No hardcoded user-facing literal
- **WHEN** a component renders user-visible copy
- **THEN** the string comes from a translation key present in both `en.json` and `mr.json`

#### Scenario: Dates respect the active locale
- **WHEN** a date or relative time is displayed
- **THEN** it is formatted in the user's selected locale via next-intl, not the browser default

### Requirement: Touch targets meet minimum size on mobile

Interactive controls SHALL present a touch target of at least 44×44px at mobile viewports (`<sm`), without forcing the compact desktop density. Fixed/floating elements (e.g. the compose FAB and bottom nav) SHALL NOT overlap page content; content regions MUST reserve space for them.

#### Scenario: Controls are tappable on mobile
- **WHEN** the app is viewed at 375px width
- **THEN** interactive controls (header icons, nav, primary action buttons) are at least 44px in their smaller dimension

#### Scenario: Floating UI does not occlude content
- **WHEN** a floating FAB or fixed bottom bar is present at mobile width
- **THEN** page content scrolls clear of it and no content is permanently hidden beneath it
