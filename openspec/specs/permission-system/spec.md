### Requirement: hasPermission function enforces RBAC+ABAC hybrid

The system SHALL provide a pure function `hasPermission(user, resource, action, context)` that evaluates whether the given `SessionUser` is permitted to perform `action` on `resource`. The function MUST return `true` only when all conditions are satisfied and MUST return `false` for all other cases (no default-allow). The function MUST NOT perform any I/O — all resource and relationship data MUST be passed in via the arguments.

#### Scenario: VA can create a journey (own action)
- **WHEN** a user with role VRATARTHI calls `hasPermission` with action `journey.create` and resource `{ type: 'platform' }`
- **THEN** the function returns `true`

#### Scenario: VM cannot create a journey
- **WHEN** a user with role VRATMITRA (but not VRATARTHI) calls `hasPermission` with action `journey.create`
- **THEN** the function returns `false`

#### Scenario: VA can view their own journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `journey.view` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VA cannot view another VA's journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `journey.view` and the journey's `vratarthiId` does NOT equal the user's `id`
- **THEN** the function returns `false`

#### Scenario: Journey VM can view their assigned journey
- **WHEN** a VRATMITRA user calls `hasPermission` with action `journey.view` and the journey has an ACTIVE `JourneyVmAssignment` with `vmId` equal to the user's `id`
- **THEN** the function returns `true`

#### Scenario: Journey VM cannot view an unassigned journey
- **WHEN** a VRATMITRA user calls `hasPermission` with action `journey.view` and the journey has no `JourneyVmAssignment` matching the user
- **THEN** the function returns `false`

#### Scenario: Global VM can view all journeys of their assigned VA
- **WHEN** a VRATMITRA user calls `hasPermission` with action `journey.view`, a global `VmRelationship` exists with `vmId` equal to the user's `id` and `state = ACTIVE`, and the journey belongs to the VA in that relationship
- **THEN** the function returns `true`

#### Scenario: VA can pause their own journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `journey.pause` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VM cannot pause a journey
- **WHEN** a VRATMITRA user calls `hasPermission` with action `journey.pause`
- **THEN** the function returns `false`

#### Scenario: VA can resume their own paused or dormant journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `journey.resume` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VA can submit their journey for completion
- **WHEN** a VRATARTHI user calls `hasPermission` with action `journey.complete` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: Assigned journey VM can approve journey completion
- **WHEN** a VRATMITRA user calls `hasPermission` with action `journey.complete` and is an ACTIVE journey VM for the journey
- **THEN** the function returns `true`

#### Scenario: VA can select ERC for their own journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `erc.select` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VM cannot select ERC
- **WHEN** a VRATMITRA user calls `hasPermission` with action `erc.select`
- **THEN** the function returns `false`

#### Scenario: Assigned VM can suggest ERC
- **WHEN** a VRATMITRA user calls `hasPermission` with action `erc.suggest` and is an ACTIVE journey VM for the journey
- **THEN** the function returns `true`

#### Scenario: VA cannot suggest ERC
- **WHEN** a VRATARTHI user calls `hasPermission` with action `erc.suggest`
- **THEN** the function returns `false`

#### Scenario: VA can self-approve ERC closure when no VM is assigned
- **WHEN** a VRATARTHI user calls `hasPermission` with action `erc.approve_closure`, the journey's `vratarthiId` equals the user's `id`, and `journey.vmAssignments` is empty (no active journey VM)
- **THEN** the function returns `true`

#### Scenario: VA cannot approve ERC closure when a VM is assigned
- **WHEN** a VRATARTHI user calls `hasPermission` with action `erc.approve_closure` and the journey has an ACTIVE journey VM assignment
- **THEN** the function returns `false`

#### Scenario: Assigned VM can approve ERC closure
- **WHEN** a VRATMITRA user calls `hasPermission` with action `erc.approve_closure` and is an ACTIVE journey VM for the journey
- **THEN** the function returns `true`

#### Scenario: VA can deactivate ERC in their own journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `erc.deactivate` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VM cannot deactivate ERC
- **WHEN** a VRATMITRA user calls `hasPermission` with action `erc.deactivate`
- **THEN** the function returns `false`

