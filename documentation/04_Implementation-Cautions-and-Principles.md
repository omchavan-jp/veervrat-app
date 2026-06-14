# Implementation Cautions & Principles

> **Audience:** any AI (or human) implementing features from Item 21 onward — backend
> and responsive frontend.
> **Purpose:** the existing codebase was AI-built and later required a remediation pass.
> The fixes clustered into a small number of *recurring failure classes*. This document
> generalizes those classes into principles, a definition-of-done, and a verification
> ladder so the same kinds of mistakes are not reintroduced. It contains **no specific
> past examples** — only the generic lessons.
>
> **How to use:** read this once at session start, alongside `CLAUDE.md` and the relevant
> `spec/decisions/` + convention docs. Treat the Definition of Done and the Verification
> Ladder as gates, not suggestions. When this doc and a convention doc disagree, the
> convention doc wins on specifics; this doc wins on *process and rigor*.

---

## 0. The one root cause behind most failures

**Almost every defect traced back to one thing: declaring work "done" without proving it
through the same path a real user or a production build would take.** The dev server, a
passing typecheck on one package, or a feature that "looks right in the code" are *weak
evidence*. Strong evidence is: the production build passes, the full test suite passes,
and the behavior was exercised end-to-end. Internalize the gap between "I wrote it" and
"I verified it." Everything below is downstream of closing that gap.

---

## 1. Core operating principles

1. **Verify, don't assume.** Never report something as working because the code looks
   correct. Confirm it through execution — build, test, probe, or render.
2. **A feature is a vertical slice, not a layer.** "Backend done" is not "feature done."
   A feature that exists only in the database, or only in an endpoint, or only in a
   component, is unfinished. See the Definition of Done (§2).
3. **The frontend is never a security boundary.** Every protected action must be enforced
   server-side, scoped to the specific resource and relationship — never by trusting a
   client-supplied identifier, role string, or hidden UI.
4. **Dev mode is permissive; production is strict.** Code can run in dev while being
   broken for production. Always validate against the strict path before claiming done.
5. **Follow the established pattern before inventing one.** When a similar feature already
   exists, match its structure, naming, and idioms. Divergence is a cost; pay it only with
   a reason.
6. **When the spec is thin, that is a flag, not a license.** A terse spec is where
   improvisation silently diverges from intent. If a decision isn't specified, find the
   nearest analogous decision and follow it — or stop and ask. Don't invent silently.
