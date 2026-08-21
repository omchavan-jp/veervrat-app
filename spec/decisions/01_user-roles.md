# User Roles
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions
- Four roles exist: **admin**, **moderator**, **vratarthi**, **vratmitra**. A single user account can hold multiple roles simultaneously.
- **Vratmitra** is always a human user — never AI or a system account.
- Any user can be invited into the vratmitra role by a vratarthi for a specific scope (global or journey-level). No pre-approval gate currently.
- **Admin scope:** content management (weaknesses, sentences, ERC data), app-wide stats, per-user data viewing, visual/content sections of app screens, and override capabilities. More permissions TBD.
- **Moderator** has a subset of admin permissions — exact permissions deferred.
- **Global vratmitra:** a vratarthi has at most one global vratmitra at a time.
- **Global VM swap mechanic:** when a vratarthi swaps their global VM, a migration UI is shown offering options to: (a) keep or remove the outgoing VM on existing journeys, and (b) for journeys previously using the global VM default — replace with new global VM, select journey-by-journey, or remove and choose later per journey. Exact option copy is illustrative; mechanic is confirmed.
- **Journey-level VM** is an independent relationship from global VM. Changing global VM does not silently cascade to journeys — it always surfaces explicit migration choices.

- **VM is never required** at any scope — global or journey-level. VA can operate fully without one at all stages including journey completion. VM is recommended, never enforced.
- **VM philosophy note:** shown during framework onboarding (the "What is Veervrat" section). Shown once and not repeated on subsequent logins. Accessible again from the "My Vratmitras" page and the "What is Veervrat" nav page.
- **Moderator permissions:** fully covered in `decisions/17_moderation.md`. Moderator = curates content + reviews custom ERC proposals + manages display content. Cannot access taxonomy, journey state overrides, or user management.
- **Vratmitra credibility:** count of journeys completed as VM. Shown as a neutral stat on VM's public profile ("Guided X journeys to completion"). No score, no ranking, no comparison to others. Satisfies "no visible hierarchy" — it's a fact, not a grade.

## Not a role: capabilities

Roles say who a person **is** in Veervrat. What a person may **try** — the beta feedback widget,
the in-context content editor — is a separate concept, a *capability*, granted per user and
stored in `user_capabilities` (see `05_permissions.md` and conventions §23).

The distinction is load-bearing, and the tempting shortcut is to add e.g. `BETA_TESTER` to the
`Role` enum. Don't: a person is a vratarthi **and** a beta tester **and** a content editor at
once, and every switch that reasons about domain identity — journey visibility, vratmitra
relationships, moderation — would then need a case meaning "ignore this one".

Capabilities are feature-scoped (`FEEDBACK_WIDGET`, `CONTENT_EDIT`), never person-scoped: a
person-scoped grant silently changes meaning whenever a feature joins it, leaving audit rows
whose consequences drifted after the fact.

## Open Questions (area-specific)
_(none — area closed)_

## Flags
- ⚠ "No hierarchy display" + credibility stat — resolved. Stat is factual count, not a ranking. Display as neutral profile field.
