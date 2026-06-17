# Documentation Index

Engineering decisions, standards, and conventions for the Veervrat app. Files are
numbered by purpose so the reading order is obvious:

- **00–05 — Orientation & roadmap:** where things stand, how to run it, what to build next, how to build it well.
- **10–19 — Standards & conventions:** the rules every implementation must follow.
- **90+ — Historical handoffs:** point-in-time session notes, kept for context.

> This is engineering documentation. **Product decisions** live in `../spec/` (see
> `../spec/SPEC_INDEX.md`); the **active spec-driven workflow** lives in `../openspec/`.

---

## 00–05 · Orientation & roadmap

| # | Document | What it's for |
|---|---|---|
| 00 | [INDEX](00_INDEX.md) | This file. |
| 01 | [System Decisions & Status](01_System-Decisions-and-Status.md) | Master list of all tech decisions and current status. **Read first at session start.** |
| 02 | [Local Development Setup](02_Local-Development-Setup.md) | How to run the app, services, and databases locally. |
| 03 | [Implementation Order](03_Implementation-Order.md) | The build sequence — per-item research directives and session prompts. |
| 04 | [Implementation Cautions & Principles](04_Implementation-Cautions-and-Principles.md) | Definition-of-Done, verification ladder, and generalized cautions. **Read before implementing any item.** |
| 05 | [Deferral Ledger](05_Deferral-Ledger.md) | Cross-item index of intentionally-deferred work + which item pays it back. **Scan for your item number before starting.** |

## 10–19 · Standards & conventions

| # | Document | What it's for |
|---|---|---|
| 10 | [Platform Engineering Standard](10_Platform-Engineering-Standard.md) | Approved library catalog, security baseline, numeric constants. **A library not listed here is not approved.** |
| 11 | [Backend Conventions](11_Backend-Conventions.md) | Layering, modules, naming, validation, errors, DB, logging. |
| 12 | [API Conventions](12_API-Conventions.md) | Routes, methods, response shapes, pagination. |
| 13 | [Frontend Conventions](13_Frontend-Conventions.md) | Routing, components, data fetching, forms, styling. |
| 14 | [Auth Architecture Decision](14_Auth-Architecture-Decision.md) | Auth, sessions, OAuth, CSRF, rate limiting, brute-force defense. |
| 15 | [Design System](15_Design-System.md) | Color tokens, typography, spacing, dark mode, component states. |
| 16 | [Testing Strategy](16_Testing-Strategy.md) | What to test, auth-matrix tests, E2E flows. |
| 17 | [Audit Schema](17_Audit-Schema.md) | Audit event contract, mandatory events, `@Audited` pattern. |
| 18 | [Observability Standard](18_Observability-Standard.md) | Structured logging schema, error tracking, alert thresholds. |
| 19 | [Email Strategy](19_Email-Strategy.md) | Transactional vs notification email, templates, bilingual strategy. |

## 90+ · Historical handoffs

| # | Document | What it's for |
|---|---|---|
| 90 | [Session Handoff — Auth Implementation](90_Session-Handoff-Auth-Implementation.md) | Point-in-time handoff notes from the auth build. Historical. |

---

### Related entry points
- **Product spec:** `../spec/SPEC_INDEX.md` — every product decision, ADRs, the 74 screen specs.
- **Agent context:** `../CLAUDE.md` — hard rules, project layout, session discipline.
- **Active changes:** `../openspec/changes/` — in-flight spec-driven work.

> **Renaming convention:** when adding a doc, slot it into the right band (00–05 / 10–19 / 90+),
> drop version suffixes from the filename, use `Hyphenated-Title-Case.md`, and add a row here.
> Numbers are stable references — don't renumber an existing file without updating inbound links
> (`CLAUDE.md`, `03_Implementation-Order.md`, and any `openspec/` specs that cite it).
