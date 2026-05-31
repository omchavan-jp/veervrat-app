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
- **admin**: full access to all resources and actions.
- **moderator**: subset of admin — at minimum, reviews submitted custom ERC. Exact permission set TBD.
- **vratarthi (VA)**: owns their journeys, tests, experience logs. Scoped access only.
- **vratmitra (VM)**: scoped access only — sees journeys they are explicitly assigned to, nothing else.
- A user can hold multiple roles simultaneously.

### Scoping Rules (confirmed so far)
- VM can only view/act on journeys they are **assigned to**. Having the VM role alone grants no journey access.
- A VA's test results are visible to: the VA, their assigned VMs (for the relevant journeys), and admin. Not moderators, not other VAs.

## Open Questions (area-specific)
- Full moderator permission set vs. admin — TBD
- Can admin see chat content by default, or only on explicit override/audit action?
- VA privacy controls — can a VA restrict what their VM sees (e.g. hide experience log entries)?

## Flags
- ⚠ ABAC requires full resource objects in permission checks — backend must not pass only IDs. Enforce in service layer conventions.
