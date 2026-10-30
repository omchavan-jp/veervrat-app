# Production environment

## Overview

This Terraform root configures the shared environment module and a dedicated state backend. [main.tf:backend] [main.tf:module environment]

## Interface

- Inputs include deployment image references, the app deployment toggle, migration command and administrative recovery configuration. [main.tf:variable image_tag] [main.tf:variable deploy_apps] [main.tf:variable bootstrap_admin_email]

## Invariants

- Production disables content editing and product docs, grants feedback, and configures 35-day PostgreSQL backup retention. [main.tf:content_edit_enabled] [main.tf:feedback_mode] [main.tf:postgres_backup_retention_days]
- Both API and web minimum replica counts are zero, allowing scale-to-zero and cold starts. [main.tf:api_min_replicas] [main.tf:web_min_replicas]

## Side Effects

- Applying this configuration manages production Azure resources. The defaults `deploy_apps=false` and an empty `image_tag` can remove existing apps and jobs; preserve the running image references and inspect the plan's destroy count under the approved release procedure. [main.tf:module environment] [main.tf:variable deploy_apps] [main.tf:variable image_tag] [../../modules/environment/container-apps.tf:local.deploy] [../../modules/environment/container-apps.tf:local.jobs]

## Verification

Follow the review and authorization procedures in the [Terraform guide](../../README.md) before running Terraform.
