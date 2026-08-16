# Applies Prisma migrations as a deliberate, manually-triggered job — never automatically,
# and never on app startup. A bad migration against real user data is expensive to undo, so
# it is a decision someone makes, not a side effect of deploying.
#
# Why a job inside Azure rather than `prisma migrate deploy` from a laptop:
#   1. Postgres accepts connections from Azure services only. A local run is refused by the
#      firewall, and punching a hole for a home IP leaves an exception to remember to close.
#   2. A laptop's Prisma version can differ from the one the deployed app was built against.
#
# It runs the **build**-stage image (`veervrat-api-migrate`), not the runtime image: the
# `prisma` CLI is a devDependency and is pruned out of the runtime image, which has the
# migration files but not the tool that applies them. Both images come from the same commit,
# so the migrations and the app can never drift apart.
#
# Usage (see DEPLOYMENT.md):
#   az containerapp job start -n veervrat-<env>-migrate -g veervrat-<env>
#   az containerapp job execution list -n veervrat-<env>-migrate -g veervrat-<env> -o table

resource "azurerm_container_app_job" "migrate" {
  count = local.deploy ? 1 : 0

  name                         = "veervrat-${var.environment}-migrate"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  container_app_environment_id = azurerm_container_app_environment.this.id

  # Migrations are quick, but a lock wait shouldn't be killed mid-statement.
  replica_timeout_in_seconds = 900
  replica_retry_limit        = 0 # re-running a partially-applied migration should be a human decision

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  registry {
    server   = data.azurerm_container_registry.shared.login_server
    identity = azurerm_user_assigned_identity.api.id
  }

  secret {
    name                = "database-url"
    key_vault_secret_id = azurerm_key_vault_secret.postgres_connection_string.versionless_id
    identity            = azurerm_user_assigned_identity.api.id
  }

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "migrate"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-api-migrate:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      command = ["/bin/sh", "-c"]
      # `migrate deploy` applies committed migrations only — it never generates a new one and
      # never resets. Schema path is explicit so the pruned prisma.config.ts is not needed.
      args = [
        "cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma"
      ]

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
    }
  }

  tags = local.tags

  depends_on = [
    azurerm_role_assignment.api_acr_pull,
    azurerm_role_assignment.api_kv_secrets,
  ]
}
