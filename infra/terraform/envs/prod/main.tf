terraform {
  required_version = ">= 1.15"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Same storage account as envs/shared and envs/uat, but its own state file — `key` is what
  # keeps prod's blast radius separate: Terraform here has no knowledge of UAT's resources.
  backend "azurerm" {
    resource_group_name  = "veervrat-shared"
    storage_account_name = "veervrattfstate"
    container_name       = "tfstate"
    key                  = "prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

# Set per deploy rather than committed, so the tag in state always reflects what is actually
# running: terraform apply -var="image_tag=<sha already proven on UAT>" -var="deploy_apps=true"
variable "image_tag" {
  description = "Git SHA of the images to run. MUST already exist in the registry — promoted from UAT, never rebuilt for prod. Empty = infra only, no apps."
  type        = string
  default     = ""
}

variable "deploy_apps" {
  description = "Create the api/web Container Apps. Jobs (migrate, seed) are NOT gated on this — they must exist before apps deploy."
  type        = bool
  default     = false
}

# Set by CD to hold the apps on the image they are currently serving while migrations run
# against the new one. Empty = follow image_tag.
variable "app_image_tag" {
  description = "Image the apps run, when it must differ from image_tag."
  type        = string
  default     = ""
}

variable "migrate_command" {
  description = "Prisma CLI subcommand the migration job runs. Override to recover a failed migration."
  type        = string
  default     = "migrate deploy"
}

variable "wipe_users_confirm" {
  description = "Must equal the environment name for the wipe-users job to act. Empty = inert."
  type        = string
  default     = ""
}

variable "bootstrap_admin_email" {
  description = "Email of the account to grant ADMIN via the grant-admin job. Empty = no target."
  type        = string
  default     = ""
}

variable "bootstrap_admin_allow_unverified" {
  description = "Allow granting ADMIN to an unverified email address. Recovery escape hatch."
  type        = bool
  default     = false
}

module "environment" {
  source      = "../../modules/environment"
  environment = "prod"

  # Custom hostnames bound 2026-08-17 (O1). These are the origins browsers use, so CORS and
  # every generated link must be built from them rather than the *.azurecontainerapps.io FQDN.
  public_web_host = "veervrat.jnanaprabodhini.org"
  public_api_host = "api.veervrat.jnanaprabodhini.org"
  # Never on prod, for anyone (O7). Belt and braces: the API also refuses content.edit
  # outright when ENVIRONMENT=prod, so this flag is not the only thing standing in the way.
  content_edit_enabled = false

  # Per-user (D20/#40): which users see the widget is data, managed from the admin dashboard,
  # not config. The API enforces this too — it is not just a hidden control.
  feedback_mode = "granted"

  # Outbound email via JP IT's relay (D9). The password is NOT here — Terraform creates the
  # Key Vault secret with a placeholder and the real value is set out of band; see
  # modules/environment/keyvault.tf.
  smtp_host  = "dhoomketu.in"
  smtp_port  = 587
  smtp_user  = "do-not-reply-veervrat@notifications.jnanaprabodhini.org"
  email_from = "Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>"

  # Google sign-in (O23). The client ID is public — it is sent to the browser on every sign-in.
  # The matching secret is a Key Vault reference, set out of band; see keyvault.tf.
  google_client_id = "294902498600-98q6nt66turinrh8s910g0aeeq03q457.apps.googleusercontent.com"

  wipe_users_confirm               = var.wipe_users_confirm
  bootstrap_admin_email            = var.bootstrap_admin_email
  bootstrap_admin_allow_unverified = var.bootstrap_admin_allow_unverified

  image_tag       = var.image_tag
  app_image_tag   = var.app_image_tag
  deploy_apps     = var.deploy_apps
  migrate_command = var.migrate_command

  # 35 is the Postgres Flexible Server maximum. Set now, while the server is empty and this
  # value is immutable after creation (see documentation/21_Infrastructure-Conventions.md
  # §10 — soft_delete_retention_days on Key Vault taught this lesson the hard way once
  # already; not repeating it here). UAT's 7 days is fine for disposable content.
  postgres_backup_retention_days = 35

  # Always-on, from 2026-08-22 (#92). Scale-to-zero costs nothing while idle, but the first
  # request after ~5 minutes idle pays TWO cold starts in series — web boots to serve the shell,
  # then the browser calls /auth/me and the api boots too. Measured 5–20s, against ~40ms warm.
  #
  # BOTH tiers, not just api: setting only one leaves the other's cold start in the path, so the
  # user still waits.
  #
  # ⚠️ **Set back to 1 before the first beta tester is invited.** Tracked as #92.
  #
  # Applied to prod manually on 2026-08-27 (cd.yml applies prod terraform only on a `prod-*`
  # tag, so merging this file alone would have changed nothing there).
  #
  # 🛑 If you run terraform here by hand, pass the same variables CD does:
  #     -var="deploy_apps=true" -var="image_tag=<current>" -var="app_image_tag=<current>"
  # `deploy_apps` defaults to FALSE, and a bare `terraform plan` against prod therefore reports
  # **8 to destroy** — the api and web Container Apps and the migration job. This has bitten
  # before; see the note in .github/actions/deploy-environment/action.yml.
  #
  # Was 1, on the reasoning that keeping prod warm costs ~$14–20/month and buys a first
  # impression, and that flipping it at the right moment is a thing one forgets. That reasoning
  # still holds — the risk has not gone away, it has been accepted deliberately (2026-08-27):
  # prod has no users at all, UAT is where every verification actually happens, and paying to
  # keep an empty environment warm while the one being used goes cold is the wrong way round.
  #
  # The cost of forgetting is unchanged and real: the first tester ever to open the app waits
  # twenty seconds and concludes it is broken. #92 exists to make sure that does not happen.
  api_min_replicas = 0
  web_min_replicas = 0

  # Same Burstable Postgres ceiling as UAT: DATABASE_POOL_MAX × api_max_replicas + headroom
  # must stay under the server's max_connections.
  database_pool_max = 5
}

output "resource_group_name" {
  value = module.environment.resource_group_name
}

output "key_vault_name" {
  value = module.environment.key_vault_name
}

output "postgres_fqdn" {
  value = module.environment.postgres_fqdn
}

output "redis_hostname" {
  value = module.environment.redis_hostname
}

output "api_url" {
  value = module.environment.api_url
}

output "web_url" {
  value = module.environment.web_url
}
