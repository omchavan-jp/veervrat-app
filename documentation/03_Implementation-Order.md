# Implementation Order

> 📌 **HISTORICAL — this was the build plan, and the build is done. Do not read the
> checkmarks as status.**
>
> Only 7 of 37 items below carry a `✅ DONE` marker, because marking them was abandoned once
> the pace picked up. **All 37 are implemented** — verified 2026-08-16 against the code (30
> API modules exist, including permissions, i18n, journeys, ERC, chat, experience logs and
> admin) and against `openspec/changes/archive/`, which holds **35 archived changes**. The
> Deferral Ledger also references Items 30–37 as complete.
>
> A reader trusting the markers would conclude the app is at item 3 of 37. It is deployed.
>
> **For actual status, read:**
> - `01_System-Decisions-and-Status.md` — what is built and what is decided
> - `../ops/PROJECT-STATUS.md` — open threads, backlog, working order
> - `openspec/changes/archive/` — the real record of what shipped
>
> Kept for the sequencing rationale and the per-item "Read first" lists, which are still
> useful when revisiting an area. The `/opsx:propose` session prompts are spent.
>
> ⚠️ Its process instructions are also stale: it says "squash merge to **dev**". `dev` is
> retired — `main` is the trunk (O6). See `../CLAUDE.md` → Git conventions.

_Written 2026-06-03. Superseded as a status document 2026-08-16._

Two tiers:
- **[FULL]** — OpenSpec full cycle: propose → apply (with tests) → code-review → archive
- **[DIRECT]** — Direct fix, no propose needed. Under ~20 lines, follows established pattern.

Spec refs use shorthand: `spec/05` = `spec/decisions/05_permissions.md`, `doc/auth` = `documentation/14_Auth-Architecture-Decision.md`, etc.

**How to use this document in a new session:**
1. Copy the item's **Session prompt** block below — paste it as your first message
2. The session prompt already contains the research directive — do not skip it
3. After implement: `/code-review` → fix → commit → squash merge to dev → `/opsx:archive`

> **Before implementing any item from here on, read `documentation/04_Implementation-Cautions-and-Principles.md`.**
> It defines the feature Definition-of-Done and the verification ladder. An item is not
> "done" until each applicable Definition-of-Done dimension is *verified* (build + tests +
> end-to-end), not assumed. This applies to every [FULL] and [DIRECT] item below.

---

## TIER 1 — Infrastructure & Identity (do these before any feature)

### 1. Testing infrastructure setup [FULL] ✅ DONE
Branch: `chore/test-setup` (merged to dev)

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Set up Vitest for NestJS backend (unit + integration), Vitest + React Testing Library for Next.js frontend, and Playwright for E2E. Follow documentation/16_Testing-Strategy.md exactly. Configure: vitest.config.ts for both apps, test DB setup (separate veervrat_test DB via docker-compose), supertest integration, first smoke test verifying the DB connection works."
```

**Implement:** `vitest.config.ts` (api + web), test DB in docker-compose, supertest helper, first passing smoke test.
**Read first:** `doc/Testing-Strategy`, `doc/Platform-Engineering-Standard`, `doc/Backend Conventions`

---

### 2. NestJS app foundation [FULL] ✅ DONE
Branch: `feat/api-foundation` (merged to dev)

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Set up NestJS app foundation: global exception filter, response interceptor (wrapping all responses in { data }), correlation ID middleware, Pino structured logging, ConfigModule with validation, PrismaModule (global), health check endpoint at GET /api/health. Follow documentation/11_Backend-Conventions.md, documentation/18_Observability-Standard.md, documentation/12_API-Conventions.md."
```

**Implement:** `AppModule`, `PrismaModule`, global filter, interceptor, correlation middleware, Pino logger, health endpoint.
**Read first:** `doc/Backend Conventions`, `doc/API Conventions`, `doc/Observability-Standard`, `doc/Platform-Engineering-Standard`

---

### 3. Permission system (ABAC/RBAC layer) [FULL]
Branch: `feat/permission-system`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the hasPermission(user, resource, action, context) function and PermissionGuard for NestJS. This is the ABAC+RBAC hybrid described in spec/decisions/05_permissions.md and spec/adr/0003-rbac-abac-hybrid.md. The function must: accept full resource objects (not IDs), check both role-level (Layer 1/Layer 2) and relationship-scoped permissions (e.g. is this VM assigned to this journey?). Write auth matrix tests: one positive + one negative test per permission row in spec/decisions/05_permissions.md."
```

**Implement:** `common/permissions/has-permission.ts`, `PermissionGuard`, `@RequirePermission()` decorator, auth matrix test suite.
**Read first:** `spec/05`, `spec/adr/0003`, `spec/01`, `doc/Backend Conventions`, `doc/Testing-Strategy`

---

### 4. Auth module — complete [FULL]
Branch: `feat/auth-complete`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Complete the auth module. Backend: (1) CSRF double-submit cookie middleware — on session creation, set non-HttpOnly csrf-token cookie; NestJS guard validates X-CSRF-Token header matches cookie on all state-changing routes. (2) Rate limiting via @nestjs/throttler per the limits in documentation/10_Platform-Engineering-Standard.md numeric constants table. (3) Account lockout — 10 failed login attempts within 1 hour locks account for 15 minutes, stored in Redis. (4) Fix completeOnboarding endpoint to accept username + displayName + language. (5) Wire Resend email sending — EmailModule with console fallback for dev. Frontend: delete all existing auth pages and reimplement login, signup, forgot-password, reset-password, verify-email per spec/decisions/27_screen-specs.md auth section. All pages use next-intl for strings. Signup collects displayName, username (live uniqueness check), email, password, language. Follow documentation/14_Auth-Architecture-Decision.md sections 15-16."
```

