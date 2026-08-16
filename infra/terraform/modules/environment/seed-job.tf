# Loads reference content — virtues, subvirtues, weaknesses, sentences, exposures,
# resolutions, challenges. Without it a migrated database is *serving* but not *usable*: you
# cannot take a weakness test or start a journey against empty reference tables.
#
# **Deliberately a separate job, not a Prisma migration.** Migrations are schema — one-shot,
# forward-only, and uneditable once applied anywhere. Seed is content: idempotent
# (`src/database/seed.ts` upserts and uses `skipDuplicates`) and re-runnable. Folding it into
# a migration would make every content correction — a new virtue, fixed Marathi wording — an
# unrepeatable schema change. The two also change on different cadences and get different
# review.
#
# It is also a *separate job* from `migrate` rather than a command override on it, so that
# execution history and logs say what actually ran. A job named "migrate" that sometimes
# seeds is confusing exactly when you are reading logs under pressure.
#
# Runs the build-stage image because it needs `ts-node` — a devDependency, pruned out of the
# runtime image, same as the `prisma` CLI.
#
# Per O11, UAT holds seeded reference data and never real users.
#
# Usage:
#   az containerapp job start -n veervrat-<env>-seed -g veervrat-<env>
resource "azurerm_container_app_job" "seed" {
  count = local.jobs ? 1 : 0

  name                         = "veervrat-${var.environment}-seed"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  container_app_environment_id = azurerm_container_app_environment.this.id

  replica_timeout_in_seconds = 1800 # seeding writes a lot of rows; slower than a migration
  replica_retry_limit        = 0    # idempotent, but a failure mid-run deserves a human look

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
      name   = "seed"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-api-migrate:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      command = ["/bin/sh", "-c"]
      args = [
        "cd /app/apps/api && ./node_modules/.bin/ts-node --transpile-only src/database/seed.ts"
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
