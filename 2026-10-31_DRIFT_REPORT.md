# README contract drift report

Status: **complete — 263/263 contracts reviewed** against current repository source. This combines the earlier 62 reviews with the remaining 58 API, 114 web and 29 support reviews. Confirmed documentation discrepancies were corrected in 41 README files; each finding below records the correction. No application behavior or confirmed redesign decisions were changed.

Scope: the generated README contracts in the bootstrap inventory. This is a source comparison, not runtime, deployed-system, security or test certification. “No drift detected” means no discrepancy was identified in the documented contract during this inspection.

Verification: all 263 contracts were reread by the static checker; internal links, required sections and code fences passed. Source citation file/spelling checks passed. Functional source hashes match the snapshot taken before the remaining review. No application tests, builds, migrations or infrastructure operations were run.

Follow-up: some corrected descriptions expose existing implementation limitations, including no-op search indexing/501 search paths, narrower authorization checks, public experience listing behavior and completion/assessment validation gaps. Those behaviors are documented in the relevant entries below; they have not been repaired by this documentation review.

## README.md

- Fixed: E2E setup/teardown database writes and best-effort cleanup were omitted; documented actual shared-account roles and ephemeral account deletion.
- Fixed: documented the separate pnpm test:e2e command; pnpm test does not invoke Playwright.

## apps/README.md

No drift detected.

## apps/api/README.md

No drift detected.

## apps/api/prisma/README.md

- Fixed: reviewStatus belongs to journey ERC models; CustomErcReview has status only (schema.prisma).

## apps/api/prisma/migrations/20260603070818_init/README.md

No drift detected.

## apps/api/prisma/migrations/20260604071521_add_google_link_token/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260604102310_add_test_relations/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260605144542_add_custom_erc_creator_and_review_queue/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260605145701_add_invitation_token/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260606182942_add_upload_table/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260610200030_add_account_setup_completed_at/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260610215600_add_profile_visibility/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260614081032_add_erc_marathi_fields/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260614090133_add_trgm_entity_search_indexes/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260614133513_add_journey_completion_submitted_at/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260615121159_add_invitation_reminder_sent_at/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260616140214_add_blog_comment_threading_and_report/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260617071140_add_featured_and_cms_pages/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260617090800_add_user_suspend_anonymise/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260617103807_add_settings_fields/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260617191957_add_user_tour_reset/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260701105333_journey_live_unique_index/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260703223302_add_feedback_tables/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260719174921_add_feedback_modification_addition_types/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260724173141_add_feedback_done_note/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260821130724_add_user_capabilities/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260822100855_age_gate_and_consent/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260822135517_pending_signup_username/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260823034921_anonymisation_clears_identity_fields/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260824180000_uploads_store_key_not_url/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260824190000_bind_uploads_to_parent/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260826090000_session_reauthentication/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260826140000_vm_relationship_vratarthi_fk/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260827090000_content_suggestions/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260827150000_add_ended_state/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260828090000_user_search_postgres/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20260830080000_lowercase_email_storage/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/20261001090000_product_docs_view_capability/README.md

No drift detected against its migration SQL.

## apps/api/prisma/migrations/README.md

No drift detected.

## apps/api/scripts/README.md

No drift detected.

## apps/api/src/README.md

No drift detected.

## apps/api/src/common/README.md

No drift detected.

## apps/api/src/common/age/README.md

No drift detected against `age.ts`.

## apps/api/src/common/exceptions/README.md

No drift detected.

## apps/api/src/common/filters/README.md

No drift detected.

## apps/api/src/common/guards/README.md

No drift detected.

## apps/api/src/common/http/README.md

No drift detected against its local source files.

## apps/api/src/common/interceptors/README.md

No drift detected.

## apps/api/src/common/lifecycle/README.md

No drift detected.

## apps/api/src/common/middleware/README.md

No drift detected against its local source files.

## apps/api/src/common/observability/README.md

No drift detected.

## apps/api/src/common/permissions/README.md

No drift detected.

## apps/api/src/common/redis/README.md

No drift detected against its local source files.

## apps/api/src/common/throttler/README.md

No drift detected.