**Implement:** CSRF middleware + guard, throttler config, Redis lockout, EmailModule (Resend + console), updated onboarding DTO, all frontend auth pages rebuilt.
**Read first:** `doc/auth`, `doc/Email-Strategy`, `doc/Platform-Engineering-Standard` (numeric constants), `spec/12` (onboarding), `spec/26` (account settings), `spec/27` (auth screens), `doc/Frontend Conventions`, `doc/Testing-Strategy`

---

### 5. i18n setup [FULL]
Branch: `feat/i18n-setup`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Set up next-intl for the Next.js frontend. Follow documentation/10_Platform-Engineering-Standard.md i18n section. Requirements: middleware.ts for locale detection from user session, getRequestConfig loading messages from apps/web/messages/{locale}.json, no URL-based routing, language applied at layout level via NextIntlClientProvider. Create en.json and mr.json with all auth screen strings as the first set of message keys. Add a language toggle component. Refer to spec/decisions/26_account-settings.md for language setting location."
```

**Implement:** `middleware.ts`, `i18n.ts`, `messages/en.json`, `messages/mr.json` (auth strings), `NextIntlClientProvider` in root layout, language toggle component.
**Read first:** `doc/Platform-Engineering-Standard` (i18n section), `doc/Frontend Conventions`, `spec/12` (onboarding language step), `spec/26` (settings language section)

---

### 6. Design system tokens + base components [FULL]
Branch: `feat/design-system`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the design system from documentation/15_Design-System.md. Tasks: (1) Update apps/web/app/globals.css with all CSS custom properties — light mode and dark mode tokens (color, radius, shadow, animation timing). (2) Implement dark mode toggle using next-themes, persisted in localStorage + user preference DB field. (3) Audit existing shadcn/ui components (button, input, card, label, alert, separator) against the component states spec in documentation/15_Design-System.md — add missing states (error, loading, disabled). (4) Add Geist Sans, Geist Mono, Newsreader, Tiro Devanagari fonts via next/font in apps/web/app/fonts.ts. (5) Add Framer Motion to the project."
```

**Implement:** CSS tokens (light + dark), `next-themes` dark mode, font setup, shadcn component state updates, Framer Motion install.
**Read first:** `doc/Design-System`, `doc/Platform-Engineering-Standard`, `doc/Frontend Conventions`, `spec/20` (design philosophy)

---

## TIER 2 — Content Data & User Foundation

### 7. User module [FULL]
Branch: `feat/user-module`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the User module (NestJS). This is distinct from auth — auth handles identity, user module handles profile data. Routes needed: GET /api/v1/users/:username (public profile — respects privacy settings from spec/decisions/10_public-profile.md), PATCH /api/v1/users/me (update own profile fields), GET /api/v1/users/me (current user full profile). Username uniqueness check endpoint: GET /api/v1/users/check-username?username=X. Follow spec/decisions/10_public-profile.md for what fields are public vs private. Follow spec/decisions/05_permissions.md Layer 1 for scoping."
```

**Implement:** `UsersModule`, `UsersController`, `UsersService`, `UsersRepository`, public profile DTO, privacy field filtering.
**Read first:** `spec/10`, `spec/05`, `spec/26`, `spec/27` (profile screens), `doc/Backend Conventions`, `doc/API Conventions`

---

### 8. Content data seeding [FULL]
Branch: `chore/content-seed`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Create a database seeder that imports the Veervrat content from the CMS CSV files in data/cms/data/. Seed: virtues, subvirtues, weaknesses, weakness_subvirtue links (with priority), sentences, exposures, resolutions, challenges, exposure/resolution/challenge weakness tags, sentence_erc_meta (source_file, notes). The seeder should be idempotent (safe to run multiple times) and live at apps/api/src/database/seed.ts. Reference data/cms/seed.py and data/cms/seed_erc.py for the CSV structure and seeding logic."
```

**Implement:** `seed.ts`, run it, verify row counts in DB.
**Read first:** `spec/02` (data model), `data/cms/seed.py`, `data/cms/seed_erc.py`, `data/cms/data/*.csv`

