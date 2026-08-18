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
- Feature branches are **kept** after merging, never deleted.
- Conventional commits. `main` must always be releasable.
- Merging to `main` deploys **UAT**. Production ships only by pushing a `prod-YYYY-MM-DD` tag.

## Checkpoints — run these at the trigger, not from memory

- **Before ending a session, or after a batch of merges:** `./scripts/unmerged-work.sh`.
  Catches commits that exist only on this machine. `git branch --no-merged` cannot do this —
  squash-merging breaks ancestry, so it reports every merged branch as unmerged.
- **Before `terraform apply`:** read the plan's summary line. An unexpected non-zero *destroy*
  count means stop, not scroll past.
- **Before saying "verified":** name what you actually tested, and what you did not.

## Editing files

**Use `Edit` and `Write`.** They fail loudly on a stale assumption; `sed`, `perl -pi` and
python `str.replace` fail *silently*, exiting 0 having changed nothing — and have already
corrupted a file here.

The one exception: a bulk mechanical edit across many files may be scripted, but it **must**
assert every target and print a per-file result. Never a bare regex substitution in place.

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
  assertion, make it one.

## Before recording a fact, search for the fact it replaces

```bash
grep -rn "<the superseded thing>" --include="*.md" .
```

Reconcile every hit. A fact stated in two places will eventually be wrong in one of them —
this doc set has already contradicted itself 92 lines apart.

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