## apps/api/src/common/tiptap/README.md

No drift detected.

## apps/api/src/common/types/README.md

No drift detected against its local source files.

## apps/api/src/common/websocket/README.md

No drift detected.

## apps/api/src/config/README.md

No drift detected.

## apps/api/src/database/README.md

No drift detected.

## apps/api/src/modules/README.md

- Fixed: email architectural summary now distinguishes the Redis-backed BullMQ queue from its in-process worker (email/email-queue.service.ts).

## apps/api/src/modules/actions/README.md

No drift detected.

## apps/api/src/modules/admin-users/README.md

No drift detected.

## apps/api/src/modules/admin-users/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/admin/README.md

No drift detected.

## apps/api/src/modules/admin/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/audit/README.md

No drift detected.

## apps/api/src/modules/auth/README.md

- Fixed: assertRecentlyAuthenticated accepts recent session proof even after a supplied password fails; the README previously implied every incorrect supplied password fails immediately (auth.service.ts).
- Fixed: documented that new Google signup sets emailVerifiedAt without testing profile.emailVerified (handleGoogleLogin); the stricter verification check applies to account linking.
- Fixed: repository deletion wording now identifies auth identity-claim deletion rather than user-account deletion (auth.repository.ts:releaseIdentityClaims).

## apps/api/src/modules/auth/consent/README.md

No drift detected against its local source files.

## apps/api/src/modules/auth/decorators/README.md

No drift detected against its local source files.

## apps/api/src/modules/auth/dto/README.md

No drift detected.

## apps/api/src/modules/auth/guards/README.md

- The previous wording implied that pending OAuth state is restricted to a record ID and excludes personal data. The guard passes any nonempty string supplied as `pending`; corrected the description to state what this guard actually checks.

## apps/api/src/modules/auth/strategies/README.md

No drift detected.

## apps/api/src/modules/auth/types/README.md

No drift detected against its local source files.

## apps/api/src/modules/blogs/README.md

- Fixed: blog index maintenance calls are no-ops and queries of at least two characters throw HTTP 501; README previously described actual indexing (blogs.service.ts; ../search/blogs-index.service.ts).

## apps/api/src/modules/blogs/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/capabilities/README.md

No drift detected.

## apps/api/src/modules/chats/README.md

No drift detected.

## apps/api/src/modules/chats/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/cms/README.md

No drift detected.

## apps/api/src/modules/cms/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/content-overrides/README.md

- Fixed: publication rechecks placeholders for existing canonical keys but also accepts new keys; clarified the misleading canonical-key validation claim (content-overrides.service.ts:publish).

## apps/api/src/modules/content-overrides/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/content-suggestions/README.md

No drift detected.

## apps/api/src/modules/content-suggestions/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/content/README.md

- Fixed: shloka maintenance calls are no-ops and queries of at least two characters throw HTTP 501; README previously described actual indexing (content.service.ts; ../search/shlokas-index.service.ts).

## apps/api/src/modules/dashboard/README.md

No drift detected.

## apps/api/src/modules/data-export/README.md

No drift detected.

## apps/api/src/modules/email/README.md

- Fixed: Redis persists the BullMQ queue while the worker runs in the API process; README called the queue itself in-process (email-queue.service.ts).

## apps/api/src/modules/email/templates/README.md

No drift detected.

## apps/api/src/modules/entity-search/README.md

- Fixed: exposures/resolutions/challenges share one five-hit repository search rather than five hits per ERC type (entity-search.service.ts; entity-search.repository.ts:searchOwnErcItems).

## apps/api/src/modules/entity-search/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/erc/README.md

No drift detected.

## apps/api/src/modules/erc/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/experience-logs/README.md

No drift detected.

## apps/api/src/modules/experience-logs/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/feedback/README.md

No drift detected.

## apps/api/src/modules/feedback/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/follows/README.md

No drift detected.

## apps/api/src/modules/invitations/README.md

- Fixed: only VM invitation acceptance creates a relationship and grants VRATMITRA. Platform acceptance creates neither, while still emitting VM_INVITATION_ACCEPTED (invitations.service.ts:acceptInvitation).