7. **Distinguish "spec-thin" from "spec-says-otherwise."** Before changing behavior,
   determine whether the gap is missing guidance (fill it consistently) or a contradiction
   with an existing decision (resolve it explicitly, don't paper over it).
8. **Leave the system as healthy as you found it.** Don't disrupt running processes, leave
   stray artifacts, or break shared state (databases, caches, dev servers) for the next
   person. Clean up after verification.

---

## 2. Definition of Done (the vertical-slice gate)

A feature item is **not done** until *all* applicable rows below are true and have been
*verified*, not assumed:

| Dimension | Done means |
|---|---|
| **Data** | Schema migrated; migration named and reversible-in-spirit; seed/fixtures if needed. |
| **Backend** | Controller → service → repository layering intact; DTO validation on all input; custom exceptions; permission check at the service layer scoped to the resource. |
| **API contract** | Route shape, method, response envelope, pagination, and error shape match conventions. |
| **Frontend** | The capability is reachable through the UI — entry point, the screen itself, and the action all wired. No backend capability left unsurfaced. |
| **States** | Every screen handles loading, empty, error, and success. Empty states are never dead ends. |
| **Responsive** | Verified at mobile, tablet, and desktop widths — including navigation and any layout that reflows or collapses. |
| **i18n** | All user-facing strings localized; both locales have parity; content vs. UI-language rules followed (see §6). |
| **Permissions** | One positive + one negative test per permission row touched; enforcement routed through the central permission function, not ad-hoc checks. |
| **Events/side-effects** | Any notification, audit, search-index, or cache side-effect the spec requires actually fires — not just defined in an enum. |
| **Tests** | Written alongside the code (not after); suite green; new behavior covered. |
| **Build** | Production build of every affected package passes. |
| **Verified** | Behavior exercised end-to-end through the real path (see §8). |

If you must defer a row, **say so explicitly and record it** — never let an unfinished
dimension read as complete.

---

## 3. Backend cautions

- **Respect the layering boundary absolutely.** Data access stays in its designated layer;
  business logic stays out of controllers; cross-module calls go through services, never
  another module's data layer.
- **Validate at the edge.** Every external input is validated by a typed schema/DTO before
  it reaches business logic. Never trust shape, presence, or range.
- **Type honestly.** No escape hatches (`any`, unchecked casts, suppression comments) to
  silence the type checker. An untyped value is an unverified assumption that will surface
  as a runtime defect.
- **Errors are part of the contract.** Use the project's exception types so every failure
  maps to the correct status and response envelope. A 500 that should be a 4xx is a bug.
- **Make required side-effects fire where they belong.** Defining an event type, audit
  category, or index is not the same as emitting it. Wire the trigger at the point the
  action completes, and verify it actually fires.
- **Mind global route prefixes.** Confirm the final, externally-visible path — a per-route
  prefix combined with a global prefix can silently double up. Test the real URL.
- **Idempotency and soft-delete semantics.** Honor the project's conventions for IDs,
  timestamps, soft deletes, and re-runnable operations consistently across every entity.

---

## 4. Frontend cautions

- **Type-check and production-build the frontend every time.** A frontend that only runs
  in dev is not known to work. The strict build is the gate.
- **Reachability is a feature requirement.** A screen that exists but has no entry point,
  or an action with no trigger, is invisible to users. Trace every capability from a
  nav/link/button the user can actually reach.
- **Place screens in the correct structural group.** App shells, layouts, and navigation
  are usually provided by a route/layout grouping. A screen placed in the wrong group
  silently loses its shell, auth wrapper, or providers. Verify the screen renders *with*
  its intended chrome, not just in isolation.
- **All four states, always.** Loading, empty, error, success. Design the empty and error
  states deliberately; they are where AI-built UIs most often degrade.
- **Honor framework-version idioms.** Async/await semantics, server-vs-client component
  rules, data-fetching patterns, and routing APIs change between major versions. Use the
  idiom for the version in use; don't carry over stale patterns.
- **Centralize data access and state.** Server state goes through the project's data-layer
  client and caching library; shared UI state uses the sanctioned mechanism. No raw calls
  in components, no unsanctioned global stores.
- **Forms are typed and validated client- and server-side.** The client validation is UX;
  the server validation is the contract. Both exist.
- **Design tokens are a contract, not decoration.** Every visual state (default, hover,
  active, focus, disabled, error, loading) must resolve to a real token. An unmapped or
  invented token renders as a broken/colorless state. Verify states visually, not just in
  markup.

---

## 5. Real-time / transport cautions

- **Connection configuration is exact, not approximate.** The endpoint URL, path,
  namespace, protocol, and credential settings must each be correct; a single wrong field
  produces a silent, permanent failure that looks like "still connecting."
- **Cross-origin requests need explicit credential opt-in.** Cookies/sessions are not sent
  across origins by default. If auth rides on a cookie, the client must opt in and the
  server must allow it.
- **Authorize every real-time action server-side, per message.** Connection-time auth is
  not action-time auth. Each send/subscribe verifies the actor's right to that specific
  room/resource against persisted state — never against a client-supplied identifier.
- **Reconcile optimistic UI deliberately.** If the client shows an action optimistically
  *and* the server broadcasts the result, define exactly one source of truth so the same
  item is not rendered twice. De-duplicate by stable identity defensively.
- **List rendering needs stable, unique keys.** Optimistic placeholders and their
  confirmed counterparts must reconcile to one identity, or rendering corrupts.

---

## 6. Internationalization & bilingual content

- **Separate UI language from content language.** UI chrome follows the user's selected
  language. Bilingual *content* follows its own rule (often: show both, with one script
  primary) regardless of the UI toggle. Don't conflate the two — toggling the UI language
  must not hide content that is meant to always appear.
- **No hardcoded user-facing strings.** Every label, message, placeholder, and aria-label
  is localized. This includes error/empty/loading text and accessibility attributes.
- **Keep locales at parity.** Every key exists in every locale file. A missing key is a
  runtime error in strict setups, not a silent fallback.
- **Apply the bilingual rule uniformly.** If content rendering has a canonical bilingual
  presentation, apply it on *every* surface that shows that content — partial application
  is an inconsistency users notice.
- **Respect script-specific typography.** Different scripts may need different fonts and
  sizing for equal visual weight; follow the design system rather than reusing one style.

---

## 7. Responsive & layout

- **Three viewport classes are the baseline.** Verify mobile, tablet, and desktop for
  every screen — not just the width you happened to develop at.
- **Navigation is part of responsiveness.** Primary navigation often takes a different form
  per breakpoint. Confirm every breakpoint has working, complete navigation, not a
  desktop-only control that vanishes on mobile.
- **Reflow, don't just shrink.** Multi-pane and dense layouts must restructure for narrow
  screens, not merely scale down into something cramped or overflowing.
- **Test interactive controls at each breakpoint.** Sizing, spacing, and hit targets that
  look fine on desktop can collapse or misalign on mobile. Check the actual rendered
  result.

---

## 8. The Verification Ladder (how to prove, not assume)

Use the lightest rung that *actually* proves the claim; for anything user-facing or
security-relevant, climb higher. The AI cannot "see" a running app by intuition — it must
generate evidence.

1. **Type check** every affected package (strict, no suppressions).
2. **Production build** every affected package — the authoritative compile gate.
3. **Automated tests** — unit + integration; write them with the code. For permissions,
   one positive and one negative per rule touched.
4. **Backend behavioral probe** — exercise endpoints/sockets directly (scripted request or
   socket client) to confirm real request/response/authorization behavior, including the
   negative (forbidden) case.
5. **Data inspection** — confirm the database reflects exactly what should have happened
   (one row, correct columns, correct state) — no more, no less.
6. **Rendered-UI verification** — drive the actual UI (a browser automation tool) for
   user-facing changes: confirm reachability, the four states, responsiveness across
   breakpoints, and the end-to-end flow. Capture and review the rendered result.
7. **Console/log hygiene** — a feature that "works" while emitting errors/warnings is not
   done; read the console and server logs during verification.

> Rule of thumb: **security and real-time behavior demand at least a behavioral probe with
> a negative case; user-facing UI demands rendered verification.** A green typecheck alone
> proves almost nothing about behavior.

---

## 9. Permissions & security (non-negotiable)

- **Two layers, always:** identity (authentication) *and* resource-scoped authorization
  (is this actor allowed on this specific object/relationship?).
- **Route through the central permission function.** Never re-implement access logic inline
  or check role strings directly; ad-hoc checks drift from the matrix and create gaps.
- **Test both directions.** For each rule, prove the allowed actor succeeds *and* the
  disallowed actor is rejected. Negative tests are where real authorization bugs hide.
- **Never leak existence or identity** through error messages, response timing, or
  enumeration. Failure responses should not reveal whether a resource/account exists.
- **Authorization is verified against persisted relationships,** not against identifiers or
  claims supplied by the client.

---

## 10. Data & migrations

- **Schema changes go through migrations,** named descriptively, committed separately from
  feature logic.
- **Keep every environment's schema in sync.** Development, test, and any other database
  must all have the latest migrations applied. Integration tests failing on "missing
  column"-type errors usually mean a database is behind — bring it current before assuming
  the code is wrong.
- **Follow the project's data conventions uniformly:** identifier type, mandatory
  timestamps, soft-delete semantics, and field-casing translation between API and storage.

---

## 11. Local environment & operational cautions

- **Don't disturb processes you didn't start.** Build/clean operations that share state
  with a running development server can corrupt that server's working state. Prefer
  isolated commands; if you must touch shared build state, restart the affected process
  afterward and confirm it's healthy.
- **Confirm shared services are up and current** (database, cache, search, object storage,
  message transport) before debugging "broken" code — the cause is often an environment
  gap, not the code.
- **Treat local credentials and data carefully.** Use them only for the explicit task,
  prefer reversible actions, and clean up test artifacts (records, files, screenshots) so
  the workspace stays pristine.
- **Keep generated/throwaway artifacts out of the application tree** so the app stays
  clean and reviewable.

---

## 12. Process hygiene

- **One logical change per commit;** migrations and unrelated changes get their own
  commits. Clear, conventional messages.
- **Work on a feature branch; never commit directly to the integration branch.** Open a PR.
- **Finish the workflow.** If the project uses a spec→implement→review→archive flow, run it
  to completion — half-finished process state (unarchived/unclosed items) reads as
  ambiguous status to the next session.
- **Record deferrals explicitly.** Anything intentionally left incomplete must be written
  down where the next session will see it, with the reason — never silently dropped, and
  never left to *look* complete.
- **Update the relevant docs/specs when code and documentation drift.** Reconcile, don't
  accumulate contradictions.

---

## 13. Generalized anti-patterns to refuse

- Marking a task complete on the strength of a single weak signal (it compiles / it runs in
  dev / it looks right).
- Shipping a capability in one layer and calling the feature done.
- Silencing the type checker or linter instead of fixing the underlying issue.
- Inventing behavior, tokens, routes, or copy where the spec is silent, without flagging it.
- Trusting client-supplied identity, role, or relationship for authorization.
- Hardcoding user-facing text, or applying a content/i18n rule on only some surfaces.
- Building for one viewport and assuming the others.
- Leaving empty/error/loading states unhandled.
- Defining an event/side-effect contract without wiring it to fire.
- Verifying only the happy path and skipping the negative/forbidden case.
- Leaving shared environment state (DBs, dev servers, artifacts) broken or dirty for the
  next session.

---

_If you finish an item and cannot point to the evidence that each applicable Definition-of-
Done row is satisfied, the item is not done. Generate the evidence or record the gap._
