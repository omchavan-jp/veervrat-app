# 20 — Solo-Dev Operations (feedback → triage → implement → log)

How defects and change requests flow from users into shipped, documented changes.
This is the operating manual for the beta-test phase and beyond, for a solo
maintainer working with Claude Code.

## The three loops

```
CAPTURE                TRIAGE                     IMPLEMENT
in-app feedback  ──▶   GitHub Issues (canonical) ──▶  branch → PR → main → UAT (auto)
+ inbox notes          labeled, prioritized           → verify on UAT → close issue
                                                      → CHANGELOG + doc updates
                                                      → prod-* tag ships it to users
```

## Loop 1 — Capture

**Channel: the in-app feedback widget.** A floating, corner-snapping button (position in
`localStorage`), rendered when the environment allows it **and** the person is allowed it.

⚠️ Not `NEXT_PUBLIC_FEEDBACK_MODE`. That was wrong twice over: `NEXT_PUBLIC_*` is inlined at
build time, so one promoted image could not differ between UAT and prod (§17, the defect that
had prod addressing UAT's database); and the value lived on the web tier alone, so the widget
was *hidden* rather than *denied* while the API accepted feedback from anyone signed in (§23).

- Modal tab 1: open observations — title, tag (`issue` | `improvement`), status
  chip, +1 button (dedup pressure valve).
- Modal tab 2: raise new — type + title + optional description. Everything else
  is auto-captured: route, user id + role, locale, viewport, user agent, commit
  SHA (`NEXT_PUBLIC_COMMIT_SHA`, set from the git SHA at build time by CD).
- Backend: `feedback` module — Prisma model, `POST /feedback` + `POST /feedback/:id/upvote`,
  `GET /feedback` (list, open items), `PATCH /feedback/:id` (status, admin only). Rate-limited.
  Access is **enforced server-side** against the same rule the widget reflects; if the two ever
  disagree, the API is right and the UI is a bug.
- Feedback row lifecycle: `new → triaged → done | declined`. Rows are an **inbox**,
  not the backlog — once triaged they carry a link to the GH issue.
- **Who sees it** — runtime config `FEEDBACK_MODE`, set on **both** the api and web containers:
  - `off` — nobody, whatever they have been granted
  - `granted` — only holders of the `FEEDBACK_WIDGET` capability, granted per person from
    `/admin/users/[id]`

  **Both environments use `granted`.** UAT briefly used an `all` mode so reviewers needed no
  setup; that made UAT differ from prod on the mechanism UAT exists to test, so the grant path
  first ran for real in production. Reviewers are granted once instead.

  The old `test` / `public` pair is gone. `public` was configured in no environment and its
  branch was never exercised; `test` also silently controlled whether the observations list
  showed, which is now on for anyone who can see the widget — the point being that testers see
  and +1 each other's observations.
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
- **Noticed but not yet scheduled** → **a GitHub issue**, labelled by type and priority.
  Not a list in a file. A second backlog *was* kept in `ops/PROJECT-STATUS.md` as `B<n>` items
  and drifted from the issues within weeks — the admin dashboard sat as `p3` in one and `p1` in
  the other. Migrated into Issues on 2026-08-18; do not start a third.
- Promote an issue to an **O-thread** in `ops/PROJECT-STATUS.md` only when it is actively in
  flight with someone waiting. The issue stays open and remains the record; the O-thread is a
  pointer, not a copy.

Keep the Inbox free of long-lived "future" sections — file those as `deferred` issues
instead. Already-triaged history lives in `../ops/triage-archive.md`, which is append-only
and never actionable.

**Priority vs sequence.** Labels (`p0`–`p3`) say how much something matters; they do not say
what happens next. Ordering lives in the **Working order** section of `ops/PROJECT-STATUS.md`,
which names only the next few items by issue number. GitHub has no inherent issue ordering, so
if these two ever disagree, the working order wins — it is the one a human maintains
deliberately.

## Loop 3 — Implement

Two lanes, chosen at triage:

**Fix lane** — defects, copy, small UX. No spec needed.
1. `fix/<slug>` branch (or `chore/`, `perf/` as fits).
2. Implement. Verification is **tiered by risk**: infra/auth/build/migration
   changes get empirical verification (docker build, boot, curl live endpoints);
   assets/copy/minor UI get typecheck + commit.
2b. **Run it locally before pushing.** `pnpm dev` against the docker services, with real
   Google and SMTP credentials available (`02_Local-Development-Setup.md`). Anything a page
   load or an API call would reveal should be caught here, not two deploy cycles later — a
   round trip through CI and CD is roughly fifteen minutes, and a local check is seconds.
   ⚠️ A green local run says nothing about cookies, `Secure`/`SameSite`, build-time
   configuration, or deployment machinery. See "What local testing proves, and what it does
   not". State which was actually checked.
3. Squash-merge to `main` → **UAT auto-deploys** → spot-check on UAT **for the things local
   cannot show**.
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

Full rules: `../AGENTS.md` → Git conventions. Procedure: `../DEPLOYMENT.md`.