---

### 9. Onboarding flow — backend + frontend [FULL]
Branch: `feat/onboarding`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the full 3-layer onboarding flow from spec/decisions/12_onboarding.md. Backend: update POST /auth/complete-onboarding to accept { displayName, username, language, gender?, dob? } — validate username uniqueness, update user record. Frontend: (1) Account setup page — collect displayName, username (live check), language preference, optional gender/dob. (2) Framework onboarding — two-section page: What is Veervrat + Process Chart (admin-managed content, hardcode placeholder for now). (3) Final CTA: take test now or explore app. Gate the dashboard behind onboarding completion. Refer to spec/decisions/27_screen-specs.md onboarding screens."
```

**Implement:** Updated onboarding DTO + endpoint, onboarding pages (3 screens), completion guard on dashboard route.
**Read first:** `spec/12`, `spec/27` (onboarding screens), `doc/auth`, `doc/Frontend Conventions`

---

## TIER 3 — Core Features (dependency order)

### 10. Study flow — weakness browse + test [FULL]
Branch: `feat/study-flow`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the Study flow (Flow 1 from spec/decisions/03_flows.md). Backend routes: GET /api/v1/weaknesses (list all with cluster grouping), GET /api/v1/weaknesses/:id (detail with subvirtues), POST /api/v1/tests (create draft test attempt for a weakness), PATCH /api/v1/tests/:id/answers (save answers — supports partial, draft model), POST /api/v1/tests/:id/submit (submit test, marks as completed), GET /api/v1/tests/:id/report (test report with scored sentences). Frontend: weakness browser, weakness detail, test question screen (one-at-a-time default + view-all toggle per spec/decisions/27_screen-specs.md), submission preview, report reveal (peak moment — animate progressively). Test scoring: Always=4, Often=3, Sometimes=2, Never=1 per spec/decisions/23_test-scoring.md."
```

**Implement:** `WeaknessesModule`, `TestsModule`, weakness list/detail endpoints, test CRUD, report endpoint, all test flow frontend screens.
**Read first:** `spec/03`, `spec/23`, `spec/15` (dashboard stats), `spec/21` (virtue-first report framing), `spec/27` (test screens 1a/1b/1c), `doc/Backend Conventions`, `doc/API Conventions`, `doc/Testing-Strategy`

---

### 11. Journey module — core [FULL]
Branch: `feat/journey-core`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement Journey core. Backend: POST /api/v1/journeys (create journey from sentence, attach weakness context, enforce one-per-sentence constraint from spec/decisions/04_lifecycle.md), GET /api/v1/journeys/:id (journey detail with status summary), PATCH /api/v1/journeys/:id/state (pause/resume/submit-for-completion), GET /api/v1/journeys (list own journeys). Permission checks per spec/decisions/05_permissions.md Layer 1 — journey.create, journey.view, journey.pause, journey.complete. Frontend: journey Status Overview tab, journey header (title, sentence, subvirtue→virtue, weakness tags, state indicator). Follow spec/decisions/27_screen-specs.md journey screens."
```

**Implement:** `JourneysModule`, journey CRUD, state machine (not_started→active→paused→dormant→completed), Status Overview frontend tab.
**Read first:** `spec/03`, `spec/04`, `spec/05`, `spec/27` (journey screens 2), `doc/Backend Conventions`, `doc/Testing-Strategy`

---

### 12. ERC selection + status tracking [FULL]
Branch: `feat/erc-selection`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement ERC selection within journeys. Backend: POST /api/v1/journeys/:id/exposures (select pool exposure for journey), PATCH /api/v1/journeys/:id/exposures/:eid/status (update ERC status — not_started→in_progress→submitted, revisit transitions), POST /api/v1/journeys/:id/exposures/:eid/deactivate, POST /api/v1/journeys/:id/exposures/:eid/reactivate. Same pattern for resolutions and challenges. ERC pool shown = union filter (journey weaknesses ∩ ERC weakness tags) per spec/decisions/02_data-model.md and spec/adr/0008. Frontend: Exposures, Resolutions, Challenges tabs per spec/decisions/27_screen-specs.md screen 3."
```

**Implement:** Journey ERC endpoints (select, status update, deactivate/reactivate), ERC union filter query, frontend E/R/C tabs.
**Read first:** `spec/02`, `spec/03`, `spec/04`, `spec/05`, `spec/adr/0008`, `spec/27` (screen 3), `doc/Backend Conventions`, `doc/Testing-Strategy`

---

