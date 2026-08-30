# Nightly database dump, encrypted, into Blob (#131, openspec/changes/offsite-backup).
#
# ⚠️ This job alone does not satisfy #131. What it produces sits in the same subscription as the
# database it protects, so it survives deletion, corruption and operator error — not the loss of
# the subscription, which is the risk the change exists for. The copy that counts is pulled out of
# here to a machine that is not Azure, and until that pull runs, a green job here means nothing
# about whether a usable backup exists.
#
# The second scheduled job, after cleanup-expired. Like that one it needs no confirmation guard:
# it only reads, and running it twice produces a second dump rather than damaging anything.
resource "azurerm_container_app_job" "backup" {
  count = local.jobs ? 1 : 0

  name                         = "veervrat-${var.environment}-backup"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  container_app_environment_id = azurerm_container_app_environment.this.id

  # Generous next to cleanup-expired's 600s. A dump is bounded by data size rather than by query
  # count, and the failure this timeout should catch is a hung connection, not a large database.
  replica_timeout_in_seconds = 1800

  # Worth retrying, for the same reason as cleanup-expired: a transient database or storage blip
  # should not mean a day has no dump. The upload uses --overwrite=false, and each run names its
  # file by timestamp, so a retry cannot damage the previous attempt's output.
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

  secret {
    name                = "backup-encryption-key"
    key_vault_secret_id = azurerm_key_vault_secret.backup_encryption_key.versionless_id
    identity            = azurerm_user_assigned_identity.api.id
  }

  # Container Apps cron is UTC. 21:30 UTC is 03:00 IST — an hour after cleanup-expired, so the
  # dump is taken after the nightly sweep has removed expired sessions and tokens rather than
  # capturing rows that are about to disappear.
  schedule_trigger_config {
    cron_expression          = "30 21 * * *"
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "backup"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-backup:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name        = "BACKUP_ENCRYPTION_KEY"
        secret_name = "backup-encryption-key"
      }

      env {
        name  = "BACKUP_STORAGE_ACCOUNT"
        value = azurerm_storage_account.backups.name
      }

      env {
        name  = "BACKUP_CONTAINER"
        value = azurerm_storage_container.backups.name
      }

      # azcopy needs to be told WHICH identity, because the container app has a user-assigned one
      # rather than a system-assigned one — with a user-assigned identity, IMDS cannot infer the
      # answer and returns an error naming none of this.
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.api.client_id
      }

      # 30 days. Above UAT's 7-day managed window and below prod's 35, and short enough that the
      # pile stays small at this data size. It is a number the privacy policy has to be able to
      # state, so it lives here rather than in somebody's memory.
      env {
        name  = "BACKUP_RETENTION_DAYS"
        value = "30"
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
    azurerm_role_assignment.backup_storage_blob,
  ]
}
