# Spec Index
_Last updated: 2026-05-31_

## Domain Glossary
`spec/CONTEXT.md` — canonical terms: vratarthi, vratmitra, weakness, virtue, subvirtue, sentence, test, journey, exposure, resolution, challenge, ERC, global vratmitra, journey vratmitra, custom ERC, VM sidenote, experience log, ERC status

## ADRs
- [0001-sentence-as-journey-anchor.md](adr/0001-sentence-as-journey-anchor.md) — sentence (not weakness/subvirtue) is the atomic journey anchor
- [0002-erc-directly-on-sentence.md](adr/0002-erc-directly-on-sentence.md) — ERC attaches directly to sentence; no intermediate plan entity

## Status
| Area | Status | Last Round | File |
|------|--------|------------|------|
| User Roles | 🔄 In Progress | R1 | decisions/01_user-roles.md |
| Data Model | 🔄 In Progress | R2 | decisions/02_data-model.md |
| Flows | 🔄 In Progress | R6 | decisions/03_flows.md |
| Lifecycle States | 🔄 In Progress | R2 | decisions/04_lifecycle.md |
| Permissions | 🔄 In Progress | R4 | decisions/05_permissions.md |
| Edge Cases | 🔄 In Progress | R1 | decisions/06_edge-cases.md |
| Integrations & Constraints | ✅ Confirmed | R2 | decisions/07_integrations.md |
| Out of Scope | ✅ Confirmed | R1 | decisions/08_out-of-scope.md |
| Guest Access | ✅ Confirmed | R1 | decisions/09_guest-access.md |
| Public Profile | 🔄 In Progress | R1 | decisions/10_public-profile.md |
| Platform Stats | ✅ Confirmed | R1 | decisions/11_platform-stats.md |
| Onboarding | ✅ Confirmed | R2 | decisions/12_onboarding.md |
| User Search & Invitations | ✅ Confirmed | R2 | decisions/13_user-search.md |
| Global Experience Logging | ✅ Confirmed | R2 | decisions/14_experience-logging.md |

## Open Questions (consolidated)
- Moderator permissions vs. admin — User Roles — R1
- VM philosophy note placement — User Roles — R5
- Chat sharing with admin (anonymised/opt-in) — Flows — R5
- Duplicate custom ERC flagging mechanic — Flows — R5

## Deferred Items
- Vratmitra verification/credibility mechanism — must resolve before v1 ships — R1
- Suggestion algorithm enhancement — major future initiative, not v1 — R3

## ADRs
- [0001](adr/0001-sentence-as-journey-anchor.md) — sentence is the atomic journey anchor
- [0002](adr/0002-erc-directly-on-sentence.md) — ERC attaches directly to sentence
- [0003](adr/0003-rbac-abac-hybrid.md) — RBAC + ABAC hybrid permission model

## ⚠ Active Flags
- "No hierarchy display" vs. "credibility mechanism" — User Roles — unresolved
- v1 suggestion logic must be architected for future swap — Flows — R3
- VM sidenote acknowledgement nullification on revocation — Flows — R5
- Pending approval queue on mid-journey VM change — Flows — R5
- Duplicate custom ERC submissions flagging — Flows — R5
- Dormant state requires background scheduler — Lifecycle — R1
- Journey ERC union filter must re-evaluate dynamically on weakness attachment — Lifecycle — R1