### 13. Resolution check-ins [FULL]
Branch: `feat/resolution-checkins`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement resolution check-in logging. Backend: POST /api/v1/journeys/:id/resolutions/:rid/checkins (log a check-in: done/partial/missed + optional note), GET /api/v1/journeys/:id/resolutions/:rid/checkins (list check-ins with streak calculation). Follow spec/decisions/24_resolution-tracking.md — streak = consecutive done check-in submissions, calendar gaps don't break it. Frontend: Log check-in inline form on resolution card, check-in history expandable list, streak count display."
```

**Implement:** `ResolutionCheckinsController/Service/Repository`, streak calculation, frontend check-in UI.
**Read first:** `spec/24`, `spec/27` (screen 3 resolutions), `doc/Backend Conventions`

---

### 14. VM relationship system [FULL]
Branch: `feat/vm-relationships`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the VM relationship system. Backend: POST /api/v1/invitations (send VM or platform invitation — creates invite token, sends email via EmailModule), POST /api/v1/invitations/:token/accept, POST /api/v1/invitations/:token/decline, DELETE /api/v1/invitations/:id (cancel). VmRelationship CRUD: assign global VM, remove global VM (triggers migration payload — decide what to cascade), assign journey VM, remove journey VM. Permission checks: vm_invitation.send, vm_invitation.accept, vm_invitation.cancel, vm_invitation.decline. Follow spec/decisions/13_user-search.md invitation spec and spec/decisions/04_lifecycle.md VM relationship lifecycle."
```

**Implement:** `InvitationsModule`, `VmRelationshipsModule`, invite token generation, email sending, accept/decline/cancel flows, VM migration payload for global VM swap.
**Read first:** `spec/04`, `spec/05`, `spec/13`, `spec/01`, `doc/Email-Strategy`, `doc/Backend Conventions`, `doc/Testing-Strategy`

---

### 15. ERC approval flow (VM) [FULL]
Branch: `feat/erc-approval`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement VM approval flow for ERC items and journey completion. Backend: POST /api/v1/journeys/:id/exposures/:eid/approve, POST /api/v1/journeys/:id/exposures/:eid/revisit (VM returns for rework). Same for resolutions and challenges. POST /api/v1/journeys/:id/complete/approve (VM approves journey completion). Self-approve paths when no VM assigned. Permission checks per spec/decisions/05_permissions.md: erc.approve_closure scoped to assigned journey VM only. Trigger notification events on each approval/revisit. Follow spec/decisions/04_lifecycle.md ERC state machine and spec/adr/0006."
```

**Implement:** ERC approval/revisit endpoints, journey completion approval, self-approve paths, notification triggers.
**Read first:** `spec/04`, `spec/05`, `spec/adr/0006`, `spec/25` (notification events), `doc/Backend Conventions`, `doc/Testing-Strategy`

---

### 16. VM suggestions + sidenotes [FULL]
Branch: `feat/vm-suggestions`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement VM ERC suggestions and sidenotes. Backend: POST /api/v1/journeys/:id/exposures/:eid/suggest (VM suggests pool ERC to VA, creates VmSidenote), DELETE /api/v1/journeys/:id/exposures/:eid/suggest (VM unuggests — revokes sidenote, nullifies VA acknowledgement per spec/decisions/03_flows.md sidenote revocation rule). POST /api/v1/journeys/:id/exposures/:eid/sidenote/acknowledge (VA acknowledges sidenote). Permission: erc.suggest — VM assigned to journey only. Frontend: VM suggestion highlight on ERC pool card, sidenote display + acknowledge/dismiss on active ERC card."
```

**Implement:** Suggestion/un-suggest endpoints, VmSidenote create/revoke, acknowledge endpoint, frontend sidenote UI.
**Read first:** `spec/03`, `spec/05`, `doc/Backend Conventions`

---

### 17. Custom ERC [FULL]
Branch: `feat/custom-erc`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement custom ERC creation within journeys. Backend: POST /api/v1/journeys/:id/exposures/custom (VA or VM creates custom exposure for journey), same for resolutions and challenges. PATCH /api/v1/journeys/:id/exposures/:eid (edit custom ERC pre-submission). POST /api/v1/journeys/:id/exposures/:eid/submit-for-review (submit custom ERC to moderator queue — creates a review record). Custom ERC follows same status lifecycle as pool ERC. Permission: custom_erc.create, custom_erc.edit, custom_erc.submit_for_review per spec/decisions/05_permissions.md."
```

**Implement:** Custom ERC create/edit endpoints, submit-for-review endpoint, moderator review queue model.
**Read first:** `spec/03`, `spec/05`, `spec/17` (moderation), `doc/Backend Conventions`

---

### 18. Notification system [FULL]
Branch: `feat/notifications`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the notification system from spec/decisions/25_notifications.md. Backend: NotificationsModule with NotificationService.create(recipient, eventType, resourceType, resourceId, actorId). GET /api/v1/notifications (paginated, cursor-based), PATCH /api/v1/notifications/:id/read, POST /api/v1/notifications/read-all. 90-day soft-archive background job (@nestjs/schedule). All notification events from spec/decisions/25_notifications.md table must trigger NotificationService.create — wire into auth, invitations, ERC approval, journey completion, VM suggestions. Frontend: bell icon with unread count badge, notification panel, mark read."
```