## apps/api/src/modules/invitations/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/journeys/README.md

- Fixed undocumented behavior: journey creation uses session identity without evaluating journey.create or VA role (journeys.controller.ts; journeys.service.ts:createJourney).
- Fixed undocumented behavior: permitted VM completion approval needs no prior submission; completion paths do not check ERC counts/thresholds (journeys.service.ts:submitCompletion,approveCompletion).
- Fixed: activity contributes one ERC event per item by approved/submitted/started timestamp precedence, rather than merging all its lifecycle timestamps (journeys.repository.ts:getActivity).

## apps/api/src/modules/journeys/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/moderation/README.md

- Fixed: review detail exposes journey ID/title and subvirtue in addition to sentence/virtue/weakness data; README understated that context (moderation.repository.ts:findReviewDetail).

## apps/api/src/modules/moderation/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/notifications/README.md

No drift detected.

## apps/api/src/modules/notifications/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/search/README.md

No drift detected.

## apps/api/src/modules/stats/README.md

- Fixed undocumented behavior: VM stats count distinct IDs in global relationship rows of any state, excluding journey-only VMs; VA counts do not filter deleted/suspended users (stats.repository.ts:getPlatformStats).

## apps/api/src/modules/tests/README.md

- Fixed undocumented behavior: draft creation does not evaluate test.take/VA role, saving does not validate sentence membership in the weakness, and submission does not enforce answer completeness (tests.controller.ts; tests.service.ts; tests.repository.ts).

## apps/api/src/modules/tests/dto/README.md

No drift detected.

## apps/api/src/modules/uploads/README.md

- Fixed undocumented behavior: chat upload stores caller-supplied roomId without participation/relationship authorization; image resolution checks ID membership only and does not revalidate an active relationship (uploads.service.ts; uploads-resolver.service.ts:assertChatParticipant).

## apps/api/src/modules/uploads/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/uploads/storage/README.md

No drift detected.

## apps/api/src/modules/users/README.md

- Fixed undocumented behavior: public experience listing ignores profilePrivate and the experiences visibility flag (users.service.ts:getPublicExperiences).
- Fixed: user-index maintenance/removal are no-ops and user search reads PostgreSQL; README previously claimed seeding, synchronization and removal of actual index entries (users.service.ts; ../search/users-index.service.ts).

## apps/api/src/modules/users/dto/README.md

No drift detected against its local source files.

## apps/api/src/modules/virtues/README.md

No drift detected.

## apps/api/src/modules/vm-relationships/README.md

- Fixed: deleted-journey filtering belongs specifically to getVmAssignedJourneys; roster/context/active-relationship queries lack that filter (vm-relationships.repository.ts).

## apps/api/src/modules/vm-relationships/dto/README.md

- The default cascade was attributed to a DTO comment instead of the controller that applies it. Confirmed and corrected the citation to `vm-relationships.controller.ts:removeGlobalVm`.

## apps/api/src/modules/weaknesses/README.md

- Fixed undocumented behavior: list emits only A/B/C/other categories, maps null to other and omits unrecognized nonnull categories (weaknesses.service.ts:listWeaknesses).

## apps/api/src/prisma/README.md

No drift detected.

## apps/backup/README.md

- The README omitted that Azure Blob is a staging copy in the same subscription as the database and that an off-site copy requires a separate pull. Confirmed against `apps/backup/backup.sh`; corrected in the README.

## apps/web/README.md

No drift detected.

## apps/web/app/(admin)/README.md

No drift detected.

## apps/web/app/(admin)/admin/README.md

No drift detected.

## apps/web/app/(admin)/admin/audit/README.md

No drift detected.

## apps/web/app/(admin)/admin/cms/README.md

No drift detected.

## apps/web/app/(admin)/admin/featured/README.md

No drift detected.

## apps/web/app/(admin)/admin/pothi/README.md

No drift detected.

## apps/web/app/(admin)/admin/resources/README.md

No drift detected.

## apps/web/app/(admin)/admin/shlokas/README.md

No drift detected.

## apps/web/app/(admin)/admin/suggestions/README.md

No drift detected.

