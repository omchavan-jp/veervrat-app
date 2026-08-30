> ⚠️ **The defect register this change is written against no longer exists** (audit 2026-08-27,
> `ops/audit/02-completion-records.md`). Defect IDs D001–D453, B001–B005 and RC01–RC13 refer to
> `/Users/omc1/Documents/om/jp/veervrat/ui-audit/UI_DEFECTS.md`, and so does the deferred list
> `sweep-deferred.json`. Neither file exists anywhere on disk — the `om/jp/` tree they lived
> under is gone, and both were outside version control, which is precisely the risk `CLAUDE.md`
> records about untracked working files.
>
> **Consequence: no defect ID in this document can be resolved by anyone.** "D207 fixed" is
> unverifiable and unfalsifiable. Ticks below that describe a concrete code change remain
> checkable against the code; ticks that only cite a defect ID do not.
>
> Each tier is independently shippable; commit one tier (or one sweep) at a time. Run
> `pnpm --filter web typecheck` + relevant Vitest after each, full E2E before archive.

> **Progress (session 1):**
> - **Tier 0 complete** (1.1–1.14): all primitives built + wired + tested (18 new tests), zero new deps, full web suite green (112), tsc clean. Commit `0259270`. (1.15 global mutation-onError folded into RC04/Tier 2 — Toast provider is wired; per-call adoption pending.)
> - **Auth slice complete** (proves the recipe end-to-end across all 6 `(public)` pages): login, signup, forgot/reset/verify/link. Covers, for the auth route-group only, slices of RC01 (Button), RC02 (i18n — 937 keys, en/mr parity), RC05 (Label+Input association + aria), RC06 (Alert/StatusBanner), RC09 (signup RadioGroup+Fieldset), RC13 (semantic tokens), plus topDefects: reset-password dead-ternary + duplicated success block, verify-email localized fallbacks, signup username-check error state. Commits `964fb05`, `d6ad6c9`. Verified live (login/signup/forgot, light).
> - **Remaining:** Tier 1–3 sweeps across non-auth route-groups (app-core, journeys, study-test, content, authoring, vm-moderation, admin) + shared chrome, then Phase D browser re-walk. Auth pages are the worked template per sweep.
>
> **Progress (session 2 — completion):**
> - **Tier 1–3 sweep complete**: ~250 fixes across 64 files in 8 route-groups via parallel agents (auth-slice recipe), + shared-chrome done directly. 227 i18n keys merged (1171 en/mr, full parity). Commits `24e4d9f`, `e44e676`.
> - **Verification**: tsc clean (0 errors), 113 web tests pass (7 component tests updated for new primitive markup; several strengthened), production build succeeds, manual browser re-walk verified login flow + dashboard + journeys + mobile (no overflow, pill-nav scrolls, touch targets, role label correct, console clean). Full deferred list: `/Users/omc1/Documents/om/jp/veervrat/ui-audit/sweep-deferred.json` (~25 items, all cross-file/ambiguous with reasons).
> - **Known not-done**: 4.1 + 4.8 partial (see lines); 5.3 Playwright E2E not yet run (needs full docker stack).
>
> **Correction (2026-08-21).** Three claims above did not survive checking, found when a real
> admin action gave no feedback and the operator had to ask whether it had worked:
> - **1.15 was never implemented** and has been un-ticked. It is not in `query-client.ts`.
>   **Superseded 2026-08-27 — it was built, and is on `main`.** See task 1.15 below for what
>   landed. Left in place rather than deleted so this correction still reads as a record of what
>   was found on 2026-08-21, but it is no longer a statement about the code.
> - **3.1 is true but thin**: `QueryBoundary` is used in 1 route file, not adopted broadly.
> - **3.2 covered errors only.** Success confirmation was never in scope, anywhere.
>
> The route-group sweeps *were* done — admin has i18n, `Button`, `Spinner` and `EmptyState`. The
> gap is narrower than "unswept": inconsistent mutation feedback (`useToast` in 9/17 mutating
> pages, 1/7 in admin) and no success acknowledgement at all.
>
> Recorded here rather than in a new document, because a change archived as complete is a change
> nobody reads again. A handful of deferred items need shared-type/backend changes (Mr fields on API payloads) or new shared primitives (journey-state Badge, headless Command) — tracked for follow-up.