**Implement:** `NotificationsModule`, create/list/mark-read endpoints, archive cron job, bell icon + panel frontend, wire all event triggers.
**Read first:** `spec/25`, `spec/04`, `spec/27` (notification panel implied in screen specs), `doc/Backend Conventions`, `doc/Observability-Standard`

---

## TIER 4 — Community & Content Features

### 19. Dashboard (VA) [FULL]
Branch: `feat/va-dashboard`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the VA dashboard. Backend: GET /api/v1/dashboard/stats (personal stats: virtues/subvirtues being cultivated derived from active journey sentences, journeys active/completed, ERC counts, weaknesses explored/tests taken), GET /api/v1/dashboard/suggestions (lowest-scored sentences from latest test per weakness, v1 algorithm). Frontend: stats bar (virtue-first primary per spec/decisions/21_virtue-first-reorientation.md), Path card 01 (Study), Path card 02 (Work), sentence suggestions section with journey start CTA, right sidebar (shloka of the day placeholder, platform stats). Follow spec/decisions/15_dashboard.md."
```

**Implement:** Dashboard stats endpoint, suggestion algorithm (lowest-score v1), dashboard page with all sections.
**Read first:** `spec/15`, `spec/21`, `spec/11` (platform stats), `spec/27` (dashboard screen), `doc/Backend Conventions`

---

### 20. My Vratmitras + Chat [FULL]
Branch: `feat/my-vratmitras-chat`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement My Vratmitras page and persistent chat. Backend: GET /api/v1/vm-relationships/my-vms (list of VA's VMs with scope and journey assignments), WebSocket Gateway (NestJS) for chat — authenticate via session cookie on handshake, room per VA-VM pair, message sequencing, missed-message catch-up via GET /api/v1/chats/:roomId/messages?after=seqNo. Image upload endpoint: POST /api/v1/uploads/chat (10MB max, images only, store in MinIO). Follow documentation/10_Platform-Engineering-Standard.md WebSocket contract. Frontend: My Vratmitras two-panel page per spec/decisions/27_screen-specs.md screen 6, chat thread view, entity reference chips (@/@# inline)."
```

**Implement:** VM list endpoint, NestJS WebSocket Gateway, chat message persistence, image upload to MinIO, My Vratmitras frontend, chat thread frontend.
**Read first:** `spec/18`, `spec/adr/0004`, `spec/05`, `spec/27` (screens 6 + chat), `doc/Platform-Engineering-Standard` (WebSocket + upload sections), `doc/Backend Conventions`

---

### 21. Actions page (VA) + VM guidance page [FULL]
Branch: `feat/actions-guidance`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the Actions page (VA) and VM guidance page. Backend: GET /api/v1/actions (VA's pending items: ERC in revisit, VM suggestions awaiting decision, items in submitted state, new ERC available, journey closure pending — aggregated query), GET /api/v1/vm-actions (VM's pending items: closure requests, journey completion requests, suggestion status updates, custom ERC review status). Frontend: /actions page per spec/decisions/27_screen-specs.md screen 4, /vratmitra/guidance page per screen 5. Both use the same component patterns but different data sources."
```

**Implement:** Actions and VM-actions aggregation endpoints, both frontend pages.
**Read first:** `spec/22`, `spec/27` (screens 4 + 5), `spec/05`, `doc/Backend Conventions`

---

### 22. Experience logging [FULL]
Branch: `feat/experience-logging`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement global experience logging. Backend: POST /api/v1/experience-logs (create — Tiptap JSON body, draft model, visibility tier, entity tags), PATCH /api/v1/experience-logs/:id (edit — visibility, body, tags), DELETE /api/v1/experience-logs/:id (soft delete), GET /api/v1/experience-logs (own list + public pool). Rich text stored as jsonb per documentation/10_Platform-Engineering-Standard.md. Sanitize with sanitize-html server-side before write. Image uploads via POST /api/v1/uploads/experience (max 5 × 10MB, MinIO). Frontend: experience log editor (Tiptap), draft save model, visibility toggle, entity tag selector, published entry view."
```

**Implement:** `ExperienceLogsModule`, CRUD endpoints, rich text sanitization, image upload, Tiptap editor frontend, draft model.
**Read first:** `spec/14`, `spec/05`, `spec/27` (experience log screens), `doc/Platform-Engineering-Standard` (rich text + upload), `doc/Backend Conventions`

---

