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

  # Stays off until B1 lands per-user grants — D20 says which users see it is data, not config.
  feedback_mode = "off"

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

  # min_replicas stays 0 (scale-to-zero, free while idle) even for prod, DELIBERATELY, for
  # now: D11 (beta testers live on prod) is under active reconsideration in O7 now that the
  # Neon migration is cancelled, and there are no real users routed here yet. Revisit to 1
  # (no cold start) once O7 lands and real traffic is expected.
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