## apps/web/app/(admin)/admin/taxonomy/README.md

No drift detected.

## apps/web/app/(admin)/admin/users/README.md

No drift detected.

## apps/web/app/(admin)/admin/users/[id]/README.md

No drift detected.

## apps/web/app/(app)/README.md

No drift detected.

## apps/web/app/(app)/actions/README.md

No drift detected.

## apps/web/app/(app)/blogs/README.md

No drift detected.

## apps/web/app/(app)/blogs/[id]/README.md

No drift detected.

## apps/web/app/(app)/blogs/[id]/edit/README.md

No drift detected.

## apps/web/app/(app)/blogs/mine/README.md

No drift detected.

## apps/web/app/(app)/blogs/new/README.md

No drift detected.

## apps/web/app/(app)/dashboard/README.md

No drift detected.

## apps/web/app/(app)/experiences/README.md

No drift detected.

## apps/web/app/(app)/experiences/[id]/README.md

No drift detected.

## apps/web/app/(app)/experiences/[id]/edit/README.md

No drift detected.

## apps/web/app/(app)/experiences/new/README.md

No drift detected.

## apps/web/app/(app)/invitations/README.md

No drift detected.

## apps/web/app/(app)/journeys/README.md

- Fixed: replaced “No explicit side effects identified” with the delegated useJourneys → journeysApi.list → GET /journeys request (page.tsx, hooks/use-journeys.ts and lib/api/journeys.ts).

## apps/web/app/(app)/journeys/[id]/README.md

No drift detected.

## apps/web/app/(app)/journeys/new/README.md

No drift detected.

## apps/web/app/(app)/my-vratmitras/README.md

No drift detected.

## apps/web/app/(app)/my-vratmitras/[vmId]/README.md

No drift detected.

## apps/web/app/(app)/my-vratmitras/[vmId]/chat/README.md

No drift detected.

## apps/web/app/(app)/profile/README.md

No drift detected.

## apps/web/app/(app)/settings/README.md

No drift detected.

## apps/web/app/(app)/settings/data-export/README.md

No drift detected.

## apps/web/app/(app)/settings/data-export/[token]/README.md

No drift detected.

## apps/web/app/(app)/study/README.md

No drift detected.

## apps/web/app/(app)/study/[id]/README.md

No drift detected.

## apps/web/app/(app)/study/[id]/test/README.md

No drift detected.

## apps/web/app/(app)/study/[id]/test/[testId]/README.md

No drift detected.

## apps/web/app/(app)/study/[id]/test/[testId]/preview/README.md

No drift detected.

## apps/web/app/(app)/study/[id]/test/[testId]/report/README.md

No drift detected.

## apps/web/app/(app)/suggestions/README.md

No drift detected.

## apps/web/app/(app)/u/README.md

No drift detected.

## apps/web/app/(app)/u/[username]/README.md

No drift detected.

## apps/web/app/(content)/README.md

No drift detected.

## apps/web/app/(content)/community/README.md

No drift detected.

## apps/web/app/(content)/community/blogs/README.md

No drift detected.

## apps/web/app/(content)/community/blogs/[id]/README.md

No drift detected.

## apps/web/app/(content)/community/experiences/README.md

No drift detected.

## apps/web/app/(content)/community/experiences/[id]/README.md

No drift detected.

## apps/web/app/(content)/pothi/README.md

No drift detected.

## apps/web/app/(content)/resources/README.md

No drift detected.

## apps/web/app/(content)/sentences/README.md

No drift detected.

## apps/web/app/(content)/sentences/[id]/README.md

No drift detected.

## apps/web/app/(content)/shlokas/README.md

No drift detected.

## apps/web/app/(content)/subvirtues/README.md

No drift detected.

## apps/web/app/(content)/subvirtues/[id]/README.md

No drift detected.

## apps/web/app/(content)/virtues/README.md

No drift detected.

## apps/web/app/(content)/virtues/[id]/README.md

No drift detected.

## apps/web/app/(content)/weaknesses/README.md

No drift detected.

## apps/web/app/(content)/weaknesses/[id]/README.md

No drift detected.

## apps/web/app/(moderation)/README.md

