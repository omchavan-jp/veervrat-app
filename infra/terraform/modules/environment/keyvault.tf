# Holds this environment's secrets ONLY (DB password, Redis key, session secret, OAuth
# secret, Resend key). Deliberately per-environment, not shared — a compromised or
# misconfigured UAT app must not be able to read the production database password.
# See documentation/21_Infrastructure-Conventions.md §9-10 for the full reasoning.
resource "azurerm_key_vault" "this" {
  name                = "veervrat-${var.environment}-kv"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  rbac_authorization_enabled = true

  # 90 = the maximum and Azure's default, set correctly at creation because this value is
  # immutable after creation (Phase 1 lesson — see conventions doc §10).
  purge_protection_enabled   = false # revisit before this vault holds real production secrets
  soft_delete_retention_days = 90

  tags = local.tags
}

resource "azurerm_role_assignment" "key_vault_admins" {
  for_each = var.key_vault_administrators

  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = each.value
}

# Signs session cookies. Generated here so it is never invented by a human, never reused
# across environments, and never pasted into a config — same handling as the DB password.
resource "random_password" "session_secret" {
  length  = 48
  special = false
}

resource "azurerm_key_vault_secret" "session_secret" {
  name         = "session-secret"
  value        = random_password.session_secret.result
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]
}

# SMTP password for JP IT's mail relay (D9).
#
# Terraform owns this secret's EXISTENCE but deliberately not its VALUE. The real password is
# JP's, not ours to generate, and putting it in a variable would place it in the state file and
# in whatever shell history or CI log the `-var` passed through. Instead the resource is created
# with a placeholder and the real value is set once, out of band:
#
#   az keyvault secret set --vault-name veervrat-<env>-kv --name smtp-password \
#     --value "$(grep '^SMTP_PASS=' ~/.secrets/veervrat/smtp-jp.env | cut -d= -f2-)"
#
# `ignore_changes = [value]` is what makes that stable: without it, the next apply would revert
# the real password to the placeholder and email would silently stop working. Note the value
# still lands in state (§5) — this keeps the secret out of git and CI, not out of state.
resource "azurerm_key_vault_secret" "smtp_password" {
  name         = "smtp-password"
  value        = "placeholder-set-out-of-band"
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]

  lifecycle {
    ignore_changes = [value]
  }
}

# Google OAuth client secret.
#
# Same pattern and the same reasoning as smtp-password above: Terraform owns the secret's
# existence, never its value. Previously this was passed straight through as a plain container
# env value, which put the real secret in Terraform state *and* left it readable to anyone who
# could run `az containerapp show` — a wider blast radius than the database password, which has
# always been a Key Vault reference. Moved before real credentials existed rather than after.
#
# Set the real value out of band, per environment:
#
#   az keyvault secret set --vault-name veervrat-<env>-kv --name google-client-secret \
#     --value "$(python3 -c 'import json;print(json.load(open("<downloaded>.json"))["web"]["client_secret"])')"
#
# The client ID is NOT secret — it is sent to the browser on every sign-in — so it stays a
# plain variable.
resource "azurerm_key_vault_secret" "google_client_secret" {
  name         = "google-client-secret"
  value        = "placeholder-set-out-of-band"
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]

  lifecycle {
    ignore_changes = [value]
  }
}
