# Grants the ADMIN role to one account, so an environment has a first administrator.
#
# **Why this job has to exist.** The admin dashboard — 10 pages, 25 routes — is gated on the
# ADMIN role. Signup assigns VRATARTHI, the seed creates no users, and the only way to change
# roles is `PATCH /admin/users/:id/roles`, which itself requires ADMIN. Without a way in from
# outside, every environment ships a complete administrative surface that nobody can open.
#
# **Why an env var here, when #40 rejects env-var allowlists.** `CONTENT_EDITOR_USER_IDS` is
# rejected because it costs a full deploy cycle *per person*. This costs one deploy *once per
# environment, ever* — afterwards the admin promotes everyone else through the UI. It also adds
# no trust boundary: anyone who can apply this Terraform already has full Azure access,
# including the database.
#
# **Why a separate job rather than a command override on `seed`.** Convention §21: overriding
# a job's command replaces the whole container spec, and an overridden execution produces no
# retrievable logs. A privileged operation must not run through the one mechanism guaranteed to
# hide what it did. Separate jobs also keep execution history honest — a job named "seed" that
# sometimes grants admin is confusing exactly when logs are being read under pressure.
#
# Default is empty, so the job exists but targets nobody until deliberately pointed at an
# address. Keeping it after use is intentional: the day admin access is lost, this is the way
# back in. Idle jobs are billed nothing.
#
# Usage (see DEPLOYMENT.md):
#   terraform apply -var='bootstrap_admin_email=someone@example.org'
#   az containerapp job start -n veervrat-<env>-grant-admin -g veervrat-<env>
resource "azurerm_container_app_job" "grant_admin" {
  count = local.jobs ? 1 : 0

  name                         = "veervrat-${var.environment}-grant-admin"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  container_app_environment_id = azurerm_container_app_environment.this.id

  replica_timeout_in_seconds = 300
  replica_retry_limit        = 0 # granting admin twice should be a human decision, not a retry

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
      name   = "grant-admin"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-api-migrate:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      # Build-stage image: needs ts-node, a devDependency pruned from the runtime image.
      command = ["/bin/sh", "-c"]
      args = [
        "cd /app/apps/api && ./node_modules/.bin/ts-node --transpile-only src/database/grant-admin.ts"
      ]

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      # Empty means "do nothing and say so" — the job is safe to start unconfigured.
      env {
        name  = "BOOTSTRAP_ADMIN_EMAIL"
        value = var.bootstrap_admin_email
      }

      # Admin is effectively superadmin (any admin can add or remove ADMIN on anyone), so an
      # unverified address is refused by default. The override exists because the recovery
      # case — no admins left, mail relay down — is exactly when this job matters most.
      env {
        name  = "BOOTSTRAP_ADMIN_ALLOW_UNVERIFIED"
        value = var.bootstrap_admin_allow_unverified ? "true" : "false"
      }
    }
  }

  tags = local.tags

  depends_on = [
    azurerm_role_assignment.api_acr_pull,
    azurerm_role_assignment.api_kv_secrets,
  ]
}
