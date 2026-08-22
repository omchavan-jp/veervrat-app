# Deletes rows that have expired and serve no further purpose: sessions, verification tokens and
# pending signups. Nothing removed these, so every session anyone simply closed the tab on stayed
# forever — unbounded growth on the table every authenticated request reads (#77).
#
# The only job here on a schedule rather than a manual trigger. It needs no confirmation guard,
# unlike wipe-users: every row it touches is already unusable, so running it twice, or during
# live traffic, changes nothing a user could have used.
resource "azurerm_container_app_job" "cleanup_expired" {
  count = local.jobs ? 1 : 0

  name                         = "veervrat-${var.environment}-cleanup-expired"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  container_app_environment_id = azurerm_container_app_environment.this.id

  replica_timeout_in_seconds = 600
  # Worth retrying, unlike a destructive job: a transient database blip should not mean the
  # sweep silently skips a day.
  replica_retry_limit = 1

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

  # Container Apps cron is UTC. 20:30 UTC is 02:00 IST — the quietest hour for this audience,
  # rather than the quietest hour somewhere else.
  schedule_trigger_config {
    cron_expression          = "30 20 * * *"
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "cleanup-expired"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-api-migrate:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      # Build-stage image: needs ts-node, a devDependency pruned from the runtime image.
      command = ["/bin/sh", "-c"]
      args = [
        "cd /app/apps/api && ./node_modules/.bin/ts-node --transpile-only src/database/cleanup-expired.ts"
      ]

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
    }
  }

  tags = local.tags

  depends_on = [
    azurerm_role_assignment.api_acr_pull,
    azurerm_role_assignment.api_kv_secrets,
  ]
}
