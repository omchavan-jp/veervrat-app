# Removes every user and everything belonging to them, leaving seeded reference content and the
# policy documents intact. For resetting a pre-launch environment.
#
# ⚠️ THE MOST DESTRUCTIVE JOB IN THIS INFRASTRUCTURE. Three guards, each covering a different way
# this could go wrong:
#
#   1. `wipe_users_confirm` is empty by default, so the job exists and targets nothing.
#   2. The confirmation must NAME the environment being wiped. A boolean, or a value like "yes",
#      could be left set in one environment's configuration and carried into another by a copied
#      file; a value naming a different environment does nothing.
#   3. The script refuses above fifty accounts. Wiping is defensible only while the data is
#      disposable, and that number cannot be a real user base.
#
# Why it exists for production too: production is pre-launch, and needs the same reset. Once real
# users exist, guard 3 refuses on its own — and at that point this job should be removed rather
# than left as a loaded mechanism with nothing legitimate left to do.
#
# Usage (see DEPLOYMENT.md):
#   terraform apply -var='wipe_users_confirm=uat'
#   az containerapp job start -n veervrat-uat-wipe-users -g veervrat-uat
#   terraform apply            # reset the variable immediately afterwards
resource "azurerm_container_app_job" "wipe_users" {
  count = local.jobs ? 1 : 0

  name                         = "veervrat-${var.environment}-wipe-users"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  container_app_environment_id = azurerm_container_app_environment.this.id

  replica_timeout_in_seconds = 300
  replica_retry_limit        = 0 # never retry a destructive operation

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
      name   = "wipe-users"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-api-migrate:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      command = ["/bin/sh", "-c"]
      args = [
        "cd /app/apps/api && ./node_modules/.bin/ts-node --transpile-only src/database/wipe-users.ts"
      ]

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      # Must equal ENVIRONMENT below for the job to do anything. Empty means "do nothing and say
      # so", which is what makes the job safe to start unconfigured.
      env {
        name  = "WIPE_USERS_CONFIRM"
        value = var.wipe_users_confirm
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
