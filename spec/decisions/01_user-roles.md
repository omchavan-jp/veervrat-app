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
- **VM philosophy note:** a single one-time in-app note explains why the role is called "vratmitra" and not "mentor/guide/coach." Displayed once at an appropriate moment (TBD — onboarding or first VM interaction).

## Open Questions (area-specific)
- What specific permissions does the moderator role hold vs. admin? — flagged R1

## Flags
- ⚠ "No hierarchy display" + "credibility/verification mechanism" must be reconciled in design — unresolved — deferred to near-future
