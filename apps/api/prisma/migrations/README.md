# Prisma migration history

## Overview

Architectural index of the immediate source subdirectories documented below.

## Interface

- [20260603070818_init](./20260603070818_init/README.md): Initial historical PostgreSQL domain DDL.
- [20260604071521_add_google_link_token](./20260604071521_add_google_link_token/README.md): Historical Google linking token extension.
- [20260604102310_add_test_relations](./20260604102310_add_test_relations/README.md): Historical assessment relationship constraints.
- [20260605144542_add_custom_erc_creator_and_review_queue](./20260605144542_add_custom_erc_creator_and_review_queue/README.md): Historical custom ERC review storage.
- [20260605145701_add_invitation_token](./20260605145701_add_invitation_token/README.md): Historical invitation token addition and backfill.
- [20260606182942_add_upload_table](./20260606182942_add_upload_table/README.md): Historical upload table creation; URL column is later renamed.
- [20260610200030_add_account_setup_completed_at](./20260610200030_add_account_setup_completed_at/README.md): Historical account setup timestamp.
- [20260610215600_add_profile_visibility](./20260610215600_add_profile_visibility/README.md): Historical profile visibility JSON storage.
- [20260614081032_add_erc_marathi_fields](./20260614081032_add_erc_marathi_fields/README.md): Historical Marathi ERC copy fields.
- [20260614090133_add_trgm_entity_search_indexes](./20260614090133_add_trgm_entity_search_indexes/README.md): Historical entity search trigram indexes, subsequently dropped by completion timestamp migration.
- [20260614133513_add_journey_completion_submitted_at](./20260614133513_add_journey_completion_submitted_at/README.md): Historical journey completion timestamp and removal of entity trigram indexes.
- [20260615121159_add_invitation_reminder_sent_at](./20260615121159_add_invitation_reminder_sent_at/README.md): Historical invitation reminder timestamp.
- [20260616140214_add_blog_comment_threading_and_report](./20260616140214_add_blog_comment_threading_and_report/README.md): Historical blog comment threading/report fields.
- [20260617071140_add_featured_and_cms_pages](./20260617071140_add_featured_and_cms_pages/README.md): Historical featured flags and CMS pages.
- [20260617090800_add_user_suspend_anonymise](./20260617090800_add_user_suspend_anonymise/README.md): Historical user suspension/anonymisation timestamps.
- [20260617103807_add_settings_fields](./20260617103807_add_settings_fields/README.md): Historical user settings storage.
- [20260617191957_add_user_tour_reset](./20260617191957_add_user_tour_reset/README.md): Historical tour reset timestamp.
- [20260701105333_journey_live_unique_index](./20260701105333_journey_live_unique_index/README.md): Historical partial unique live journey index.
- [20260703223302_add_feedback_tables](./20260703223302_add_feedback_tables/README.md): Historical feedback and upvote tables.
- [20260719174921_add_feedback_modification_addition_types](./20260719174921_add_feedback_modification_addition_types/README.md): Historical feedback category enum expansion.
- [20260724173141_add_feedback_done_note](./20260724173141_add_feedback_done_note/README.md): Historical feedback completion note.
- [20260821130724_add_user_capabilities](./20260821130724_add_user_capabilities/README.md): Historical user capability grants.
- [20260822100855_age_gate_and_consent](./20260822100855_age_gate_and_consent/README.md): Historical age/consent and pending signup storage; later migration relaxes dob requirement.
- [20260822135517_pending_signup_username](./20260822135517_pending_signup_username/README.md): Historical pending signup username field.
- [20260823034921_anonymisation_clears_identity_fields](./20260823034921_anonymisation_clears_identity_fields/README.md): Historical relaxation of stored user birth date.
- [20260824180000_uploads_store_key_not_url](./20260824180000_uploads_store_key_not_url/README.md): Historical upload URL conversion to storage keys.
- [20260824190000_bind_uploads_to_parent](./20260824190000_bind_uploads_to_parent/README.md): Historical upload attachment to experience logs.
- [20260826090000_session_reauthentication](./20260826090000_session_reauthentication/README.md): Historical session reauthentication timestamp.
- [20260826140000_vm_relationship_vratarthi_fk](./20260826140000_vm_relationship_vratarthi_fk/README.md): Historical vratarthi relationship foreign key.
- [20260827090000_content_suggestions](./20260827090000_content_suggestions/README.md): Historical content suggestions storage.
- [20260827150000_add_ended_state](./20260827150000_add_ended_state/README.md): Historical ended mentor relationship state and backfill.
- [20260828090000_user_search_postgres](./20260828090000_user_search_postgres/README.md): Historical PostgreSQL user search indexes.
- [20260830080000_lowercase_email_storage](./20260830080000_lowercase_email_storage/README.md): Historical lowercase email data migration.
- [20261001090000_product_docs_view_capability](./20261001090000_product_docs_view_capability/README.md): Historical product documentation viewing capability.

## Invariants

- No additional local contract; see the child contracts above for component-specific behavior.

## Side Effects

- No additional local contract; see the child contracts above for component-specific behavior.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
