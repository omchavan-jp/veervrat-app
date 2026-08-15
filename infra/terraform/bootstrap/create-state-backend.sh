#!/usr/bin/env bash
# One-time setup for Terraform's remote state storage.
#
# Terraform needs somewhere to keep a record of what it has created ("state").
# That storage can't be created BY Terraform, because Terraform would need
# state to know it exists — chicken and egg. So this one thing is created by
# hand, once, via the Azure CLI, and never touched again. Same reasoning as
# why the DNS zone was hand-created (see azure-account-facts.md §5).
#
# Safe to re-run: every command below is idempotent (create-if-not-exists).
set -euo pipefail

RESOURCE_GROUP="veervrat-shared"
LOCATION="centralindia"
STORAGE_ACCOUNT="veervrattfstate"
CONTAINER="tfstate"

echo "==> Resource group ($RESOURCE_GROUP)"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags project=veervrat environment=shared \
  --output none
echo "    ok (already existed, or just created)"

echo "==> Storage account ($STORAGE_ACCOUNT)"
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --tags project=veervrat environment=shared managed-by=manual-bootstrap \
  --output none
echo "    ok"

echo "==> Blob versioning + soft delete (protects the state file itself)"
az storage account blob-service-properties update \
  --account-name "$STORAGE_ACCOUNT" \
  --enable-versioning true \
  --enable-delete-retention true \
  --delete-retention-days 30 \
  --output none
echo "    ok"

echo "==> Container ($CONTAINER) — using Azure AD auth, not an account key"
az storage container create \
  --name "$CONTAINER" \
  --account-name "$STORAGE_ACCOUNT" \
  --auth-mode login \
  --output none
echo "    ok"

echo "==> Granting the current user Storage Blob Data Contributor"
USER_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
SCOPE=$(az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az role assignment create \
  --assignee-object-id "$USER_OBJECT_ID" \
  --assignee-principal-type User \
  --role "Storage Blob Data Contributor" \
  --scope "$SCOPE" \
  --output none 2>/dev/null || echo "    (already assigned)"
echo "    ok"

echo ""
echo "Done. Backend config for envs/*/main.tf:"
echo "  resource_group_name = \"$RESOURCE_GROUP\""
echo "  storage_account_name = \"$STORAGE_ACCOUNT\""
echo "  container_name       = \"$CONTAINER\""
