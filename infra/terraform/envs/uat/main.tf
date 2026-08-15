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

module "environment" {
  source      = "../../modules/environment"
  environment = "uat"
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