## 1. Tier 0 — Primitive foundation (additive, no breakage)

- [x] 1.1 `Spinner` primitive — `role="status"` + sr-only translated label + `prefers-reduced-motion`; replaces the copy-pasted `animate-spin` div (RC07). Unit test.
- [x] 1.2 `Textarea` primitive (base-ui `input`/textarea) matching `Input` styling + states (RC05). Unit test.
- [x] 1.3 `Select` primitive (base-ui `select`) with tokenized trigger/popover + states (RC05/RC09). Unit test.
- [x] 1.4 `Switch` primitive (base-ui `switch`) — replaces the two divergent bespoke toggles (settings/profile) (RC11). Unit test.
- [x] 1.5 `RadioGroup` primitive (base-ui `radio-group`/`radio`) + `fieldset`/`legend` semantics for language/gender (RC09). Unit test.
- [x] 1.6 `ToggleGroup`/`aria-pressed` toggle (base-ui `toggle-group`) for score + check-in status selectors (RC09). Unit test.
- [x] 1.7 `Collapsible` primitive (base-ui `collapsible`) with `aria-expanded`/`aria-controls` for disclosures (erc-pool, check-in history, "other sentences") (RC09). Unit test.
- [x] 1.8 `Tooltip` primitive (base-ui `tooltip`) for icon-only affordances (RC09). Unit test.
- [x] 1.9 `Field` wrapper (base-ui `field`/`fieldset`) owning label↔input association + `aria-invalid`/`aria-describedby` from RHF errors + `aria-live` async-status region (RC05). Unit test.
- [x] 1.10 `Toaster` + `useToast` (base-ui `toast`) wired in the app shell, tokenized, for mutation errors/success (RC04). Unit test.
- [x] 1.11 Extend `Button`: add `pressed`/toggle affordance and a mobile-safe touch size; confirm existing `loading`/focus ring (RC01/B002). Update/extend test.
- [x] 1.12 Extend `Input`: add `underline`/`ghost` variant so auth pages stop overriding the primitive (RC05/CONSISTENCY). Update test.
- [x] 1.13 Rebuild `StatusBanner` on top of `Alert` with `success`/`danger` tokens + `role="alert"` (RC06). Update test.
- [x] 1.14 `QueryBoundary` helper (loading→Spinner, error→Alert+retry, empty→EmptyState) for RC03 adoption. Unit test.
- [x] 1.15 Add default mutation `onError` toast at the QueryClient level (RC04). Test.
  Done 2026-08-27: `setMutationErrorToast` bridge in `query-client.ts`, wired in `providers.tsx`.
  Skips mutations with their own `onError` (avoids double toast). Uses `errorMessage()` for 4xx.
  To suppress the global toast where a mutation has its own `onError`, set `meta: { silent: true }`.
  Confirmed present on `main` 2026-08-30: `MutationCache` and the `setMutationErrorToast` bridge
  are both in `apps/web/lib/query-client.ts`.

  ⚠️ **This task was un-ticked once, on 2026-08-21, as never implemented — and that was true at
  the time.** It was then built on 2026-08-27 and re-ticked. The 2026-08-21 finding is kept below
  as history because the way it was found is worth remembering, but it no longer describes the
  code, and it sat here contradicting the line above it for three days:

  > `apps/web/lib/query-client.ts` has no `MutationCache` and no global `onError`; the whole file
  > is `staleTime` + `refetchOnWindowFocus`. The session-1 note says it was "folded into RC04/Tier
  > 2", but RC04 (3.2) delivered *per-call* error handling, so the global default it was folded
  > into does not exist either. Without it, every new mutation is silent-on-failure by default
  > rather than safe by default.

  Found because a real admin action gave no feedback and the operator had to ask whether it had
  worked — not by re-reading the task list.

## 2. Tier 1 — Mechanical adoption sweeps (parallelizable per route-group)

