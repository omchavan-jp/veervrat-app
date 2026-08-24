# Object storage for uploads (chat images, and whatever else grows into #139's provider seam).
# Azure Blob per O15 — no static access keys anywhere; the api reaches it with its existing
# managed identity, the same pattern already used for Key Vault and ACR.
#
# No `count` gate, matching Postgres and Redis rather than the Container Apps themselves: this
# is core stateful infrastructure that should exist whenever the environment does, independent
# of whether `deploy_apps` happens to be true on a given apply.
#
# Storage account names must be 3–24 lowercase alphanumeric characters and globally unique
# across ALL of Azure, not just this subscription — hence the environment baked into the name
# rather than a separator character, which the naming rule does not allow.
resource "azurerm_storage_account" "uploads" {
  name                     = "veervrat${var.environment}uploads"
  resource_group_name      = azurerm_resource_group.this.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # single-region, matching Postgres/Redis pre-launch (D15) —
  # no cross-region redundancy needed before there is meaningful traffic to protect against a
  # regional outage.
  min_tls_version = "TLS1_2"

  # No network restriction, same posture already accepted for Postgres/Redis pre-launch: the
  # Container Apps Consumption plan has no VNet integration without a static outbound IP (D15),
  # so an IP-based rule is not workable yet. Access is secured by managed-identity RBAC instead,
  # not by network boundary.

  tags = local.tags
}

# Public read at the BLOB level (not the container listing level) — matches the S3/MinIO
# provider's existing behaviour exactly: `put()` returns a plain URL with no signature, and
# anyone holding that URL can fetch it. Changing that is a real product decision (issue #139
# scoped this to the interface + the Blob implementation, not to redesigning upload visibility)
# and is not made here.
resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_id    = azurerm_storage_account.uploads.id
  container_access_type = "blob"
}

# Read/write the blob data itself.
resource "azurerm_role_assignment" "api_storage_blob" {
  scope                = azurerm_storage_account.uploads.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.api.principal_id
}

# Separate from Data Contributor on purpose: generating a user delegation key (what
# `AzureBlobStorageProvider.signedUrl` calls on every request, deliberately never cached — see
# that file) is its own control-plane operation, not a data-plane read/write.
resource "azurerm_role_assignment" "api_storage_delegator" {
  scope                = azurerm_storage_account.uploads.id
  role_definition_name = "Storage Blob Delegator"
  principal_id         = azurerm_user_assigned_identity.api.principal_id
}
