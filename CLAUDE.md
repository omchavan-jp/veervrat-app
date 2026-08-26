# Agent entry point — hard rules

**`AGENTS.md` is the full context** (project layout, stack, conventions, SOP). Read it at
session start. This file carries only the rules that must be in front of you *at all times*.

> **Why this file is short but not a pointer.** Claude Code loads `CLAUDE.md` into context
> automatically, every turn. `AGENTS.md` it does not — that one has to be actively read and
> then *remembered*, which does not survive a long session or a context compaction. On
> 2026-08-16 this file was reduced to a 10-line pointer and the hard rules moved to
> `AGENTS.md`; rule violations followed within the day (a direct commit to `main`, repeated
> shell-scripted edits, a verification claim drawn from an empty grep). The rules were restored
> here on 2026-08-17. **Keep behavioural rules in this file. Reference material belongs in
> `AGENTS.md`.**
>
> **Using a different agent?** Mirror this content into whatever file *that* harness loads
> unprompted (`GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`, …). The rules
> have to live in the channel that delivers them without being asked. A rule in a file nobody
> loads is decoration.

---

## Never do a workaround

If something is blocking, **stop and say so**. Do not route around it, do not narrow the task
to the part that works, do not ship a shim and call it done — even if previously told to
"proceed". Being told to proceed is not authorisation to work around a blocker discovered
along the way.

## Git

- **Never commit directly to `main`.** Branch → PR → squash merge, always. A `pre-commit` hook
  enforces this; if you find yourself reaching for the override, that is the signal to stop.
- **Never `git checkout` / `switch` / `restore` on a dirty tree**, except `checkout -b` /
  `switch -c`, which carry the changes along and are the normal way to start work mid-change.
  `git checkout <ref> -- <path>` is the dangerous one: it overwrites the working file with no
  conflict, no warning and nothing in the reflog. Enforced by
  `.claude/hooks/guard-git-checkout.sh`. Stash first; a stash is recoverable and this is not.
- Feature branches are **kept** after merging, never deleted.
- Conventional commits. `main` must always be releasable.
- Merging to `main` deploys **UAT**. Production ships only by pushing a `prod-YYYY-MM-DD` tag.

## Checkpoints — run these at the trigger, not from memory

- **Before ending a session, or after a batch of merges:** `./scripts/unmerged-work.sh`.
  Catches commits that exist only on this machine. `git branch --no-merged` cannot do this —
  squash-merging breaks ancestry, so it reports every merged branch as unmerged.
- **Before `terraform apply`:** read the plan's summary line. An unexpected non-zero *destroy*
  count means stop, not scroll past.
- **Before running `terraform plan` or `apply` against `envs/uat` or `envs/prod`:** confirm no
  CD run is currently deploying that same environment (`gh run list --workflow=cd.yml`). CD's
  own `deploy-environment` action applies Terraform as its first step; a manual apply landing in
  that window collides on the state lock. Terraform's locking fails one side cleanly rather than
  corrupting anything — but it still means a CD run has to be diagnosed and rerun for a reason
  that has nothing to do with the change it was deploying. Happened 2026-08-24. Enforced by
  `.claude/hooks/guard-terraform-during-cd.sh`, which **fails open** — if `gh` is unavailable or
  offline it allows the command, so this checkpoint still needs reading, not just trusting.
- **Before saying "verified":** name what you actually tested, and what you did not.

## Editing files

**Use `Edit` and `Write`.** They fail loudly on a stale assumption; `sed`, `perl -pi` and
python `str.replace` fail *silently*, exiting 0 having changed nothing — and have already
corrupted a file here.

The one exception: a bulk mechanical edit across many files may be scripted, but it **must**
assert every target and print a per-file result. Never a bare regex substitution in place.

## Whose decision is it

**Implementation is yours. Policy is the user's.** The test when unsure: *would they be
surprised to learn this was decided without them?* If yes, ask — even mid-task, even if it
slows you down.

**Theirs, always:**
- how environments relate to each other (what UAT does that prod does not, and why)
- removing or changing user-visible behaviour, including modes and options that look unused
- anything that ships new code to production, or creates data there
- reversing a decision already recorded in `spec/decisions/`, an `O`-thread or an issue

**Yours:** how to structure the code that carries out a decision already made.

Announcing a decision is not the same as making it jointly. "I decided X, flagging it so you can
overrule" still puts the burden on them to catch it — fine for a naming choice, wrong for
anything above.

Worked example, 2026-08-21: `feedback_mode = all` on UAT was set without asking. It reads like
configuration and it was policy — it made UAT differ from prod on the exact mechanism UAT exists
to test, so the grant path first ran for real in production, and a working feature looked broken.

## Run it locally before pushing

`pnpm dev` against the docker services. Real Google and SMTP credentials are available — see
`documentation/02_Local-Development-Setup.md`. A round trip through CI and CD is roughly fifteen
minutes; a local check is seconds. Anything a page load or an API call would reveal belongs in
the fast loop.

⚠️ **A green local run is not evidence about**: cookies and sessions (`localhost` shares cookies
across ports, which hid a missing cookie `Domain` until it reached a deployed environment),
`Secure`/`SameSite` (no HTTPS), build-time configuration (`pnpm dev` reads the environment at
runtime), or deployment machinery. Deploy for those; say which was actually checked.

Run the **integration** project too, not only unit tests — `--exclude "**/*.integration.spec.ts"`
is not "the tests pass".