- [x] 2.1 RC01: replace all raw `<button>`/styled-`<Link>` action controls with `Button` (variant/size or `render`/asChild) across `app/**` + `components/**`. Verify focus rings + disabled/pending restored.
- [x] 2.2 RC06/RC13 token sweep: inline rgba/hex error/success blocks → `Alert`; `text-accent`→`text-danger`, `text-accent-2`→`text-success`, `bg-primary`→`bg-accent`, `#d4a373`→`warning`; standardize on project tokens over shadcn aliases.
- [x] 2.3 RC07: replace every bespoke `animate-spin` div (and `return null` loading flashes) with `Spinner`.
- [x] 2.4 RC02 i18n extraction: move all hardcoded EN/MR literals (auth hero objects, nav/logout, notification labels + EVENT_LABELS, role labels, count labels, empty-state copy, study preview, "Step 1 of 2", gender, separators) into `messages/en.json`+`mr.json`; reuse existing keys; centralize the 3 `SCORE_LABELS` maps into one `t()` helper. Keep en/mr parity.
- [x] 2.5 RC08: dates/relative-times → `next-intl` `useFormatter`; delete the two bespoke relative-time helpers; pass active locale to any residual `toLocaleString`.
- [x] 2.6 RC10: meaningful text glyphs (→ ← ▸ ▾ ✓ ✗ 🔁 🔥 ●) → `lucide-react` icons (decorative `aria-hidden`, status-carrying paired with sr-only label).
- [x] 2.7 RC11/RC09 dedup: replace bespoke toggle/avatar/empty-state/state-badge/bilingual instances with `Switch`/`Avatar`/`EmptyState`/`StatusBadge`/`BilingualText`.

## 3. Tier 2 — State & accessibility sweeps (judgment)

- [x] 3.1 RC03: adopt `QueryBoundary` (or explicit `isError`) on every query view; separate error from empty; kill infinite-spinner guards (`isLoading || !data`) in journey detail, profile, study test/report, weakness detail, dashboard suggestions, settings.
  ⚠️ **Qualified 2026-08-21.** True as written — the `(or explicit isError)` clause was satisfied.
  But `QueryBoundary`, built and unit-tested in 1.14 for exactly this, is adopted in **one** route
  file app-wide. A primitive built to make a rule cheap to follow, then not used, leaves the rule
  depending on each author remembering it. Worth revisiting as adoption, not as a new build.
