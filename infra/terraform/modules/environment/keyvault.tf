# Holds this environment's secrets ONLY (DB password, Redis key, session secret, OAuth
# secret, Resend key). Deliberately per-environment, not shared — a compromised or
# misconfigured UAT app must not be able to read the production database password.
# See documentation/21_Infrastructure-Conventions.md §9-10 for the full reasoning.
resource "azurerm_key_vault" "this" {
  name                = "veervrat-${var.environment}-kv"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  rbac_authorization_enabled = true

  # 90 = the maximum and Azure's default, set correctly at creation because this value is
  # immutable after creation (Phase 1 lesson — see conventions doc §10).
  purge_protection_enabled   = false # revisit before this vault holds real production secrets
  soft_delete_retention_days = 90

  tags = local.tags
}

resource "azurerm_role_assignment" "key_vault_admins" {
  for_each = var.key_vault_administrators

  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = each.value
}

# Signs session cookies. Generated here so it is never invented by a human, never reused
# across environments, and never pasted into a config — same handling as the DB password.
resource "random_password" "session_secret" {
  length  = 48
  special = false
}

resource "azurerm_key_vault_secret" "session_secret" {
  name         = "session-secret"
  value        = random_password.session_secret.result
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]
}
