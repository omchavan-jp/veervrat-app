# 20 — Solo-Dev Operations (feedback → triage → implement → log)

How defects and change requests flow from users into shipped, documented changes.
This is the operating manual for the beta-test phase and beyond, for a solo
maintainer working with Claude Code.

## The three loops

```
CAPTURE                TRIAGE                     IMPLEMENT
in-app feedback  ──▶   GitHub Issues (canonical) ──▶  branch → PR → dev → Railway
+ backlog notes        labeled, prioritized           → verify live → close issue
                                                      → CHANGELOG + doc updates
```

## Loop 1 — Capture

**Channel: the in-app feedback widget** (test mode). A floating, corner-snapping
button (position in `localStorage`), rendered when `NEXT_PUBLIC_FEEDBACK_MODE=test`.

- Modal tab 1: open observations — title, tag (`issue` | `improvement`), status
  chip, +1 button (dedup pressure valve).
- Modal tab 2: raise new — type + title + optional description. Everything else
  is auto-captured: route, user id + role, locale, viewport, user agent, commit
  SHA (`RAILWAY_GIT_COMMIT_SHA` surfaced to web at build time).
- Backend: `feedback` module — Prisma model, `POST /feedback` + `POST /feedback/:id/upvote`
  (any logged-in user), `GET /feedback` (list, open items), `PATCH /feedback/:id`
  (status, admin only). Rate-limited.
- Feedback row lifecycle: `new → triaged → done | declined`. Rows are an **inbox**,
  not the backlog — once triaged they carry a link to the GH issue.
- **Public phase:** set `NEXT_PUBLIC_FEEDBACK_MODE=public` — list tab hidden,
  form only (or relocate to a help menu). Same plumbing.
- Out of v1 scope (add only if triage suffers): screenshots, comment threads,
  email notifications.

**Maintainer observations:** use the widget too, or add to the **Inbox** section of
`../ops/PROJECT-STATUS.md`. Both drain into triage.

## Loop 2 — Triage

**Canonical backlog: GitHub Issues** on `veer-vrat/veervrat-app`. Rationale:
`gh` CLI lets Claude read/create/label/close issues inside any session; issues
link to commits/PRs (`fixes #NN` auto-closes); durable across chat sessions.

Labels:
- Type: `defect` `enhancement` `ux` `perf` `i18n` `content`
- Priority: `p0` (broken for everyone / data loss) `p1` (broken for some, no
  workaround) `p2` (annoying, workaround exists) `p3` (nice to have)
- Process: `needs-spec` — must go through an openspec change before any code.
- Lifecycle: `deferred` — an **icebox** item: a real idea, deliberately not
  scheduled. Act on it only if it recurs or a tester actually hits it.

**The ritual** (weekly, or when ~10 items accumulate): open a session, say
"triage". Claude pulls new feedback rows + scratch notes, dedupes, proposes
type/priority per item; maintainer accepts/overrides in one pass; Claude creates
the GH issues and marks feedback rows `triaged` with the issue link. Declines
get a one-line reason on the feedback row (visible to the reporter in test mode).

**One backlog, three homes — don't invent a fourth.** Deferred/"someday" ideas
belong in the *same* canonical backlog as everything else, so they stay
searchable and linkable — not in a growing section of the scratch inbox (which is
meant to drain to zero). Route by kind:
- **Post-launch product / UX / perf idea, deliberately not now** → a **`p3`
  GitHub issue**, add the `deferred` label. That open issue *is* the icebox.
- **Build-time technical deferral** (a seam left for a later implementation item,
  with a "paid back by" owner) → `documentation/05_Deferral-Ledger.md`. Different
  schema (item numbers, payback tracking); not for tester-driven ideas.
- **Raw, still-untriaged note** → the **Inbox** section of `../ops/PROJECT-STATUS.md`,
  which drains to empty at the next triage.
- **Noticed but not yet scheduled** → the **Backlog** (`B<n>`) section of the same file.
  Promote a `B` item to an **O-thread** when it gets an owner and a slot in the working
  order — *move* it, never copy it. (Two separate registers previously produced three
  duplicated items; that is why there is now one file.)

Keep the Inbox free of long-lived "future" sections — file those as `deferred` issues
instead. Already-triaged history lives in `../ops/triage-archive.md`, which is append-only
and never actionable.

## Loop 3 — Implement

Two lanes, chosen at triage:

**Fix lane** — defects, copy, small UX. No spec needed.
1. `fix/<slug>` branch (or `chore/`, `perf/` as fits).
2. Implement. Verification is **tiered by risk**: infra/auth/build/migration
   changes get empirical verification (docker build, boot, curl live endpoints);
   assets/copy/minor UI get typecheck + commit.
3. Squash-merge to `main` → **UAT auto-deploys** → spot-check on UAT.
4. Close the issue (`gh issue close NN --comment "..."`), add CHANGELOG line.
5. Ship to beta testers by cutting a `prod-*` tag (below) — a merge alone no longer
   reaches real users, which is the point of having UAT.

**Change lane** — new features or behavior changes (`needs-spec` label).
1. Draft an openspec change in `openspec/changes/<id>` (proposal + spec deltas).
2. Discuss decision points; record decisions in the change doc, not just chat.
3. Implement against the approved delta; archive the change; specs updated.
4. Same deploy/close/log steps as the fix lane.

**Session hygiene with Claude:** one issue (or one tight cluster) per session;
open by naming the issue number(s); close by verifying the deploy, closing the
issue, and writing the changelog line. Mid-session decisions → into the issue
or spec delta.

## Documentation & logging

- **`CHANGELOG.md`** — Keep-a-Changelog style with dated sections (continuous
  deploy, no version numbers yet). One line per user-visible change, written in
  the same PR that ships it.
- **`DEPLOYMENT.md`** — the live runbook. Must reflect what is *actually*
  deployed (services, providers, known gaps). Updated in any infra PR.
- **`documentation/01_System-Decisions-and-Status.md`** — updated when the
  status of a subsystem changes (e.g., email goes live, Meilisearch deployed).
- **Openspec specs** — updated only through the change lane; never drift them
  silently.

**Merge checklist** (every PR): does this change require an update to
CHANGELOG.md, DEPLOYMENT.md, or a spec? Answer explicitly before merging.

## Environments and hard rules

Updated 2026-08-16 (O6) — the Railway-era single-environment model is gone.

- **`main` is the trunk.** Never commit directly — always a branch + squash merge.
  `dev` is retired.
- **Merging to `main` deploys to UAT automatically.** It does **not** reach beta testers.
- **Beta testers are on prod** (D11), reached only by cutting a `prod-YYYY-MM-DD` tag and
  approving the deploy. The same image UAT tested is promoted — never rebuilt.
- **`main` must always be releasable**, since a tag is only useful if `HEAD` is shippable.
- **Never auto-migrate a deployed environment.** Migrations run as a one-off job inside
  Azure on the same image as the app, in the order build → migrate → deploy.
- Conventional commits throughout.

Full rules: `../CLAUDE.md` → Git conventions. Procedure: `../DEPLOYMENT.md`.