### 23. Public profile [FULL]
Branch: `feat/public-profile`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the public VA profile. Backend: GET /api/v1/users/:username/profile (public fields only, respecting per-field privacy toggles from spec/decisions/10_public-profile.md — toggled-off fields absent entirely, not null). GET /api/v1/users/:username/experience-logs (public experience entries for this user). POST /api/v1/users/:username/follow, DELETE /api/v1/users/:username/follow. Credibility stat: guided journeys count for users who have acted as VM. Frontend: public profile page per spec/decisions/27_screen-specs.md, follow button, presence indicators (last active, online dot)."
```

**Implement:** Public profile endpoint, follow/unfollow, credibility stat, public experience entries, profile page frontend.
**Read first:** `spec/10`, `spec/13`, `spec/05`, `spec/27` (profile screens), `doc/Backend Conventions`

---

### 24. User search + invitations UI [FULL]
Branch: `feat/user-search`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement user search and the invitation UI flows. Backend: GET /api/v1/users/search?q= (fuzzy name/username, exact full email — Meilisearch users index). Meilisearch indexing: index users on create/update, filter is_public=true. Frontend: search results page, user search within VM invitation flow (from My Vratmitras → invite → search → select → confirm scope), invitation pending status list, resend reminder (one allowed), cancel pending invite."
```

**Implement:** Search endpoint, Meilisearch user index + sync, invitation UI flow.
**Read first:** `spec/13`, `spec/07` (Meilisearch), `doc/Platform-Engineering-Standard` (search architecture), `doc/Backend Conventions`

---

### 25. Blog system [FULL]
Branch: `feat/blogs`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement community blogs. Backend: POST /api/v1/blogs (create — Tiptap JSON body, draft model), PATCH /api/v1/blogs/:id (edit own), DELETE /api/v1/blogs/:id (soft delete own), GET /api/v1/blogs (published list — paginated cursor), GET /api/v1/blogs/:id (single blog + comments). Comments: POST /api/v1/blogs/:id/comments, DELETE /api/v1/blogs/:id/comments/:cid (own comment or blog author or moderator), POST /api/v1/blogs/:id/comments/:cid/report. Sanitize rich text. Frontend: blog list, blog detail + comments, blog editor with Tiptap."
```

**Implement:** `BlogsModule`, CRUD + comments endpoints, rich text sanitization, blog list/detail/editor frontend.
**Read first:** `spec/16`, `spec/05`, `spec/27` (blog screens), `doc/Platform-Engineering-Standard` (rich text), `doc/Backend Conventions`

---

## TIER 5 — Content Management & Admin

### 26. Virtues & Weaknesses browser [FULL]
Branch: `feat/virtues-browser`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the Virtues & Weaknesses browser per spec/decisions/21_virtue-first-reorientation.md. Backend routes already partially exist (weaknesses). Add: GET /api/v1/virtues (list), GET /api/v1/virtues/:id (detail + subvirtues), GET /api/v1/subvirtues/:id (detail + weaknesses it tackles + sentences). Frontend: Virtues & Weaknesses browser page with two sections, virtue detail page, subvirtue detail page, sentence info modal (view only, CTAs to test flow — no journey start direct). Guest accessible — no auth required."
```

**Implement:** Virtue/subvirtue detail endpoints, browser + detail pages frontend, sentence info modal.
**Read first:** `spec/21`, `spec/09` (guest access), `spec/27` (virtues browser screens), `doc/Backend Conventions`

---

### 27. Audit logging [DIRECT]
Branch: `feat/audit-logging`

```
git checkout -b feat/audit-logging dev
# Implement @Audited() decorator in NestJS following documentation/17_Audit-Schema.md.
# Apply to all admin/moderator actions listed in the mandatory events table.
# Fire-and-forget writes to audit_events table. No OpenSpec needed — pattern is straightforward.
```

**Read first:** `doc/Audit-Schema`, `doc/Backend Conventions`

---

### 28. Moderation — custom ERC review [FULL]
Branch: `feat/moderation-erc`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the moderation custom ERC review panel. Backend: GET /api/v1/moderation/custom-erc (pending review queue, paginated), GET /api/v1/moderation/custom-erc/:id (review detail — ERC content + submitter profile + journey title + sentence + subvirtue/virtue + weakness tags), POST /api/v1/moderation/custom-erc/:id/approve (with optional edits — saves moderator edits then adds to global pool), POST /api/v1/moderation/custom-erc/:id/reject (mandatory reason). All actions audit-logged. Notify submitters. Permission: moderator.review_custom_erc. Frontend: moderation queue + review panel per spec/decisions/27_screen-specs.md."
```

**Implement:** Moderation ERC endpoints, approval pipeline, rejection with reason, audit logging, notification triggers, frontend review panel.
**Read first:** `spec/17`, `spec/05`, `doc/Audit-Schema`, `spec/25` (notification events), `spec/27` (moderation screens), `doc/Backend Conventions`

---

### 29. Content pages (Pothi, Shlokas, Resources) [FULL]
Branch: `feat/content-pages`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the three distinct content pages per spec/decisions/19_pothi-redesign.md and spec/adr/0007. Backend: GET /api/v1/pothi/sections (list Pothi sections with shlokas), GET /api/v1/shlokas (searchable — Meilisearch shlokas index), GET /api/v1/shlokas/:id, GET /api/v1/resources (list), GET /api/v1/resources/:id. Shloka of the day: GET /api/v1/shlokas/today (checks shloka_schedules for today's date, falls back to queue). All guest-accessible. Frontend: Pothi page, Shlokas library page, Shloka detail modal (with formal + loose tags), Resources page per spec/decisions/27_screen-specs.md content page screens."
```