For anything touching configuration, the Dockerfile, or how a per-environment value reaches the
browser, **build and run the image locally** (~3 min) before pushing. `pnpm dev` reads the
environment at runtime, so a value that was wrongly baked still looks correct there. Steps in
`documentation/02_Local-Development-Setup.md` → "Running the built image locally".

## Verification — how you may conclude something works

- **An empty result is not a pass.** State the observable you expect *before* running a check,
  then confirm you saw it. A grep that returns nothing has told you nothing: it cannot
  distinguish "absent" from "could not look". This has caused two false conclusions already.
- **Assert positively.** Check that the expected thing is present, not that a feared thing is
  absent.
- **Claim only what you actually tested.** `curl` ignores `SameSite` and does not enforce CORS.
  A 2xx does not prove a downstream side effect. A green `/ready` does not prove the tiers are
  wired to each other. Say plainly what remains unverified.
- **Prefer mechanism over memory.** If a rule can be a hook, a schema, a CI step or an
  assertion, make it one. When a rule keeps being broken *despite being written down*, the
  answer is a guard, not a louder rule — this file already said "anything build-time cannot vary
  per environment" while a build-time flag was silently disabling a feature in every deployed
  environment.
- **Verify with something that behaves like the thing you are claiming about.** A check run with
  a tool that does not share the user's constraints confirms the mechanism and misses the
  experience. Seven instances in three days, each green everywhere and broken in use:

  | Checked with | Proved | Missed |
  |---|---|---|
  | A 163-byte test PNG | credentials, round trip | every realistic file failed at a 100kb body limit |
  | The api test suite | api behaviour | 22 broken web tests, and the dead toast hook behind them |
  | `curl`, 200 + identical bytes | transport, authorisation | the browser refused to render it (CORP) |
  | `tsc` + 1176 tests + CI | types the compiler can see | `Request['user']` is an empty interface, so the wrong object typechecked |
  | RBAC probes on the runbook | the identity was *allowed* to act | the action itself was rejected — `maxReplicas: 0` is invalid, so compute never stopped |
  | `turbo run test` (cached) | that a previous run had passed | the web suite did not execute at all; CI caught the failure. Use `--force` |
  | Piping JSON into a hook command | the command works | the harness had never loaded the hook — wrong directory, and it never fired |

  Two of these are the same trap in different clothes: **a green result from something that did
  not run** (the cache) and **a green result from something that ran somewhere else** (the pipe).
  Before believing a pass, ask what would have had to execute for it to be true, and confirm that
  it did.

  Where a claim is about what a person sees, a person has to look — or the check has to run in
  the same place they do. If that is impossible, say so instead of substituting a convenient
  stand-in and reporting it as verification.

- **A completion record is a claim, not evidence.** Do not tick a task, close an issue or write
  "verified" for something you have not observed. And when you find a record that is false,
  **un-tick it** — work marked done is work nobody looks at again. Three in one day
  (2026-08-21): `O16` read "migration job built + proven" while it had never applied a single
  migration anywhere; `ui-ux-remediation` task 1.15 was ticked and absent from the code; #40 sat
  open while shipped and deployed.

## Write for the reader who was not in the room

Documents outlive the conversation that produced them. No load-bearing issue numbers, no
time-relative claims ("none exist today"), no incident narratives where a rule belongs, and never
confuse *not currently provisioned* with *not required* — a built feature has requirements either
way. Expand jargon at first use, or state the underlying requirement instead.

Audience decides how much shorthand is acceptable: `ops/` and `AGENTS.md` are read with the repo
open; anything a provider, lawyer or new maintainer might read must stand alone. Test: would this
still be correct, and still make sense, a year from now to someone who was not here?

Full version: `documentation/00_INDEX.md` → "Write for the reader who was not in the room".

## Before recording a fact — or filing work — search for what already covers it

```bash
grep -rn "<the superseded thing>" --include="*.md" .
gh issue list --search "<topic>" --state all
ls openspec/changes/            # including archive/
```

Reconcile every hit. A fact stated in two places will eventually be wrong in one of them — this
doc set has already contradicted itself 92 lines apart.

The same applies to **new work**: an issue or a proposal written without checking is usually a
duplicate of something better-informed. #121 was filed as "the app has no loader" while
`openspec/changes/ui-ux-remediation` had already built `Spinner`, `EmptyState` and
`QueryBoundary` and swept the route groups.

And when you do find prior work, read enough of it to describe it accurately. Generalising from
one narrow fact — "0 admin routes use `QueryBoundary`" — into a broad claim — "admin was never
swept" — points the follow-up at the wrong problem.

## Code

- TypeScript strict. No `any`, no `@ts-ignore`, no `as any`.
- Backend layering: **controller → service → repository → Prisma**, never skipped. Prisma is
  used *only* in repository files.
- The frontend is never a security boundary.
- No new dependency without updating `documentation/10_Platform-Engineering-Standard.md` first.
- Comment the **why**, never the what.
- **Anything build-time cannot vary per environment** — one image is promoted from UAT to prod
  unchanged. Ask: does this value describe the *image*, or *where it runs*? Only the former may
  be baked. (`documentation/21_Infrastructure-Conventions.md` §17.)

## Domain language

`spec/CONTEXT.md` is canonical. **vratarthi** not "user", **vratmitra** not "mentor",
**weakness** not "lacuna", **sentence** not "statement".

## Process

- Non-trivial features go through the **OpenSpec change lane** (proposal → design → tasks →
  spec deltas → implement → archive). Do not skip it.
- When asking a question, always give: the options considered, which you lean toward and why,
  why *not* each alternative, and what fact would change your recommendation.