- Fixed: documented delegated authentication/onboarding render suppression, redirects and pathname-triggered auth invalidation (layout.tsx and (app)/layout-client.tsx).

## apps/web/app/(moderation)/moderation/README.md

No drift detected.

## apps/web/app/(moderation)/moderation/custom-erc/README.md

No drift detected.

## apps/web/app/(onboarding)/README.md

No drift detected.

## apps/web/app/(onboarding)/onboarding/README.md

No drift detected.

## apps/web/app/(onboarding)/onboarding/account-setup/README.md

No drift detected.

## apps/web/app/(onboarding)/onboarding/framework/README.md

No drift detected.

## apps/web/app/(policy)/README.md

No drift detected.

## apps/web/app/(policy)/privacy/README.md

No drift detected.

## apps/web/app/(policy)/terms/README.md

No drift detected.

## apps/web/app/(public)/README.md

No drift detected.

## apps/web/app/(public)/confirm-email-change/README.md

No drift detected.

## apps/web/app/(public)/forgot-password/README.md

No drift detected.

## apps/web/app/(public)/invitations/README.md

No drift detected.

## apps/web/app/(public)/invitations/[token]/README.md

No drift detected.

## apps/web/app/(public)/invitations/[token]/accept/README.md

- Fixed: documented the parent public layout’s search-token exemption. A route token alone does not exempt signed-in visitors from its dashboard/onboarding redirect (accept/page.tsx and (public)/layout-client.tsx).

## apps/web/app/(public)/link-account/README.md

No drift detected.

## apps/web/app/(public)/login/README.md

No drift detected.

## apps/web/app/(public)/reset-password/README.md

No drift detected.

## apps/web/app/(public)/set-password/README.md

No drift detected.

## apps/web/app/(public)/signup/README.md

No drift detected.

## apps/web/app/(public)/verify-email/README.md

No drift detected.

## apps/web/app/(vratmitra)/README.md

- Fixed: documented delegated authentication/onboarding render suppression, redirects and pathname-triggered auth invalidation (layout.tsx and (app)/layout-client.tsx).

## apps/web/app/(vratmitra)/vratmitra/README.md

No drift detected.

## apps/web/app/(vratmitra)/vratmitra/guidance/README.md

No drift detected.

## apps/web/app/(vratmitra)/vratmitra/my-vratarthis/README.md

No drift detected.

## apps/web/app/README.md

No drift detected.

## apps/web/app/product-docs/README.md

No drift detected.

## apps/web/app/product-docs/[[...path]]/README.md

No drift detected.

## apps/web/components/README.md

No drift detected.

## apps/web/components/auth/README.md

No drift detected.

## apps/web/components/blog/README.md

No drift detected.

## apps/web/components/chat/README.md

No drift detected.

## apps/web/components/dashboard/README.md

No drift detected.

## apps/web/components/experience/README.md

No drift detected.

## apps/web/components/invitations/README.md

No drift detected.

## apps/web/components/journey/README.md

No drift detected.

## apps/web/components/layout/README.md

No drift detected.

## apps/web/components/shared/README.md

- Fixed: limited Marathi policy selection to Marathi locale and corrected the claimed separation of loading failures from unpublished content. cmsApi.getByKey catches every request failure and returns null, which selects the unpublished branch (policy-document.tsx and lib/api/cms.ts).

## apps/web/components/shared/content-editor/README.md

No drift detected.

## apps/web/components/shared/feedback/README.md

No drift detected.

## apps/web/components/shared/launcher/README.md

No drift detected.

## apps/web/components/shared/suggestions/README.md

No drift detected.

## apps/web/components/study/README.md

No drift detected.

## apps/web/components/ui/README.md

- Fixed: documented DatePicker’s January 1920 calendar boundary and selected-date/defaultMonth/25-years-before-max opening precedence (date-picker.tsx).

## apps/web/hooks/README.md

No drift detected.

## apps/web/i18n/README.md

No drift detected.

## apps/web/lib/README.md

- Fixed: documented 60-second default query freshness, disabled default focus refetch, and global mutation toast suppression for local handlers or meta.silent (query-client.ts).

