# Spec Index
_Last updated: 2026-06-01_

## Domain Glossary
`spec/CONTEXT.md` — canonical terms: vratarthi, vratmitra, weakness, virtue, subvirtue, sentence, test, journey, exposure, resolution, challenge, ERC, global vratmitra, journey vratmitra, custom ERC, VM sidenote, experience log, ERC status, dormant, paused, pool-sourced ERC, challenge suggestion threshold, VM invitation, invite token, display name, username, follow, permission

## ADRs
- [0001](adr/0001-sentence-as-journey-anchor.md) — sentence is the atomic journey anchor
- [0002](adr/0002-erc-directly-on-sentence.md) — ERC attaches directly to sentence
- [0003](adr/0003-rbac-abac-hybrid.md) — RBAC + ABAC hybrid permission model

## Status
| Area | Status | Last Round | File |
|------|--------|------------|------|
| User Roles | ✅ Confirmed | R2 | decisions/01_user-roles.md |
| Data Model | ✅ Confirmed | R2 | decisions/02_data-model.md |
| Flows | ✅ Confirmed | R6 | decisions/03_flows.md |
| Lifecycle States | ✅ Confirmed | R3 | decisions/04_lifecycle.md |
| Permissions | ✅ Confirmed | R5 | decisions/05_permissions.md |
| Edge Cases | ✅ Confirmed | R2 | decisions/06_edge-cases.md |
| Integrations & Constraints | ✅ Confirmed | R2 | decisions/07_integrations.md |
| Out of Scope | ✅ Confirmed | R1 | decisions/08_out-of-scope.md |
| Guest Access | ✅ Confirmed | R1 | decisions/09_guest-access.md |
| Public Profile | ✅ Confirmed | R2 | decisions/10_public-profile.md |
| Platform Stats | ✅ Confirmed | R1 | decisions/11_platform-stats.md |
| Onboarding | ✅ Confirmed | R2 | decisions/12_onboarding.md |
| User Search & Invitations | ✅ Confirmed | R2 | decisions/13_user-search.md |
| Global Experience Logging | ✅ Confirmed | R3 | decisions/14_experience-logging.md |
| VA Dashboard | ✅ Confirmed | R2 | decisions/15_dashboard.md |
| Content Pages & Cultural Elements | ✅ Confirmed | R2 | decisions/16_content-pages.md |
| Moderation & Display Content | ✅ Confirmed | R2 | decisions/17_moderation.md |
| My Vratmitras & Chat | ⬜ Not Started | — | — |
| Pothi Redesign | ⬜ Not Started | — | — |
| Virtue-First Reorientation | ⬜ Not Started | — | — |

## Open Questions (consolidated)
- Follow feed / activity stream — what does a follower see? — Public Profile — deferred to community round
- Score preview format on test submission — Dashboard — implementation detail TBD
- Custom ERC review UI layout — Moderation — implementation detail TBD

## Deferred Items
- **Vratmitra credibility mechanism** — resolved: neutral count "Guided X journeys to completion" on VM profile
- **Suggestion algorithm enhancement** — major future initiative, not v1
- **Chat data for research** — deferred to future version
- **Duplicate custom ERC detection** — deferred to future version
- **Follow feed / activity stream** — deferred to community/social spec round

## ⚠ Active Flags (implementation reminders)
- v1 suggestion logic must be architected for future swap — Flows
- VM sidenote acknowledgement nullification on revocation — Flows
- Pending approval queue on mid-journey VM change — Flows
- Dormant state requires background scheduler — Lifecycle/Integrations
- Journey ERC union filter must re-evaluate dynamically — Lifecycle
- ABAC requires full resource objects in permission checks — Permissions
- `admin.override_journey_state` must be audit-logged — Permissions
- `approved` ERC state is terminal — no rollback path — Edge Cases
- Global pool ERC deletion guard — check active journey usage first — Edge Cases
- Taxonomy is admin-only — no API endpoint for non-admin taxonomy creation — Moderation
- Virtue-first reorientation pending — do not implement weakness-primary tagging until resolved
