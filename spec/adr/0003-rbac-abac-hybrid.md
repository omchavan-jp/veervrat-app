# RBAC + ABAC hybrid permission model

Authorization uses RBAC for role-level grouping and ABAC for resource-scoped decisions. Permission checks always receive the full resource object (not just an ID) so attribute inspection works correctly — e.g. "is this VM assigned to this specific journey?" Pure RBAC cannot express journey-scoped or relationship-scoped access without hardcoded conditionals scattered across the codebase.

## Considered Options
- **Pure RBAC** — rejected because it cannot express "VM can view this journey only if assigned to it" without coupling role checks to resource attributes in every caller.
- **Pure ABAC** — rejected because roles (admin, moderator, VA, VM) are a natural, stable grouping that would be redundantly re-derived from attributes everywhere.