## apps/web/lib/api/README.md

- Fixed: added the otherwise undocumented dated shloka scheduling, queue reordering and daily shloka API operations (admin.ts and content.ts).

## apps/web/lib/content-editor/README.md

No drift detected.

## apps/web/lib/suggestions/README.md

No drift detected.

## apps/web/lib/validations/README.md

No drift detected.

## infra/README.md

No drift detected.

## infra/terraform/README.md

- Fixed: shared root uses an existing resource group/state storage account and manages registry, identities, containers, grants and cost guard; it does not create the state storage account.
- Fixed: bootstrap layout now describes the legacy container and removes the unsupported assertion that every step is create-if-not-exists.

## infra/terraform/bootstrap/README.md

- Fixed: script creates the legacy tfstate container, not the current dedicated shared/UAT/prod containers or a state migration; documented that boundary and linked checkpoints.

## infra/terraform/envs/README.md

No drift detected.

## infra/terraform/envs/prod/README.md

- Fixed: documented zero minimum replicas for both app tiers, allowing cold starts.
- Fixed: documented that omitted deploy_apps/image_tag inputs can remove existing apps/jobs, following the actual local.deploy/local.jobs resource counts.

## infra/terraform/envs/shared/README.md

- Fixed: added the 13,000 monthly budget and 50%/75% notification versus 95% cost-stop thresholds.
- Fixed: added both-environment runbook scope, continued processing after stop failures, continued Redis/storage billing, and the webhook trigger credential in state.

## infra/terraform/envs/uat/README.md

- Fixed: both API and web have one minimum replica; only the API was documented.
- Fixed: documented potentially destructive default deploy_apps/image_tag inputs for existing apps/jobs.

## infra/terraform/modules/README.md

No drift detected.

## infra/terraform/modules/environment/README.md

- Fixed: wipe job documentation omitted environment-name confirmation, refusal above 50 accounts, and cascading user-data removal; verified the invoked TypeScript implementation.

## packages/README.md

No drift detected.

## packages/types/README.md

No drift detected.

## packages/types/src/README.md

No drift detected against `packages/types/src/index.ts`.

## product-design/README.md

No drift detected.

## product-design/tooling/README.md

- Fixed: missing D2 CLI skips the validator's D2 check but is fatal to dev/build diagram generation.
- Fixed: clarified that the Docker build pins D2 v0.9.0 while local generation uses the installed CLI version.

## product-design/tooling/app/(docs)/README.md

- Fixed: layout accepts only children; the page tree is obtained internally from source.getPageTree(), not passed by callers.

## product-design/tooling/app/(docs)/[[...slug]]/README.md

No drift detected.

## product-design/tooling/app/00-governance/README.md

No drift detected.

## product-design/tooling/app/00-governance/decision-registry.json/README.md

No drift detected.

## product-design/tooling/app/00-governance/decision-registry.schema.json/README.md

No drift detected.

## product-design/tooling/app/00-governance/deferred-topics.json/README.md

No drift detected.

## product-design/tooling/app/00-governance/deferred-topics.schema.json/README.md

No drift detected.

## product-design/tooling/app/README.md

No drift detected.

## product-design/tooling/app/api/README.md

No drift detected.

## product-design/tooling/app/api/search/README.md

- Fixed: README described the generic GET result but did not identify the static search export; route.ts aliases createFromSource(source).staticGET as GET.

## product-design/tooling/app/components/README.md

No drift detected.

## product-design/tooling/lib/README.md

- Fixed: governanceJson catches every file-read failure as plain-text 404, not only missing files; private/no-store headers apply to successful JSON responses.

## product-design/tooling/scripts/README.md

- Fixed: unsafe-SVG checks run only for newly rendered output, while cached SVGs are reused without those checks.
- Fixed: D2 absence causes validation to warn/skip rather than necessarily fail; generation still requires the CLI.

## scripts/README.md

- Fixed: documented that regex source audits produce candidates for review rather than runtime proof of route/query correctness.
- Fixed: added backup retention/staleness defaults, that status uses filenames/timestamps without rechecking decryption/hashes, and LaunchAgent hourly/run-at-load behavior.
