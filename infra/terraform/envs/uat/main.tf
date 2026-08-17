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

  # Same storage account as envs/shared (bootstrap/create-state-backend.sh), but its own
  # file — `key` is what keeps UAT's state (and therefore blast radius) separate from
  # shared's and, later, prod's.
  backend "azurerm" {
    resource_group_name  = "veervrat-shared"
    storage_account_name = "veervrattfstate"
    container_name       = "tfstate"
    key                  = "uat.tfstate"
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
# running: terraform apply -var="image_tag=$(git rev-parse --short HEAD)" -var="deploy_apps=true"
variable "image_tag" {
  description = "Git SHA of the images to run. Empty = infra only, no apps."
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

module "environment" {
  source      = "../../modules/environment"
  environment = "uat"

  # Custom hostnames bound 2026-08-17 (O1). These are the origins browsers use, so CORS and
  # every generated link must be built from them rather than the *.azurecontainerapps.io FQDN.
  public_web_host = "uat.veervrat.jnanaprabodhini.org"
  public_api_host = "api.uat.veervrat.jnanaprabodhini.org"

  # Nachiket reviews unreleased changes here, so the widget is on for everyone.
  feedback_mode = "test"

  # Outbound email via JP IT's relay (D9). The password is NOT here — Terraform creates the
  # Key Vault secret with a placeholder and the real value is set out of band; see
  # modules/environment/keyvault.tf.
  smtp_host  = "dhoomketu.in"
  smtp_port  = 587
  smtp_user  = "do-not-reply-veervrat@notifications.jnanaprabodhini.org"
  email_from = "Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>"

  image_tag       = var.image_tag
  app_image_tag   = var.app_image_tag
  deploy_apps     = var.deploy_apps
  migrate_command = var.migrate_command

  # UAT is disposable and has no real users: scale to zero when idle (free), and keep the
  # per-replica connection count low so it cannot exhaust Burstable Postgres.
  api_min_replicas  = 0
  web_min_replicas  = 0
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

variable "migrate_command" {
  description = "Prisma CLI subcommand the migration job runs. Override to recover a failed migration."
  type        = string
  default     = "migrate deploy"
}
