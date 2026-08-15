# Holds secrets Phase 2 resources need (DB admin password, etc.) so nothing sensitive
# ever sits in a .tfvars file or an app's plain env var. Standard tier — cheapest, and
# more than enough for a project this size; pricing is per-operation, not per-secret.
resource "azurerm_key_vault" "veervrat" {
  name                = "veervrat-kv"
  resource_group_name = data.azurerm_resource_group.shared.name
  location            = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # RBAC (Azure role assignments) instead of the legacy vault access-policy model —
  # keeps permission management in one place (Azure RBAC) rather than two.
  rbac_authorization_enabled = true

  # Recovers from accidental deletion instead of the secret being gone forever.
  purge_protection_enabled   = false # keep off for now — makes the vault (and its secrets) permanently undeletable, revisit before prod
  soft_delete_retention_days = 7

  tags = var.tags
}

# Note: with RBAC authorization enabled, subscription Owner does NOT grant access to secret
# *values* — data-plane access needs its own role. Hence this explicit assignment, scoped to
# this vault only. See var.key_vault_administrators for why these are named, not inferred.
resource "azurerm_role_assignment" "key_vault_admins" {
  for_each = var.key_vault_administrators

  scope                = azurerm_key_vault.veervrat.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = each.value
}

# Renames the existing assignment in state instead of destroying and recreating it.
# Safe to delete once this has been applied everywhere (i.e. after the next apply).
moved {
  from = azurerm_role_assignment.current_user_kv_admin
  to   = azurerm_role_assignment.key_vault_admins["om"]
}
