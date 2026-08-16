# Managed Postgres, not a container with a volume — containers have no durable disk, and
# Postgres on network-attached storage risks corruption. Flexible Server brings automated
# backups + point-in-time restore for ~$13/mo (Burstable B1ms), closing the "no backups"
# gap that was true of the old Railway setup. See infra-budget-log.md target architecture.

# Generated once, never typed by a human, never written to a .tf file, and never committed
# to git — the app reads it from the vault below.
#
# ⚠️ It IS stored in plaintext in the Terraform state file, as is every value written to the
# vault here. That is unavoidable: Terraform must remember what it created. It means
# **anyone who can read the state file has every secret for this environment**, which is why
# state lives in a private storage account behind Azure AD RBAC rather than anywhere casual.
# See documentation/21_Infrastructure-Conventions.md §5.
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

  # Grows automatically at ~90% full. Without it, a full disk means Postgres stops accepting
  # writes — a hard outage with no warning. The tradeoff is that storage never shrinks back,
  # so runaway growth permanently raises the bill; the storage_percent alert in monitoring.tf
  # exists so that shows up as a warning rather than as a surprise on an invoice.
  auto_grow_enabled = true

  administrator_login    = var.postgres_admin_username
  administrator_password = random_password.postgres_admin.result

  backup_retention_days        = var.postgres_backup_retention_days
  geo_redundant_backup_enabled = false # extra cost, not needed at beta scale

  # Azure auto-assigned this zone at creation since we didn't request one; pinning it here
  # to match reality instead of leaving Terraform wanting to "correct" it to null every plan.
  zone = "2"

  # No VNet integration yet (D15 — before public launch, not before beta). Consumption-plan
  # Container Apps have no static outbound IP without VNet integration, so per-IP firewall
  # rules aren't workable pre-launch anyway; this is the standard interim pattern.
  public_network_access_enabled = true

  tags = local.tags

  # Applies to BOTH environments, deliberately. Terraform requires a literal here — a
  # variable is rejected with "Variables may not be used here" — so this cannot be relaxed
  # per-environment. That's an acceptable outcome: it protects prod (which holds real user
  # data), and D11's "UAT is disposable" still holds in the sense that matters — UAT holds
  # no data worth keeping. Tearing UAT down just requires commenting this block out first,
  # which is a reasonable speed bump in front of dropping a database.
  lifecycle {
    prevent_destroy = true
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

# Azure Postgres Flexible Server refuses `CREATE EXTENSION` unless the extension is
# allow-listed at the server level first — it is not enough for the role to be admin.
# Discovered on the first deploy: migration 20260614090133_add_trgm_entity_search_indexes
# failed with 'extension "pg_trgm" is not allow-listed for users in Azure Database for
# PostgreSQL' after 21 earlier migrations had applied cleanly.
#
# pg_trgm backs the trigram indexes used by entity search (vratmitra lookup by name/username).
# Keep this list in sync with `grep -r "CREATE EXTENSION" apps/api/prisma/migrations/`.
resource "azurerm_postgresql_flexible_server_configuration" "azure_extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "PG_TRGM"
}
