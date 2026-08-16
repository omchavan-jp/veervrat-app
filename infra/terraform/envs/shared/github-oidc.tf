# Lets GitHub Actions authenticate to Azure **without any stored secret**.
#
# How it works: GitHub mints a short-lived OIDC token describing the workflow run (repo,
# branch or environment). Azure trusts that issuer for the specific subjects listed below and
# exchanges the token for an Azure access token. Nothing long-lived is ever stored in GitHub —
# there is no client secret or publish profile to leak or rotate.
#
# A **user-assigned managed identity** rather than an app registration, deliberately: federated
# credentials work on both, but this needs no Entra app-registration permissions and is managed
# by the same provider as everything else.

resource "azurerm_user_assigned_identity" "github_actions" {
  name                = "veervrat-github-actions"
  resource_group_name = data.azurerm_resource_group.shared.name
  location            = var.location
  tags                = var.tags
}

# One credential per trusted context. `subject` must match GitHub's token exactly — a mismatch
# fails at login with a generic "no matching federated identity record found", so keep these
# aligned with the workflow's triggers and environment names.
locals {
  github_repo = "veer-vrat/veervrat-app"

  # **Every CD job declares a GitHub Environment**, so every subject takes the
  # `environment:<name>` form. That is deliberate, and the reason is not obvious:
  #
  # GitHub's subject claim depends on the trigger. A job WITHOUT an `environment:` gets
  # `ref:refs/heads/main` on a branch push but `ref:refs/tags/prod-2026-08-16` on a tag push —
  # so a branch-ref credential silently fails every tag-triggered (i.e. production) run. And
  # federated `subject` is **exact match**: `refs/tags/*` is not a wildcard, it is a literal
  # string that matches nothing.
  #
  # Declaring an environment on every job makes the subject identical regardless of trigger,
  # which is why `build` exists as an environment despite gating nothing.
  #
  # Mismatches fail with AADSTS700213 ("No matching federated identity record found"), naming
  # the subject it presented — read that string and register it verbatim.
  github_federated_subjects = {
    build = "repo:${local.github_repo}:environment:build"
    uat   = "repo:${local.github_repo}:environment:uat"
    prod  = "repo:${local.github_repo}:environment:prod"
  }
}

resource "azurerm_federated_identity_credential" "github" {
  for_each = local.github_federated_subjects

  name                = "github-${each.key}"
  resource_group_name = data.azurerm_resource_group.shared.name
  parent_id           = azurerm_user_assigned_identity.github_actions.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = each.value
}

# ─── What CI is allowed to do ────────────────────────────────────────────────
#
# Scoped to the subscription because Terraform manages resource groups themselves (it creates
# veervrat-uat / veervrat-prod), so a resource-group-scoped grant would be unable to create
# them. Contributor cannot grant roles — deliberate: CI can deploy infrastructure but cannot
# widen anyone's access, including its own.

data "azurerm_subscription" "current" {}

resource "azurerm_role_assignment" "github_contributor" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

# Push images to the registry.
resource "azurerm_role_assignment" "github_acr_push" {
  scope                = azurerm_container_registry.veervrat.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

# Read/write Terraform state. Contributor covers the control plane but NOT blob data —
# data-plane access needs its own role, the same distinction that catches people with
# Key Vault (see documentation/21_Infrastructure-Conventions.md §5).
resource "azurerm_role_assignment" "github_tfstate" {
  scope                = "${data.azurerm_subscription.current.id}/resourceGroups/${data.azurerm_resource_group.shared.name}/providers/Microsoft.Storage/storageAccounts/veervrattfstate"
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

# CI must be able to read the secrets Terraform writes (it re-applies the same values), but
# never to manage the vault itself.
resource "azurerm_role_assignment" "github_kv_secrets" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

output "github_actions_client_id" {
  description = "Set as the AZURE_CLIENT_ID repository variable (not a secret — it is an identifier)."
  value       = azurerm_user_assigned_identity.github_actions.client_id
}
