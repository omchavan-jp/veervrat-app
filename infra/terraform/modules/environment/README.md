# environment

## Overview

Assigned files define environment logging, Container Apps execution, scheduled expiry cleanup, and encrypted backup staging and scheduling. [container-apps-env.tf:azurerm_container_app_environment.this] [cleanup-expired-job.tf:cleanup_expired] [backup-job.tf:backup]

## Interface

- Jobs use the API managed identity, registry and Key Vault database secret; backup also receives encryption key, storage account, container, retention and MSI settings. [cleanup-expired-job.tf:identity] [backup-job.tf:secret] [backup-job.tf:BACKUP_RETENTION_DAYS]
- Inputs include environment, location, tags, deployment and image tags/refs, registry, hostnames, scaling, SMTP, OAuth, database, Redis, alerts and job settings [main.tf:local.tags] [container-apps.tf:local.deploy] [container-apps.tf:local.api_image_ref] [container-apps.tf:local.web_origin] [grant-admin-job.tf:BOOTSTRAP_ADMIN_EMAIL] [migration-job.tf:var.migrate_command] [postgres.tf:azurerm_postgresql_flexible_server.this] [redis.tf:azurerm_managed_redis.this] [monitoring.tf:var.alert_email_recipients]. Outputs expose resource group, vault, database and Redis endpoints, Container Apps environment and conditional app URLs [outputs.tf:resource_group_name] [outputs.tf:key_vault_uri] [outputs.tf:postgres_fqdn] [outputs.tf:redis_hostname] [outputs.tf:container_app_environment_id] [outputs.tf:api_url] [outputs.tf:web_url].
- Inputs configure Azure location, storage, images, scaling, access gates, hostnames, SMTP, admin and wipe controls. [variables.tf:location] [variables.tf:image_refs] [variables.tf:content_edit_enabled] [variables.tf:smtp_host] [variables.tf:wipe_users_confirm]

## Invariants

- Logs retain 30 days with a 2 GB daily cap; cleanup runs at 20:30 UTC and backup at 21:30 UTC; backup storage is private and backup retention is 30 days. [container-apps-env.tf:daily_quota_gb] [cleanup-expired-job.tf:cron_expression] [backup-job.tf:cron_expression] [backup-storage.tf:container_access_type] [backup-job.tf:BACKUP_RETENTION_DAYS]
- Apps require deploy_apps and a nonempty image tag; jobs require an image tag independently, with app_image_tag allowing jobs and apps to use different image versions during migration [container-apps.tf:local.deploy] [container-apps.tf:local.jobs] [container-apps.tf:local.app_image]. User-assigned API and web identities receive registry and vault roles before app creation [container-apps-identity.tf:api_acr_pull] [container-apps-identity.tf:web_acr_pull] [container-apps-identity.tf:api_kv_secrets] [container-apps-identity.tf:web_kv_secrets] [container-apps.tf:azurerm_container_app.api] [container-apps.tf:azurerm_container_app.web]. Postgres prevents destruction and allows Azure services, while Redis uses encrypted connections and LRU eviction [postgres.tf:prevent_destroy] [postgres.tf:allow_azure_services] [redis.tf:default_database]. Upload containers distinguish private data from public blob reads [storage.tf:azurerm_storage_container.uploads] [storage.tf:azurerm_storage_container.uploads_public].
- Environment is uat or prod; image_refs must be empty or exactly four approved registry references; proxy hops must be a positive integer. [variables.tf:environment] [variables.tf:image_refs] [variables.tf:trust_proxy_hops]

## Side Effects

- Scheduled cleanup deletes expired rows; backup writes encrypted database dumps to Blob, while the separate off-site pull is needed for an outside-Azure copy. [cleanup-expired-job.tf:cleanup_expired] [backup-storage.tf:azurerm_storage_account.backups]
- Terraform creates Azure infrastructure, generates credentials and stores secrets, whose values can be present in Terraform state [postgres.tf:random_password.postgres_admin] [keyvault.tf:random_password.session_secret] [postgres.tf:azurerm_key_vault_secret.postgres_connection_string]. SMTP, Google OAuth and Sentry secret resources retain out-of-band values through ignore_changes [keyvault.tf:azurerm_key_vault_secret.smtp_password] [keyvault.tf:azurerm_key_vault_secret.google_client_secret] [keyvault.tf:azurerm_key_vault_secret.sentry_dsn]. Manually triggered jobs apply migrations, seed reference data, grant an admin role and publish policies; each has zero retries [migration-job.tf:azurerm_container_app_job.migrate] [seed-job.tf:azurerm_container_app_job.seed] [grant-admin-job.tf:azurerm_container_app_job.grant_admin] [publish-policies-job.tf:azurerm_container_app_job.publish_policies]. Storage growth above 80 percent triggers an hourly metric alert to configured recipients [monitoring.tf:azurerm_monitor_metric_alert.postgres_storage] [monitoring.tf:azurerm_monitor_action_group.ops].
- The conditionally created manual wipe-users job uses a Key Vault database secret, has no retries, and defaults to no action. The script requires confirmation matching the environment, refuses more than 50 accounts, and truncates users with cascading removal of dependent data. [wipe-users-job.tf:azurerm_container_app_job.wipe_users] [variables.tf:wipe_users_confirm] [../../../../apps/api/src/database/wipe-users.ts:wipeUsers]

## Verification

Follow the repository’s existing review procedures before running infrastructure operations.