- [~] 3.2 RC04: per-instance `isPending` disabling keyed by `variables` (fixes "all accept buttons disable"); inline Alert for destructive flows; ensure every mutation has user-visible error feedback.
  ❌ **Un-ticked 2026-08-25. The error feedback half was never visible to anyone.** Every one of
  those calls was routed through `apps/web/hooks/use-toast.ts`, which was a stub: it called
  `console.log` and returned, its own comment reading *"In a real app, this would dispatch to a
  toast provider"*. The real toast system existed and `<Toaster/>` was mounted in `providers.tsx`
  the whole time — **21 files, 51 call sites, displaying nothing**, including twelve `saveError`.
  Found from an upload that returned 500 on UAT while the UI stayed completely silent.
  The hook now delegates to the real provider (#187), so the calls work unchanged. Re-tick this
  only after someone has *seen* a mutation error appear on screen — the calls were always
  written correctly, which is exactly why reading the code could not catch this.
  ⚠️ **Scope note added 2026-08-21** (and see the 2026-08-25 correction above — the error half
  was inert, so #125's premise that errors were already handled was mistaken).
  This covered **error** feedback only. Nothing in this change
  addresses **success confirmation** — an action that works says nothing. Found in use: revoking a
  capability from the admin dashboard applied correctly server-side (verified: `/auth/me` updated
  instantly, API returned 403) while the UI gave no acknowledgement at all, so the operator could
  not tell whether their own action had worked. Measured adoption of `useToast` among pages that
  mutate: **9 of 17** app-wide, **1 of 7** in admin. Tracked separately — this is a design question,
  not a sweep.
- [x] 3.3 RC05: convert raw `<label>`/`<input>`/`<textarea>` to `Field`+`Input`/`Textarea` with association + aria wiring across auth, onboarding, settings, journey detail, custom-erc, checkin, blog comment, chat composer.
- [x] 3.4 RC09: swap hand-rolled widgets for primitives — `Tabs` for the journey tab bar, `Dialog` for the exit-confirm + delete-account modals, `RadioGroup` for language/gender, `Collapsible` for disclosures, `ToggleGroup` for score/status; add `aria-label` to icon-only triggers (notification bell, mobile avatar).
  *Wording corrected 2026-08-27: this said `Dialog`/`AlertDialog`, and no `AlertDialog` component
  was ever built. The work was done — `settings/page.tsx:881` uses the `Dialog` primitive for the
  delete-account confirm, focus-trapped and keyboard-navigable. The tick stands; only the name of
  a component that does not exist was removed, so the claim can be checked.*

## 4. Tier 3 — Individual high-impact defects

- [~] 4.1 study test page: PARTIAL — interceptor hardened in place (ignores modifier/middle clicks, target=_blank, downloads, already-prevented events) which fixes the immediate breakage; full rewrite to a router-guard hook deferred (no supported App Router API in repo). See deferred notes.
- [x] 4.2 study test page: gate `beforeunload` on actual dirty/unsaved answers only.
- [x] 4.3 settings: account deletion via `Dialog` + re-auth `Input` + confirm + `onError` (replace native `prompt`/`confirm`).
- [x] 4.4 journeys/new: show translated error toast on create failure before any redirect (no more silent redirect to /study).
- [x] 4.5 custom-erc-form: validate numeric inputs with RHF+Zod (clamp/reject NaN/0).
- [x] 4.6 preview page: precompute sentenceId→index map (drop O(n²) `indexOf`).
- [x] 4.7 reset-password: collapse dead ternary + remove duplicated success h2/p.
- [~] 4.8 verify-email: PARTIAL — error fallbacks now localized (network vs rejected via next-intl); kept the SSR `fetch` because the typed browser client is CSRF-guard-bound and unusable in a server component. Routing through the client deferred as a deliberate trade-off.
- [x] 4.9 B001: reserve bottom padding (CSS var + safe-area) in `(app)` main so the FAB/bottom-bar never occlude content at mobile.
- [x] 4.10 B002: apply `min-h-11`/`min-w-11` to mobile interactive controls (header icons, nav, score buttons) without changing desktop density.
- [x] 4.11 layout-client: persist sidebar collapse preference (localStorage).

## 5. Verification (Phase D)

- [x] 5.1 `pnpm --filter web typecheck` clean; `pnpm --filter web build` succeeds.
- [x] 5.2 Vitest/RTL (web) green incl. new primitive tests; backend suites untouched/green.
- [x] 5.3 Playwright E2E suite. (Originally: "NOT YET RUN. The E2E suite requires the full docker
  stack (pg/redis/meili/minio) + both servers; deferred to a dedicated run.")
  **Done — and it had been done for three days without this task knowing.** `#215` added
  `.github/workflows/e2e.yml` on 2026-08-27, titled "run the twelve flows that existed and ran
  nowhere". The suite now runs on **every pull request**, with Postgres, Redis, Meilisearch and
  MinIO as CI services; `playwright.config.ts` starts both servers itself and waits on their
  health URLs, so the "dedicated run" this task was deferred for is no longer a manual act.

  Verified 2026-08-30 against run `33313234558` rather than assuming a green check meant
  something — a suite that runs zero tests also passes:

  ```
  30 passed (1.7m)
  ```

  | | |
  |---|---|
  | spec files | 12, all contributing |
  | `test()` declared | 30 |
  | executed | 30 |
  | `.skip` / `.fixme` / `.only` | none |
  | last 10 runs on `main` | 10 success |

  Declared equals executed, which is the check that distinguishes a real pass from a suite that
  quietly stopped running things.
- [ ] 5.4 Browser re-walk at 375/768/1440: confirm B001 (no FAB overlap), B002 (touch targets ≥44px mobile), dark mode on test-flow + admin tables, console clean; tick fixed defects in `UI_DEFECTS.md`.
  **Un-ticked 2026-08-27.** Not because the re-walk did not happen — it may well have — but
  because its entire result was recorded in `UI_DEFECTS.md`, which no longer exists. A tick whose
  evidence cannot be produced is a claim, not a record. B001 and B002 are unresolvable: nobody can
  now say what they were. Re-doing this means re-deriving the checks, not finding the old file.
- [x] 5.5 en/mr message-key parity check passes.
