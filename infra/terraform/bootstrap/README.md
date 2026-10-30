# Terraform backend bootstrap

## Overview

The script sets up the Azure resources used for Terraform state. [create-state-backend.sh:STORAGE_ACCOUNT]

## Interface

- It uses the signed-in Azure user and hardcoded resource group, region, storage account and legacy `tfstate` container. [create-state-backend.sh:USER_OBJECT_ID] [create-state-backend.sh:STORAGE_ACCOUNT] [create-state-backend.sh:CONTAINER]
- Current roots use `tfstate-shared`, `tfstate-uat` and `tfstate-prod`, declared by the shared root; this script alone does not prepare those containers or migrate existing state. Follow the [state migration checkpoints](../../../ops/terraform-state-migration.md). [../envs/shared/release-control-foundation.tf:staged_release_containers]

## Invariants

- The storage account configuration enables TLS 1.2, versioning and 30-day soft deletion, and disables public blob access. [create-state-backend.sh:az storage account create] [create-state-backend.sh:az storage account blob-service-properties update]

## Side Effects

- Running it creates Azure resources and assigns the current user the Storage Blob Data Contributor role. [create-state-backend.sh:az group create] [create-state-backend.sh:az role assignment create]

## Verification

`bash -n infra/terraform/bootstrap/create-state-backend.sh` checks syntax from the repository root without executing the script. It was not run during documentation generation.