**Implement:** Pothi/Shlokas/Resources endpoints, Meilisearch shlokas index, shloka-of-the-day logic, all content frontend pages.
**Read first:** `spec/19`, `spec/adr/0007`, `spec/16`, `spec/09` (guest), `spec/07` (search), `spec/27` (content screens), `doc/Backend Conventions`

---

### 30. Admin content management [FULL]
Branch: `feat/admin-content`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement admin content management panels. Taxonomy CRUD: POST/PATCH/DELETE /api/v1/admin/virtues, /subvirtues, /weaknesses, /weakness-subvirtues. Shloka management: POST/PATCH/DELETE /api/v1/admin/shlokas, /api/v1/admin/shlokas/schedule (date scheduling), /api/v1/admin/shlokas/queue (reorder). Pothi section management: CRUD /api/v1/admin/pothi/sections. Resource management: CRUD /api/v1/admin/resources. All admin-only, all audit-logged. Frontend: admin dashboard + management panels per spec/decisions/27_screen-specs.md admin screens."
```

**Implement:** All admin CRUD endpoints for content entities, shloka scheduling + queue, admin frontend panels.
**Read first:** `spec/17`, `spec/19`, `spec/05`, `doc/Audit-Schema`, `spec/27` (admin screens), `doc/Backend Conventions`

---

### 31. Admin user management [FULL]
Branch: `feat/admin-users`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement admin user management. Backend: GET /api/v1/admin/users (list all users with roles, paginated), GET /api/v1/admin/users/:id (full profile including all journeys, test results — read only), PATCH /api/v1/admin/users/:id/roles (assign/remove roles), POST /api/v1/admin/users/:id/suspend, POST /api/v1/admin/users/:id/force-logout (invalidate all sessions), POST /api/v1/admin/users/:id/anonymise (account deletion — pseudonymous ID, soft delete, retain content). Override journey state: PATCH /api/v1/admin/journeys/:id/state (emergency only, requires reason, audit-logged). All actions audit-logged. Frontend: admin user list + detail view per spec/decisions/27_screen-specs.md."
```

**Implement:** Admin user endpoints, role management, suspension, force logout, anonymisation flow, journey state override, frontend admin user views.
**Read first:** `spec/05`, `spec/06` (edge cases — anonymisation), `spec/01`, `doc/Audit-Schema`, `spec/27` (admin screens), `doc/Backend Conventions`

---

## TIER 6 — Settings, Polish & E2E

### 32. Account settings [FULL]
Branch: `feat/account-settings`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement account settings page. Backend: PATCH /api/v1/users/me/settings (update language, privacy toggles, notification preferences, show_last_active, show_online_indicator, profile_private). PATCH /api/v1/users/me/password (change password — requires current password). POST /api/v1/auth/request-email-change (sends verification to new email), POST /api/v1/auth/confirm-email-change (token from email). DELETE /api/v1/users/me (account deletion — re-auth required, triggers anonymisation). Frontend: settings page all 6 sections per spec/decisions/27_screen-specs.md and spec/decisions/26_account-settings.md."
```

**Implement:** Settings endpoints, password change, email change flow, account deletion, all settings page sections.
**Read first:** `spec/26`, `spec/05`, `spec/06` (edge cases), `doc/auth`, `spec/27` (settings screens), `doc/Backend Conventions`

---

### 33. Platform stats (cached) [DIRECT] ✅ DONE
Branch: `feat/platform-stats`

```
git checkout -b feat/platform-stats dev
# Implement GET /api/v1/stats/platform — cached in Redis (60-minute TTL per spec/decisions/11_platform-stats.md).
# Returns: vratarthi count, vratmitra count, tests solved, practice-days completed.
# Wire into dashboard right sidebar. Guest accessible.
# Direct — straightforward endpoint + Redis cache, no OpenSpec needed.
```

**Read first:** `spec/11`, `doc/Platform-Engineering-Standard` (numeric constants), `doc/Backend Conventions`

---

### 34. Dormant journey detection [DIRECT] ✅ DONE
Branch: `feat/dormant-detection`

```
git checkout -b feat/dormant-detection dev
# @nestjs/schedule cron job: runs daily at 02:00.
# Queries journeys where state=ACTIVE and updatedAt < 30 days ago.
# Updates state to DORMANT, sets dormant_since.
# Triggers JOURNEY_DORMANT notification to VA and assigned VM.
# Direct — single cron job file, no OpenSpec needed.
```

**Read first:** `spec/04` (lifecycle — dormant trigger = 30 days), `spec/25` (JOURNEY_DORMANT notification), `doc/Platform-Engineering-Standard` (scheduler)

---

### 35. E2E test suite [FULL] ✅ DONE
Branch: `feat/e2e-tests`

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first" below, then inspect current state of files the change will touch. Only then run the propose command.

/opsx:propose "Implement the 10 critical E2E flows from documentation/16_Testing-Strategy.md using Playwright. Set up Playwright config, test fixtures (seed test DB before each suite), and implement all 10 flows: (1) signup→onboarding→test→report, (2) journey start→ERC select→check-in, (3) VM invitation→accept→suggest ERC→VA accepts→submit→VM approves, (4) non-platform VM invite→signup via link→accept, (5) global VM swap migration, (6) custom ERC→review→approve, (7) blog create→comment→hide→moderator delete, (8) admin override journey state→verify audit log, (9) guest browse→soft prompt→signup, (10) draft test→resume→complete."
```

