# Additive staging only. No workflows or RBAC grants switch to these identities yet.
# The legacy identity stays intact until the reviewed cutover and denial tests pass.
locals {
  staged_release_contexts = toset(["build", "uat", "prod"])
  staged_release_containers = {
    shared  = "tfstate-shared"
    uat     = "tfstate-uat"
    prod    = "tfstate-prod"
    records = "release-records"
  }
}

resource "azurerm_user_assigned_identity" "staged_release" {
  for_each = local.staged_release_contexts

  name                = "veervrat-github-${each.key}"
  resource_group_name = data.azurerm_resource_group.shared.name
  location            = var.location
  tags                = merge(var.tags, { release-context = each.key })

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_federated_identity_credential" "staged_release" {
  for_each = local.staged_release_contexts

  name                = "github-${each.key}"
  resource_group_name = data.azurerm_resource_group.shared.name
  parent_id           = azurerm_user_assigned_identity.staged_release[each.key].id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = local.github_federated_subjects[each.key]
}

# This account remains the existing manually bootstrapped backend, not a new resource.
data "azurerm_storage_account" "release_backend" {
  name                = "veervrattfstate"
  resource_group_name = data.azurerm_resource_group.shared.name
}

resource "azurerm_storage_container" "staged_release" {
  for_each = local.staged_release_containers

  name                  = each.value
  storage_account_id    = data.azurerm_storage_account.release_backend.id
  container_access_type = "private"

  lifecycle {
    prevent_destroy = true
  }
}

output "staged_release_identities" {
  description = "Non-secret identifiers for a later reviewed environment-variable/RBAC cutover; not active deployment authority."
  value = {
    for context, identity in azurerm_user_assigned_identity.staged_release : context => {
      client_id    = identity.client_id
      principal_id = identity.principal_id
      resource_id  = identity.id
    }
  }
}

output "staged_release_container_scopes" {
  description = "ARM container scopes for future RBAC; existing state has not been moved."
  value = {
    for context, container in azurerm_storage_container.staged_release : context => container.resource_manager_id
  }
}