#### Scenario: VA can remove ERC from their own journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `erc.remove` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VA or assigned VM can create custom ERC
- **WHEN** a VRATARTHI user calls `hasPermission` with action `custom_erc.create` and is the journey owner, OR a VRATMITRA user is an ACTIVE journey VM
- **THEN** the function returns `true`

#### Scenario: VA or VM can submit custom ERC for review
- **WHEN** a VRATARTHI or VRATMITRA user calls `hasPermission` with action `custom_erc.submit_for_review` and has access to the journey
- **THEN** the function returns `true`

#### Scenario: VA can edit their own pre-submission custom ERC
- **WHEN** a VRATARTHI user calls `hasPermission` with action `custom_erc.edit` and the ERC `createdById` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VA cannot edit another user's custom ERC
- **WHEN** a VRATARTHI user calls `hasPermission` with action `custom_erc.edit` and the ERC `createdById` does NOT equal the user's `id`
- **THEN** the function returns `false`

#### Scenario: VA can take a test
- **WHEN** a VRATARTHI user calls `hasPermission` with action `test.take`
- **THEN** the function returns `true`

#### Scenario: VM cannot take a test
- **WHEN** a VRATMITRA user (without VRATARTHI role) calls `hasPermission` with action `test.take`
- **THEN** the function returns `false`

#### Scenario: VA can view their own test results
- **WHEN** a VRATARTHI user calls `hasPermission` with action `test.view_results` and the attempt's `userId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: Global VM can view test results of their assigned VA
- **WHEN** a VRATMITRA user calls `hasPermission` with action `test.view_results` and a global `VmRelationship` exists linking them to the test attempt's owner
- **THEN** the function returns `true`

#### Scenario: VA can create experience logs for their own journey
- **WHEN** a VRATARTHI user calls `hasPermission` with action `experience_log.create` and the journey's `vratarthiId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VM cannot create experience logs
- **WHEN** a VRATMITRA user (without VRATARTHI role) calls `hasPermission` with action `experience_log.create`
- **THEN** the function returns `false`

#### Scenario: VA can edit their own experience logs
- **WHEN** a VRATARTHI user calls `hasPermission` with action `experience_log.edit` and the log's `authorId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VA can delete their own experience logs
- **WHEN** a VRATARTHI user calls `hasPermission` with action `experience_log.delete` and the log's `authorId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: Any authenticated user can create a blog
- **WHEN** any user with role VRATARTHI or VRATMITRA calls `hasPermission` with action `blog.create`
- **THEN** the function returns `true`

#### Scenario: User can edit their own blog
- **WHEN** a user calls `hasPermission` with action `blog.edit` and the blog's `authorId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: User cannot edit another user's blog
- **WHEN** a user calls `hasPermission` with action `blog.edit` and the blog's `authorId` does NOT equal the user's `id`
- **THEN** the function returns `false`

#### Scenario: VA can send a VM invitation
- **WHEN** a VRATARTHI user calls `hasPermission` with action `vm_invitation.send`
- **THEN** the function returns `true`

#### Scenario: VM cannot send a VM invitation
- **WHEN** a VRATMITRA user (without VRATARTHI role) calls `hasPermission` with action `vm_invitation.send`
- **THEN** the function returns `false`

#### Scenario: Invitee VM can accept an invitation addressed to them
- **WHEN** a VRATMITRA user calls `hasPermission` with action `vm_invitation.accept` and the invitation's `inviteeId` equals the user's `id`
- **THEN** the function returns `true`

#### Scenario: VA cannot accept an invitation
- **WHEN** a VRATARTHI user (without VRATMITRA role) calls `hasPermission` with action `vm_invitation.accept`
- **THEN** the function returns `false`

#### Scenario: VA can cancel their own pending invitation
- **WHEN** a VRATARTHI user calls `hasPermission` with action `vm_invitation.cancel` and the invitation's `inviterId` equals the user's `id`
- **THEN** the function returns `true`

### Requirement: Layer 2 admin and moderator platform permissions

The system SHALL enforce platform-level permissions for ADMIN and MODERATOR roles. These permissions apply to acting *on* data (not as participants) and are role-based without ABAC scoping.

