# UAT environment

## Overview

This Terraform root configures the environment module and a dedicated state backend. [main.tf:backend] [main.tf:module environment]

## Interface

- Inputs include deployment image references, the app deployment toggle and migration command. [main.tf:variable image_tag] [main.tf:variable migrate_command]

## Invariants

- UAT enables content editing, grants feedback and product docs by user, and configures one minimum replica for both API and web. [main.tf:content_edit_enabled] [main.tf:feedback_mode] [main.tf:api_min_replicas] [main.tf:web_min_replicas]

## Side Effects

- Applying the configuration manages UAT resources through the environment module. [main.tf:module environment]
- `deploy_apps` defaults to false and `image_tag` to empty. Against an existing environment, omitting deployment inputs can remove apps and jobs; preserve the running image references and inspect the destroy count in the plan. [main.tf:variable deploy_apps] [main.tf:variable image_tag] [../../modules/environment/container-apps.tf:local.deploy] [../../modules/environment/container-apps.tf:local.jobs]

## Verification

Follow the review procedures in the [Terraform guide](../../README.md) before running Terraform.
