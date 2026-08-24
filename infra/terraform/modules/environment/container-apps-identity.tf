# Managed identities for the apps. This is what replaces registry passwords and connection
# strings in env vars: the platform authenticates as the app's own identity.
#
# **User-assigned**, not system-assigned, for a specific reason: a system-assigned identity
# does not exist until the app is created, but the app cannot pull its image or read its
# secrets without the role grants — and the grants need the identity's principal_id. That is
# a genuine dependency cycle Terraform refuses to resolve. Creating the identity as its own
# resource breaks it: identity → grants → app.
#
# One identity per app rather than a shared one, so web (which needs no secrets) never holds
# Key Vault access.

resource "azurerm_user_assigned_identity" "api" {
  name                = "veervrat-${var.environment}-api-id"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tags                = local.tags
}

resource "azurerm_user_assigned_identity" "web" {
  name                = "veervrat-${var.environment}-web-id"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tags                = local.tags
}

resource "azurerm_role_assignment" "api_acr_pull" {
  scope                = data.azurerm_container_registry.shared.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.api.principal_id
}

resource "azurerm_role_assignment" "web_acr_pull" {
  scope                = data.azurerm_container_registry.shared.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.web.principal_id
}

# Read-only on secret *values* — deliberately not Key Vault Administrator. The app never
# writes secrets; Terraform does.
resource "azurerm_role_assignment" "api_kv_secrets" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.api.principal_id
}

# The web identity's first Key Vault access — nothing it read before this needed one, since
# every other web env var is a plain runtime value (§17), never a secret. It needs the browser
# Sentry DSN, which is not a credential (see runtime-config.ts) but is created as a Key Vault
# secret to match how it is already handled on the api side.
resource "azurerm_role_assignment" "web_kv_secrets" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.web.principal_id
}
