# Staging for the database dumps that leave Azure (#131, openspec/changes/offsite-backup).
#
# ⚠️ What lands here is NOT the off-site copy. It is in the same subscription as the database it
# protects, so it survives deletion, corruption and operator error — and not the loss of the
# subscription, which is the risk this whole change exists for. The copy that counts is the one
# pulled out of here to a machine that is not Azure.
#
# A separate account from `uploads`, not another container on it. Two reasons, both practical:
# the name would otherwise lie about what it holds, and a dump is a different security class from
# a chat image — a mistake that exposes uploads should not also expose every personal record the
# platform holds.
resource "azurerm_storage_account" "backups" {
  name                     = "veervrat${var.environment}backups"
  resource_group_name      = azurerm_resource_group.this.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Same reasoning as uploads: cross-region redundancy is not
  # what protects this data. Leaving the subscription is, and that is the pull's job.
  min_tls_version = "TLS1_2"

  # Never public, at any level. The uploads account has a deliberately public container for blog
  # images; there is no equivalent here and there must never be one.
  allow_nested_items_to_be_public = false

  tags = local.tags
}

resource "azurerm_storage_container" "backups" {
  name                  = "database-dumps"
  storage_account_id    = azurerm_storage_account.backups.id
  container_access_type = "private"
}

# The passphrase the dump is encrypted with, generated here and never written to a file.
#
# ⚠️ A copy MUST live outside Azure — see openspec/changes/offsite-backup/design.md §2. If the
# subscription is what was lost, so is this vault, and every surviving dump is ciphertext nobody
# can open: a backup failing in exactly the scenario it was built for. Bitwarden holds that copy,
# shared with a second maintainer, because a backup only one person can decrypt is not a backup
# for the organisation.
#
# `special = false` for the same reason as the Postgres admin password: this is passed through a
# shell to `openssl`, and quoting mistakes in a restore performed under pressure are a failure
# mode worth designing out. Length carries the entropy.
resource "random_password" "backup_encryption" {
  length  = 48
  special = false
}

resource "azurerm_key_vault_secret" "backup_encryption_key" {
  name         = "backup-encryption-key"
  value        = random_password.backup_encryption.result
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]
}

# The backup job writes here; nothing else does. Same managed-identity posture as everything
# else — no static access keys, per O15.
resource "azurerm_role_assignment" "backup_storage_blob" {
  scope                = azurerm_storage_account.backups.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.api.principal_id
}

# And the humans who have to pull the dumps out.
#
# Without this the whole change does not work: `scripts/pull-backups.sh` authenticates as the
# person running it, not as the job's identity, so it could list nothing and download nothing.
# Confirmed the hard way on 2026-08-30 — "you do not have the required permissions" against a
# container this same Terraform had just created.
#
# **Reader, not Contributor.** The pull only reads; the job does the deleting, on a schedule, with
# the retention window in one place. A human able to delete from here could remove the only copy
# outside Azure by mistake, and there is no version history behind it to undo that.
#
# Reuses `key_vault_administrators` rather than introducing a second list of people. The two sets
# are the same by nature — whoever can read the decryption key is whoever can usefully read the
# dumps — and two lists would eventually disagree, silently, in whichever direction is worse.
resource "azurerm_role_assignment" "backup_storage_admins" {
  for_each = var.key_vault_administrators

  scope                = azurerm_storage_account.backups.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = each.value
}
