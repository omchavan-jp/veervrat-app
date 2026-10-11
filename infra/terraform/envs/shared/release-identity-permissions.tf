# Additive grants only. Candidate verification precedes deployment client-ID cutover.
# Access management stays with the maintainer; these principals cannot grant roles.
locals {
  release_environment_scopes = {
    for context in ["uat", "prod"] : context => {
      group = "${data.azurerm_subscription.current.id}/resourceGroups/veervrat-${context}"
      vault = "${data.azurerm_subscription.current.id}/resourceGroups/veervrat-${context}/providers/Microsoft.KeyVault/vaults/veervrat-${context}-kv"
    }
  }
  release_identity_grants = merge(
    {
      build_registry_metadata = {
        context = "build"
        scope   = azurerm_container_registry.veervrat.id
        role    = "Reader"
      }
      build_registry_publish = {
        context = "build"
        scope   = azurerm_container_registry.veervrat.id
        role    = "AcrPush"
      }
    },
    merge([
      for context, scopes in local.release_environment_scopes : {
        "${context}_infrastructure" = {
          context = context
          scope   = scopes.group
          role    = "Contributor"
        }
        "${context}_secrets" = {
          context = context
          scope   = scopes.vault
          role    = "Key Vault Secrets Officer"
        }
        "${context}_state" = {
          context = context
          scope   = azurerm_storage_container.staged_release[context].resource_manager_id
          role    = "Storage Blob Data Contributor"
        }
        "${context}_registry_metadata" = {
          context = context
          scope   = azurerm_container_registry.veervrat.id
          role    = "Reader"
        }
        "${context}_registry_pull" = {
          context = context
          scope   = azurerm_container_registry.veervrat.id
          role    = "AcrPull"
        }
      }
    ]...)
  )
}

resource "azurerm_role_assignment" "release_identity" {
  for_each = local.release_identity_grants

  scope                = each.value.scope
  role_definition_name = each.value.role
  principal_id         = azurerm_user_assigned_identity.staged_release[each.value.context].principal_id
  principal_type       = "ServicePrincipal"
}

output "release_identity_permissions" {
  description = "Non-secret desired scoped grants. Verification and credential cutover are separate checkpoints."
  value       = local.release_identity_grants
}
