# Lets GitHub Actions authenticate to Azure **without any stored secret**.
#
# How it works: GitHub mints a short-lived OIDC token describing the workflow run (repo,
# branch or environment). Azure trusts that issuer for the specific subjects listed below and
# exchanges the token for an Azure access token. Nothing long-lived is ever stored in GitHub —
# there is no client secret or publish profile to leak or rotate.
#
# A **user-assigned managed identity** rather than an app registration, deliberately: federated
# credentials work on both, but this needs no Entra app-registration permissions and is managed
# by the same provider as everything else.

resource "azurerm_user_assigned_identity" "github_actions" {
  name                = "veervrat-github-actions"
  resource_group_name = data.azurerm_resource_group.shared.name
  location            = var.location
  tags                = var.tags

  # Retain the legacy object for audit/recovery; retirement removes every trust and grant.
  lifecycle {
    prevent_destroy = true
  }
}

# One credential per trusted context. `subject` must match GitHub's token exactly — a mismatch
# fails at login with a generic "no matching federated identity record found", so keep these
# aligned with the workflow's triggers and environment names.
locals {
  # ⚠️ NOT "owner/repo". After the 2026-08-24 transfer (veer-vrat → omchavan-jp), GitHub started
  # presenting `repo:<owner>@<owner_id>/<repo>@<repo_id>:...` — the plain-path form failed with
  # AADSTS700213 even though the path itself ("omchavan-jp/veervrat-app") was correct. This is
  # GitHub's anti-reuse guard on a renamed/transferred repository: appending the stable numeric
  # IDs stops a *future* different owner who reuses this same path string from inheriting a trust
  # relationship set up for a repo that once lived there. Confirmed against the API, not just the
  # error log: `gh api repos/omchavan-jp/veervrat-app -q '.id, .owner.id'`.
  #
  # If the repo moves again, expect this same failure again — read whatever subject the error
  # names (below), don't assume the plain-path form still applies.
  github_repo = "omchavan-jp@317451750/veervrat-app@1287947867"

  # Every Azure-login job declares a GitHub Environment, so every subject takes the
  # `environment:<name>` form. That is deliberate, and the reason is not obvious:
  #
  # GitHub's subject claim depends on the trigger. A job WITHOUT an `environment:` gets
  # `ref:refs/heads/main` on a branch push but `ref:refs/tags/prod-2026-08-16` on a tag push —
  # so a branch-ref credential silently fails every tag-triggered (i.e. production) run. And
  # federated `subject` is **exact match**: `refs/tags/*` is not a wildcard, it is a literal
  # string that matches nothing.
  #
  # Environment subjects stay identical across triggers; environment ref policies restrict
  # who can reach them. Preparation now has neither Azure login nor OIDC permission.
  #
  # Mismatches fail with AADSTS700213 ("No matching federated identity record found"), naming
  # the subject it presented — read that string and register it verbatim.
  github_federated_subjects = {
    build = "repo:${local.github_repo}:environment:build"
    uat   = "repo:${local.github_repo}:environment:uat"
    prod  = "repo:${local.github_repo}:environment:prod"
  }
}

data "azurerm_subscription" "current" {}

output "github_actions_client_id" {
  description = "Legacy identity retained only for audit/recovery after trust/grant retirement. Never restore it as a deployment variable."
  value       = azurerm_user_assigned_identity.github_actions.client_id
}
