# Publishes a new version of the terms and privacy documents.
#
# Manual trigger, like grant-admin: raising a document's version is what re-prompts **every**
# user for consent, so it is a deliberate act, not something a deploy should do on its own.
#
# The script refuses to act unless the image's version is higher than the database's. An equal
# version is left alone, preserving edits an administrator made through the admin panel; a
# database ahead of the image is refused outright, because that means an older image is deployed
# and publishing would quietly roll the policy backwards.
#
# ⚠️ Do not run this until the consent re-prompt is deployed. The documents promise, in both
# languages, that a material change means being asked to accept again — publishing a new version
# without a working prompt breaks that promise inside the very document being published.
#
# Usage: DEPLOYMENT.md → "Publishing a new version of the policy documents".
resource "azurerm_container_app_job" "publish_policies" {
  count = local.jobs ? 1 : 0

  name                         = "veervrat-${var.environment}-publish-policies"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  container_app_environment_id = azurerm_container_app_environment.this.id

  replica_timeout_in_seconds = 300
  replica_retry_limit        = 0 # idempotent, but a retry would hide a refusal in the logs

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
      name   = "publish-policies"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-api-migrate:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      # Build-stage image: needs ts-node, a devDependency pruned from the runtime image.
      command = ["/bin/sh", "-c"]
      args = [
        "cd /app/apps/api && ./node_modules/.bin/ts-node --transpile-only src/database/publish-policies.ts"
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
