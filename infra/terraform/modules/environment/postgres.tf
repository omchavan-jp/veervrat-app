# Managed Postgres, not a container with a volume — containers have no durable disk, and
# Postgres on network-attached storage risks corruption. Flexible Server brings automated
# backups + point-in-time restore for ~$13/mo (Burstable B1ms), closing the "no backups"
# gap that was true of the old Railway setup. See infra-budget-log.md target architecture.

# Generated once, never typed by a human, never committed anywhere — only ever read from
# the vault below.
resource "random_password" "postgres_admin" {
  length  = 32
  special = false # Postgres connection strings choke on some special characters; length carries the entropy instead
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                = "veervrat-${var.environment}-psql"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location

  sku_name   = var.postgres_sku_name
  version    = var.postgres_version
  storage_mb = var.postgres_storage_mb

  administrator_login    = var.postgres_admin_username
  administrator_password = random_password.postgres_admin.result

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false # extra cost, not needed at beta scale

  # Azure auto-assigned this zone at creation since we didn't request one; pinning it here
  # to match reality instead of leaving Terraform wanting to "correct" it to null every plan.
  zone = "2"

  # No VNet integration yet (D15 — before public launch, not before beta). Consumption-plan
  # Container Apps have no static outbound IP without VNet integration, so per-IP firewall
  # rules aren't workable pre-launch anyway; this is the standard interim pattern.
  public_network_access_enabled = true

  tags = local.tags

  lifecycle {
    prevent_destroy = true # holds real user data once the app is live — same reasoning as the DNS zone
  }
}

# The special "allow Azure services" rule: start == end == 0.0.0.0. Not "allow the whole
# internet" — it permits traffic that Azure itself identifies as coming from an Azure
# resource (like our Container Apps).
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Named database, matching the app's local-dev convention (apps/api/.env.example uses
# .../veervrat?schema=public) — not the server's default "postgres" database.
resource "azurerm_postgresql_flexible_server_database" "veervrat" {
  name      = "veervrat"
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_key_vault_secret" "postgres_admin_password" {
  name         = "postgres-admin-password"
  value        = random_password.postgres_admin.result
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]
}

resource "azurerm_key_vault_secret" "postgres_connection_string" {
  name = "database-url"
  value = format(
    "postgresql://%s:%s@%s:5432/%s?sslmode=require",
    var.postgres_admin_username,
    random_password.postgres_admin.result,
    azurerm_postgresql_flexible_server.this.fqdn,
    azurerm_postgresql_flexible_server_database.veervrat.name,
  )
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]
}
