# Holds secrets Phase 2 resources need (DB admin password, etc.) so nothing sensitive
# ever sits in a .tfvars file or an app's plain env var. Standard tier — cheapest, and
# more than enough for a project this size; pricing is per-operation, not per-secret.
resource "azurerm_key_vault" "veervrat" {
  name                = "veervrat-kv"
  resource_group_name = data.azurerm_resource_group.shared.name
  location             = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # RBAC (Azure role assignments) instead of the legacy vault access-policy model —
  # keeps permission management in one place (Azure RBAC) rather than two.
  rbac_authorization_enabled = true

  # Recovers from accidental deletion instead of the secret being gone forever.
  purge_protection_enabled = false # keep off for now — makes the vault (and its secrets) permanently undeletable, revisit before prod
  soft_delete_retention_days = 7

  tags = var.tags
}

# The person running Terraform needs to be able to read/write secrets too (e.g. to seed
# the DB password Phase 2 will create). Scoped to this vault only.
resource "azurerm_role_assignment" "current_user_kv_admin" {
  scope                = azurerm_key_vault.veervrat.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}