**Implement:** Playwright config, test fixtures, all 10 E2E flows.
**Read first:** `doc/Testing-Strategy`, `spec/27` (all relevant screens), `doc/Platform-Engineering-Standard`
**Depends on:** Items 36 & 37 must be built first — E2E flow (5) "global VM swap migration" exercises Item 37, and flows assert email/notification side-effects covered by Item 36.

---

> **Items 36–37 were added 2026-06-18** to pay back deferral-ledger rows #30 and #31 (spec'd but originally absent from this order file). **Build order:** 36 → 37 → 34 → 35. They are numbered after 35 only because this list is append-only; their dependency note above governs sequencing.

### 36. Notification email delivery [DIRECT] ✅ DONE
Branch: `feat/notification-email`
Pays back: Deferral Ledger #30 (spec/25 specs per-event email; Item 18 built notifications in-app only — `EmailService.sendNotification` is never called; Item 32 stored opt-out prefs but nothing reads them).

```
git checkout -b feat/notification-email dev
# Centralize email delivery in NotificationsService.create: for the emailable events (the ✅
#   rows in spec/25 = the EMAILABLE_EVENTS allowlist already in users/notification-prefs.ts),
#   after writing the in-app notification, look up the recipient (email, language,
#   notificationPrefs) and — if isEmailEnabled(prefs, event) and the recipient is active
#   (not deleted/suspended) — fire EmailService.sendNotification (fire-and-forget, never
#   blocks the request).
# One bilingual NotificationEmail template (EN/MR per recipient.language) parameterised by
#   event → subject + body + a deep link (FRONTEND_URL + resource path). In-app-only events
#   (❌ rows) and chat (per-VM, spec/18) are never emailed.
# Direct — one template + delivery seam in the notifications service; no schema change.
```

**Read first:** `spec/25` (email-default column = the ✅ events), `doc/19_Email-Strategy`, `apps/api/src/modules/users/notification-prefs.ts`, existing `apps/api/src/modules/email/` templates + `EmailService.sendNotification`

---

### 37. Global VM change/migration + Restart tour [FULL] ✅ DONE
Branch: `feat/global-vm-migration`
Pays back: Deferral Ledger #31 (Account-settings Section 5 — spec/26 §5; cascade rules now pinned in spec/26 R2).

```
**RESEARCH PHASE — do this before anything else:**
Read every file listed under "Read first", then inspect vm-relationships + journeys modules and the settings page. Only then propose.

/opsx:propose "Implement Account Settings Section 5 (Vratmitra settings) per spec/26 R2. Backend: extend global-VM removal into a change/migration flow with an explicit cascade choice (keep | unassign) over the outgoing VM's journey assignments (spec/04: pending approvals left pending); 'change' = remove + send a fresh global invite (explicit acceptance, no silent reassignment); notify outgoing VM + VA via VM_WITHDREW. Add a 'Restart tour' reset (clears the contextual-walkthrough seen-flag without resetting onboardingCompletedAt). Frontend: Section 5 in /settings — view current global VM, change (migration UI with cascade choice), remove, and Restart tour."
```

**Implement:** global-VM change/migration endpoint(s) + cascade, restart-tour reset, settings Section 5 UI, tests (auth matrix + cascade branches).
**Read first:** `spec/26` (§5 + R2 cascade rules), `spec/04` (VM removal mid-journey / global self-withdrawal), `spec/05` (vm_relationship perms), `spec/22` (VM dashboard), existing `apps/api/src/modules/vm-relationships/`

---

## Notes

- Every [FULL] item: tests written during apply, `pnpm test` must pass before review, `/code-review` before archive.
- Every [DIRECT] item: fix directly, run tests, commit. If it grows beyond ~20 lines of logic, escalate to [FULL].
- Auth matrix tests (spec/05 permission rows) are added incrementally — each feature adds its own permission tests during apply.
- Meilisearch indexing: wire index sync as each entity module is built (users in item 7, shlokas in item 29, blogs in item 25, experience logs in item 22).
- Never merge a feature branch to dev without tests passing.
