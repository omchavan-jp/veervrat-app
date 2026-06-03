# Audit Schema — v1

## Purpose
Every privileged action in Veervrat must leave an immutable audit trail. This document defines the event contract, mandatory events, and retention policy.

---

## Audit Event Entity

```
audit_event
├── id              UUID, PK
├── actor_id        UUID, FK → user (nullable — system events have no actor)
├── action          TEXT (enum-like — see catalog below)
├── resource_type   TEXT (entity name: 'journey', 'user', 'custom_erc', etc.)
├── resource_id     UUID (nullable — some actions are not on a specific resource)
├── metadata        JSONB (action-specific context — varies per event type)
├── ip_address      TEXT
├── user_agent      TEXT
├── created_at      TIMESTAMP
```

- No `updated_at` or `deleted_at` — audit events are **append-only, never modified or deleted**
- Separate table from application data — never soft-deleted, never truncated
- Not a Prisma soft-delete entity — hard retention

---

## Mandatory Events (v1)

### Admin actions
| Action | Resource type | Metadata |
|---|---|---|
| `admin.override_journey_state` | journey | `{ from_state, to_state, reason }` |
| `admin.manage_user_role` | user | `{ role_added_or_removed, role_name }` |
| `admin.suspend_user` | user | `{ reason }` |
| `admin.force_anonymise` | user | `{ reason }` |
| `admin.force_logout` | user | `{ session_ids_invalidated }` |
| `admin.manage_taxonomy_create` | virtue/subvirtue/weakness | `{ entity_name }` |
| `admin.manage_taxonomy_edit` | virtue/subvirtue/weakness | `{ fields_changed }` |
| `admin.manage_taxonomy_delete` | virtue/subvirtue/weakness | `{ entity_name }` |
| `admin.manage_shloka` | shloka | `{ action: create/edit/delete }` |
| `admin.manage_pothi` | pothi_section | `{ action: create/edit/delete }` |
| `admin.manage_resource` | resource | `{ action: create/edit/delete }` |

### Moderator actions
| Action | Resource type | Metadata |
|---|---|---|
| `moderator.approve_custom_erc` | custom_erc | `{ original_submitter_id, edits_made: bool }` |
| `moderator.reject_custom_erc` | custom_erc | `{ reason }` |
| `moderator.edit_custom_erc` | custom_erc | `{ fields_changed }` |
| `moderator.hide_comment` | blog_comment | `{ blog_id, reason }` |
| `moderator.delete_comment` | blog_comment | `{ blog_id }` |
| `moderator.feature_blog` | blog | `{ featured_location: sidebar }` |
| `moderator.feature_experience` | experience_log | `{ featured_location: sidebar }` |

### Auth events
| Action | Resource type | Metadata |
|---|---|---|
| `auth.login_success` | user | `{ method: credentials/google }` |
| `auth.login_failure` | — | `{ email, reason }` |
| `auth.logout` | user | `{}` |
| `auth.password_change` | user | `{}` |
| `auth.password_reset_request` | — | `{ email }` |
| `auth.account_lockout` | — | `{ email, duration_minutes: 15 }` |

### Account lifecycle
| Action | Resource type | Metadata |
|---|---|---|
| `account.delete_request` | user | `{}` |
| `account.anonymised` | user | `{ pseudonymous_token }` |

---

## Retention
- **Minimum 1 year** — no auto-purge in v1
- Audit events are queryable by admin via an admin dashboard endpoint
- Future: archive to cold storage after 1 year if volume requires

## Implementation
- Audit logging is a **cross-cutting concern** — implemented as a NestJS interceptor or decorator, not inline in service methods
- Pattern: `@Audited('action_name')` decorator on controller methods, interceptor captures actor, resource, and metadata automatically
- Auth failure logging is in the auth guard/service layer (not controller)
- All audit writes are **fire-and-forget** (async, non-blocking) — audit write failure must not block the user's request
