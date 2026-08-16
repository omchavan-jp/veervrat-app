# Documentation Index

Engineering decisions, standards, and conventions for the Veervrat app. Files are
numbered by purpose so the reading order is obvious:

- **00–05 — Orientation & roadmap:** where things stand, how to run it, how to build it well.
- **10–29 — Standards & conventions:** the rules every implementation must follow.
- **90+ — Historical:** point-in-time records. **Frozen — never read as current state.**

> This is engineering documentation. **Product decisions** live in `../spec/` (see
> `../spec/SPEC_INDEX.md`); the **active spec-driven workflow** lives in `../openspec/`.

---

## 00–05 · Orientation & roadmap

| # | Document | What it's for |
|---|---|---|
| 00 | [INDEX](00_INDEX.md) | This file. |
| 01 | [System Decisions & Status](01_System-Decisions-and-Status.md) | Master list of all tech decisions and current status. **Read first at session start.** |
| 02 | [Local Development Setup](02_Local-Development-Setup.md) | How to run the app, services, and databases locally. |
| 03 | [Implementation Order](03_Implementation-Order.md) | 📌 **Historical** — the build plan, now complete. Kept for sequencing rationale; **not** a status document. |
| 04 | [Implementation Cautions & Principles](04_Implementation-Cautions-and-Principles.md) | Definition-of-Done, verification ladder, and generalized cautions. **Read before implementing any item.** |
| 05 | [Deferral Ledger](05_Deferral-Ledger.md) | Cross-item index of intentionally-deferred work + which item pays it back. **Scan for your item number before starting.** |

## 10–29 · Standards & conventions

| # | Document | What it's for |
|---|---|---|
| 10 | [Platform Engineering Standard](10_Platform-Engineering-Standard.md) | Approved library catalog, security baseline, numeric constants. **A library not listed here is not approved.** |
| 11 | [Backend Conventions](11_Backend-Conventions.md) | Layering, modules, naming, validation, errors, DB, logging. |
| 12 | [API Conventions](12_API-Conventions.md) | Routes, methods, response shapes, pagination. |
| 13 | [Frontend Conventions](13_Frontend-Conventions.md) | Routing, components, data fetching, forms, styling. |
| 14 | [Auth Architecture Decision](14_Auth-Architecture-Decision.md) | Auth, sessions, OAuth, CSRF, rate limiting, brute-force defense. |
| 15 | [Design System & Design Language](15_Design-System.md) | Principles, shell/nav, tokens, motion, component language, bilingual rendering. Merged with the former out-of-repo design-language doc. |
| 15a | [UI Consistency Rules](15a_UI-Consistency-Rules.md) | How to *apply* the tokens — exact classes, anti-drift rules. **Wins over 15 on class names.** |
| 16 | [Testing Strategy](16_Testing-Strategy.md) | What to test, auth-matrix tests, E2E flows. |
| 17 | [Audit Schema](17_Audit-Schema.md) | Audit event contract, mandatory events, `@Audited` pattern. |
| 18 | [Observability Standard](18_Observability-Standard.md) | Structured logging schema, error tracking, alert thresholds. ⚠️ Describes the target — not yet implemented (B13). |
| 19 | [Email Strategy](19_Email-Strategy.md) | Transactional vs notification email, templates, bilingual strategy. ⚠️ Coded, not wired. |
| 20 | [Solo-Dev Operations](20_Solo-Dev-Operations.md) | Feedback capture → triage (GitHub Issues) → implement → changelog/doc loop. |
| 21 | [Infrastructure Conventions](21_Infrastructure-Conventions.md) | Terraform, Azure, CD, deployment traps. **Read before touching `infra/`.** |

## 90+ · Historical — frozen records

These describe a moment, not the present. Each carries a banner saying so. **Do not update
them to match reality** — that destroys their value as a record; write current state in `01`
or `../ops/PROJECT-STATUS.md` instead.

| # | Document | Snapshot of |
|---|---|---|
| 90 | [Session Handoff — Auth Implementation](90_Session-Handoff-Auth-Implementation.md) | 2026-05-20 — how auth was built. Its "known issues" are all resolved. |
| 91 | [Production Readiness Audit](91_Production-Readiness-Audit.md) | 2026-07-01 — code-grounded audit taken *before* the Azure migration. |

---

### Related entry points
- **Product spec:** `../spec/SPEC_INDEX.md` — every product decision, ADRs, the 74 screen specs.
- **Agent context:** `../AGENTS.md` — hard rules, project layout, session discipline.
- **Project status:** `../ops/PROJECT-STATUS.md` — decisions register (`D`), open threads (`O`),
  backlog (`B`), working order. **The live status document.**
- **Azure reality:** `../ops/azure-account-facts.md` — what actually exists, plus the
  deployment traps table.
- **Live runbook:** `../DEPLOYMENT.md` — how to deploy, migrate, seed, and stand up a new
  environment from zero.
- **Active changes:** `../openspec/changes/` — in-flight spec-driven work.

### ⚠️ Reading status from these docs

Several files here are **historical** and say so in a banner at the top: `03` (build plan,
complete), `90` (May handoff), `91` (July audit). They describe a
moment, not the present. When a doc and reality disagree, reality wins and the doc is a bug —
fix it in the same session.

**Before recording a fact, grep for the fact it supersedes.** The 2026-08-16 review found `01`
asserting both "Sentry replaces GlitchTip" and "✅ Decided — GlitchTip" 92 lines apart, because
a correct new line was added without reconciling the old one.

> **Renaming convention:** when adding a doc, slot it into the right band (00–05 / 10–29 / 90+),
> drop version suffixes from the filename, use `Hyphenated-Title-Case.md`, and add a row here.
> Numbers are stable references — don't renumber an existing file without updating inbound links
> (`AGENTS.md`, `03_Implementation-Order.md`, and any `openspec/` specs that cite it).
