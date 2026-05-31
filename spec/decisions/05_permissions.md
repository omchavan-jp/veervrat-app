# Permissions & Scoping
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### Authorization Philosophy
- **Check permissions, not roles.** Code never checks `user.role === 'admin'`. It always checks `hasPermission(user, resource, action, context)`.
- **RBAC + ABAC hybrid:** RBAC assigns role-level permissions (admin, moderator, VA, VM). ABAC handles resource-scoped checks — "is this VM assigned to this journey?", "is this VA the owner of this journey?" Pure RBAC cannot express these without hardcoded conditionals.
- **Permission naming convention:** `resource.action` dot notation. Lowercase, always resource first. Examples: `journey.view`, `journey.complete`, `erc.suggest`, `erc.select`, `challenge.approve`, `custom_erc.submit_for_review`.
- **One central definition point:** all permission logic lives in a single `hasPermission(user, resource, action, context)` function (or equivalent guard/policy layer). No scattered role checks in controllers or templates.
- **Context objects, not IDs:** permission checks receive the full resource object (journey, ERC entity, etc.) so attribute inspection is possible — e.g. `journey.va_id === user.id`. This is required for ABAC to work correctly.
- **Dynamic DB-backed permission UI:** out of scope for v1. Permission definitions are code-based, not admin-configurable at runtime.

### Roles (grouping labels only)
- **admin**: platform management layer. Can view any data, override journey state in emergencies.
- **moderator**: reviews submitted custom ERC (with full submitter context); manages display content on app screens (shlokas etc — detail TBD). No journey state access.
- **vratarthi (VA)**: owns their journeys, tests, experience logs. Scoped access only.
- **vratmitra (VM)**: scoped access only — sees journeys they are explicitly assigned to, nothing else.
- A user can hold multiple roles simultaneously. Both layers evaluate independently via `hasPermission`.

### Two Permission Layers

#### Layer 1 — User-side permissions (participant actions)
VA and VM acting as participants. A user who is also admin holds these only for their own journeys as VA/VM — not for others'.

| Permission | VA (own) | VM (assigned journey) |
|---|---|---|
| `journey.create` | ✅ | ❌ |
| `journey.view` | ✅ own | ✅ assigned only (journey VM) / ✅ all VA's journeys (global VM) |
| `journey.pause` | ✅ own | ❌ |
| `journey.complete` | ✅ own (submit) | ✅ assigned (approve) |
| `erc.select` | ✅ own journey | ❌ |
| `erc.suggest` | ❌ | ✅ assigned journey |
| `erc.approve_closure` | ✅ self-only (no VM present) | ✅ assigned journey |
| `custom_erc.create` | ✅ own journey | ✅ assigned journey |
| `custom_erc.submit_for_review` | ✅ | ✅ |
| `test.take` | ✅ | ❌ |
| `test.view_results` | ✅ own | ✅ assigned VA only |
| `chat.view` | ✅ own | ✅ assigned journey |
| `chat.send` | ✅ own | ✅ assigned journey |
| `experience_log.create` | ✅ own journey | ❌ |
| `experience_log.view` | ✅ own | ✅ assigned journey |
| `vm_invitation.send` | ✅ | ❌ |
| `vm_invitation.accept` | ❌ | ✅ (the invitee) |

#### Layer 2 — Platform permissions (admin/moderator actions)
Acting *on* data, not *as* participants.

| Permission | Admin | Moderator |
|---|---|---|
| `admin.view_any_journey` | ✅ full contents | ❌ |
| `admin.view_any_user` | ✅ | ❌ |
| `admin.view_any_test_result` | ✅ | ❌ |
| `admin.override_journey_state` | ✅ emergency only, audit-logged | ❌ |
| `admin.view_chat` | TBD | ❌ |
| `admin.manage_content` | ✅ | ❌ |
| `admin.manage_users` | ✅ | ❌ |
| `admin.view_platform_stats` | ✅ | ❌ |
| `moderator.review_custom_erc` | ✅ | ✅ (with submitter profile + journey context) |
| `moderator.manage_display_content` | ✅ | ✅ (shlokas, screen sections — detail TBD) |

### Scoping Rules
- **Global VM**: sees all of a VA's journeys, test results, experience logs — full picture. When also assigned as journey VM for a specific journey, their role in that journey is to interact specifically around it, but their view scope remains global.
- **Journey-level VM only** (not global VM): sees only the journey(s) they are explicitly assigned to. Nothing else.
- A VA can have both simultaneously: one global VM (full view) and one or more journey-level VMs (scoped view per journey).
- VM role alone (without assignment) grants nothing.
- VA test results visible to: VA (own), global VM, journey VMs (for their assigned journey's relevant tests), admin. Not moderators.
- Chat: private between VA and VM. Admin access TBD.
- `admin.override_journey_state` is an emergency escape hatch — all uses audit-logged.

## Open Questions (area-specific)
- `admin.view_chat` — always-on vs. explicit logged audit action — TBD
- VA privacy controls over VM — **none**. Everything in a journey is visible to the assigned VM by default. No hiding mechanism.
- Moderator display content management — exact scope TBD (covered when app screen sections are specced)

## Flags
- ⚠ ABAC requires full resource objects in permission checks — backend must not pass only IDs.
- ⚠ `admin.override_journey_state` must be audit-logged without exception — treat as a hard invariant.
