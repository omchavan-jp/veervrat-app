# Shared infrastructure

## Overview

This Terraform root manages shared Azure resources, including the container registry, release identities, release record access and cost guard. [acr.tf:azurerm_container_registry.veervrat] [release-control-foundation.tf:staged_release] [cost-guard.tf:azurerm_automation_account.cost_guard]

## Interface

- Configuration includes region, tags and budget notification inputs; outputs include the registry login server and scoped release identities. [variables.tf:location] [outputs.tf:container_registry_login_server] [release-control-foundation.tf:staged_release_identities]

## Invariants

- Registry admin access is disabled, and release identity grants are scoped. [acr.tf:admin_enabled] [release-identity-permissions.tf:release_identity_grants]
- The monthly budget is 13,000 in the subscription's billing currency: actual-spend thresholds at 50% and 75% notify; exceeding 95% also invokes the cost-stop action group. [cost-guard.tf:azurerm_consumption_budget_subscription.monthly]

## Side Effects

- Applying provisions Azure resources and role assignments. The configured cost guard can deactivate app revisions and stop PostgreSQL. [cost-guard.tf:azurerm_role_definition.cost_guard] [release-record-access.tf:uat_release_records]
- The runbook targets both UAT and production by default, continues after individual stop failures, and leaves Redis and storage costs running. Its webhook URI is a trigger credential stored in Terraform state. [runbooks/stop-veervrat.ps1:ResourceGroups] [runbooks/stop-veervrat.ps1:ErrorActionPreference] [cost-guard.tf:azurerm_automation_webhook.stop_veervrat]

## Verification

Follow the review and authorization procedures in the [Terraform guide](../../README.md) before running Terraform.