#### Scenario: Admin can view any journey
- **WHEN** a user with role ADMIN calls `hasPermission` with action `admin.view_any_journey` and resource `{ type: 'platform' }`
- **THEN** the function returns `true`

#### Scenario: Moderator cannot view any journey
- **WHEN** a user with role MODERATOR (without ADMIN) calls `hasPermission` with action `admin.view_any_journey`
- **THEN** the function returns `false`

#### Scenario: Admin can override journey state
- **WHEN** a user with role ADMIN calls `hasPermission` with action `admin.override_journey_state`
- **THEN** the function returns `true`

#### Scenario: Moderator cannot override journey state
- **WHEN** a user with role MODERATOR calls `hasPermission` with action `admin.override_journey_state`
- **THEN** the function returns `false`

#### Scenario: Admin and moderator can review custom ERC
- **WHEN** a user with role ADMIN or MODERATOR calls `hasPermission` with action `moderator.review_custom_erc`
- **THEN** the function returns `true`

#### Scenario: VA cannot review custom ERC (moderator action)
- **WHEN** a user with only VRATARTHI role calls `hasPermission` with action `moderator.review_custom_erc`
- **THEN** the function returns `false`

#### Scenario: Admin can manage taxonomy
- **WHEN** a user with role ADMIN calls `hasPermission` with action `admin.manage_taxonomy`
- **THEN** the function returns `true`

#### Scenario: Moderator cannot manage taxonomy
- **WHEN** a user with role MODERATOR calls `hasPermission` with action `admin.manage_taxonomy`
- **THEN** the function returns `false`

#### Scenario: Admin and moderator can manage display content
- **WHEN** a user with role ADMIN or MODERATOR calls `hasPermission` with action `moderator.manage_display_content`
- **THEN** the function returns `true`

#### Scenario: Admin can manage users
- **WHEN** a user with role ADMIN calls `hasPermission` with action `admin.manage_users`
- **THEN** the function returns `true`

#### Scenario: Moderator cannot manage users
- **WHEN** a user with role MODERATOR calls `hasPermission` with action `admin.manage_users`
- **THEN** the function returns `false`

#### Scenario: Admin and moderator can moderate comments
- **WHEN** a user with role ADMIN or MODERATOR calls `hasPermission` with action `comment.moderate`
- **THEN** the function returns `true`

### Requirement: PermissionGuard enforces authorization on decorated routes

The system SHALL provide a `PermissionGuard` that, when applied to a NestJS controller or route handler decorated with `@RequirePermission`, MUST: (1) verify a session exists (returning 401 if not), (2) resolve the resource via the decorator's resolver function, (3) call `hasPermission` with the resolved resource, and (4) throw `AccessDeniedException` (403) if permission is denied.

#### Scenario: Unauthenticated request to a guarded route returns 401
- **WHEN** a request arrives at a route decorated with `@RequirePermission` without a valid session cookie
- **THEN** the guard throws `SessionExpiredException` and the response status is 401

#### Scenario: Authenticated but unauthorized request returns 403
- **WHEN** a request arrives with a valid session for a user who does not have the required permission
- **THEN** the guard throws `AccessDeniedException` and the response status is 403

#### Scenario: Authorized request passes through
- **WHEN** a request arrives with a valid session for a user who has the required permission
- **THEN** the guard returns `true` and the route handler executes normally

### Requirement: RequirePermission decorator binds action and resolver to a route

The system SHALL provide a `@RequirePermission(action, resolver?)` decorator. When applied to a route handler, it MUST store the action string and optional resource resolver function in Reflector metadata so `PermissionGuard` can retrieve them.

#### Scenario: Decorator stores action in Reflector metadata
- **WHEN** `@RequirePermission('journey.view', resolver)` is applied to a route handler
- **THEN** `Reflector.get(PERMISSION_KEY, handler)` returns `{ action: 'journey.view', resolver }`

#### Scenario: Decorator without resolver defaults to platform resource
- **WHEN** `@RequirePermission('admin.manage_taxonomy')` is applied without a resolver
- **THEN** the guard resolves the resource as `{ type: 'platform' }` automatically
