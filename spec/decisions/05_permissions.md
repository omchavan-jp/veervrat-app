# Permissions & Scoping
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### Authorization Philosophy
- **Check permissions, not roles.** Code never checks `user.role === 'admin'`. It always checks `hasPermission(user, resource, action)`.
- **RBAC + ABAC hybrid:** RBAC assigns role-level permissions (admin, moderator, VA, VM). ABAC handles resource-scoped checks — "is this VM assigned to this journey?", "is this VA the owner of this journey?" Pure RBAC cannot express these without hardcoded conditionals.
- **Permission naming convention:** `resource.action` dot notation. Lowercase, always resource first. Examples: `journey.view`, `journey.complete`, `erc.suggest`, `erc.select`, `challenge.approve`, `custom_erc.submit_for_review`.
- **One central definition point:** all permission logic lives in a single `hasPermission(user, resource, action)` function (or equivalent guard/policy layer). No scattered role checks in controllers or templates.
- **Context objects, not IDs:** permission checks receive the full resource object (journey, ERC entity, etc.) so attribute inspection is possible — e.g. `journey.va_id === user.id`. This is required for ABAC to work correctly.
- **Signature is 3-arg** (`hasPermission(user, resource, action)`): the ABAC context is folded into the discriminated-union `resource` (each variant carries the slim fields the check inspects) rather than passed as a separate 4th `context` param. This avoids dual-channel ambiguity. Implemented in `apps/api/src/common/permissions/`.
- **Dynamic DB-backed permission UI:** out of scope for v1. Permission definitions are code-based, not admin-configurable at runtime.

### Roles (grouping labels only)
- **admin**: platform management layer. Can view any data, override journey state in emergencies.
- **moderator**: reviews submitted custom ERC (sees: ERC content, submitter profile, journey title, sentence, subvirtue/virtue, weakness tags — not journey contents); can edit the ERC proposal (wording, Marathi translation, tags); manages display content. No journey state or contents access.
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
| `journey.resume` | ✅ own (paused/dormant) | ❌ |
| `erc.deactivate` | ✅ own journey | ❌ |
| `erc.remove` | ✅ own journey (permanent) | ❌ |
| `weakness.attach` | ✅ own journey | ❌ (VM can suggest, not attach) |
| `challenge.configure_threshold` | ✅ own journey (VM notified) | ✅ assigned journey (can modify VA's setting) |
| `experience_log.edit` | ✅ own entries | ❌ |
| `experience_log.delete` | ✅ own entries | ❌ |
| `custom_erc.edit` | ✅ own (pre-submission) | ✅ own (pre-submission) |
| `custom_erc.delete` | ✅ own (pre-submission) | ✅ own (pre-submission) |
| `blog.create` | ✅ | ✅ |
| `blog.edit` | ✅ own | ✅ own |
| `blog.delete` | ✅ own | ✅ own |
| `comment.create` | ✅ | ✅ |
| `comment.delete` | ✅ own | ✅ own |
| `comment.hide` | ✅ own blog's comments | ✅ own blog's comments |
| `comment.report` | ✅ | ✅ |
| `follow.create` | ✅ | ✅ |
| `follow.remove` | ✅ own follows | ✅ own follows |
| `vm_invitation.send` | ✅ | ❌ |
| `vm_invitation.accept` | ❌ | ✅ (the invitee) |
| `vm_invitation.cancel` | ✅ (own pending invites) | ❌ |
| `vm_invitation.decline` | ❌ | ✅ (as invitee) |
| `vm_relationship.withdraw` | ❌ | ✅ (own assignments) |
| `global_vm.view_va_guidance` | ❌ | ✅ (assigned VA only, global VM only) |
| `feedback.create` | ✅ (any authenticated user) | ✅ (any authenticated user) |
| `feedback.read` | ✅ (any authenticated user) | ✅ (any authenticated user) |
| `feedback.upvote` | ✅ (any authenticated user, one per item) | ✅ (any authenticated user, one per item) |

#### Layer 2 — Platform permissions (admin/moderator actions)
Acting *on* data, not *as* participants.

| Permission | Admin | Moderator |
|---|---|---|
| `admin.view_any_journey` | ✅ full contents | ❌ |
| `admin.view_any_user` | ✅ | ❌ |
| `admin.view_any_test_result` | ✅ | ❌ |
| `admin.override_journey_state` | ✅ emergency only, audit-logged | ❌ |
| `admin.view_chat` | ❌ (v1 — chat permanently private) | ❌ |
| `admin.manage_content` | ✅ | ❌ |
| `admin.manage_users` | ✅ (role assignment, account suspension, forced anonymisation, email verification override) | ❌ |
| `admin.view_platform_stats` | ✅ | ❌ |
| `moderator.review_custom_erc` | ✅ | ✅ (submitter profile + journey title + sentence + subvirtue/virtue + weakness tags on journey. No journey contents, logs, or ERC status.) |
| `moderator.manage_display_content` | ✅ | ✅ (shlokas, screen sections, sidebar curation) |
| `admin.manage_taxonomy` | ✅ | ❌ (virtues, subvirtues, weaknesses — admin only) |
| `admin.manage_pothi` | ✅ | ❌ (Pothi sections — admin only) |
| `admin.manage_shlokas` | ✅ | ❌ (shlokas CRUD — admin only) |
| `admin.manage_resources` | ✅ | ❌ (resources CRUD — admin only) |
| `comment.moderate` | ✅ | ✅ (hide or delete any comment) |
| `feedback.manage` | ✅ (status lifecycle NEW→TRIAGED→DONE/DECLINED; DECLINED requires reason; audit-logged) | ❌ |

#### Special — allowlist-gated (not role-based)
Acting on platform copy through the dev-only in-context content editor.

| Permission | Granted to |
|---|---|
| `content.edit` | Only users holding the `CONTENT_EDIT` capability (`user_capabilities`, granted from `/admin/users/[id]`). **Not** implied by any role, including admin (least privilege for an outside content editor). The environment must also allow it: refused outright when `ENVIRONMENT=prod` (O7), so a grant that could never take effect cannot be issued. Enforced via `hasPermission(user, { type: 'platform', grants, featureMode }, 'content.edit')`; publish actions are audit-logged. Was an env allowlist (`CONTENT_EDITOR_USER_IDS`) until 2026-08-21 — see conventions §23. |

### Scoping Rules
- **Global VM**: sees all of a VA's journeys, test results, experience logs — full picture. When also assigned as journey VM for a specific journey, their role in that journey is to interact specifically around it, but their view scope remains global.
- **Journey-level VM only** (not global VM): sees only the journey(s) they are explicitly assigned to. Nothing else.
- A VA can have both simultaneously: one global VM (full view) and one or more journey-level VMs (scoped view per journey).
- VM role alone (without assignment) grants nothing.
- VA test results visible to: VA (own), global VM, journey VMs (for their assigned journey's relevant tests), admin. Not moderators.
- Chat: permanently private between VA and VM. Admin cannot view chat (v1).
- `admin.override_journey_state` is an emergency escape hatch — all uses audit-logged.

- **`admin.view_chat`:** admin cannot view any chat (v1). Chat is permanently private between VA and VM.
- **Chat data for research:** out of scope for v1. Deferred to future version.

## Open Questions (area-specific)
_(none — area closed)_

## Flags
- ⚠ ABAC requires full resource objects in permission checks — backend must not pass only IDs.
- ⚠ `admin.override_journey_state` must be audit-logged without exception — treat as a hard invariant.
