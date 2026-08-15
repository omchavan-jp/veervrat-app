terraform {
  required_version = ">= 1.15"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  # Where Terraform's state file (its record of what it has created) lives.
  # Created once by hand — see infra/terraform/bootstrap/create-state-backend.sh.
  backend "azurerm" {
    resource_group_name  = "veervrat-shared"
    storage_account_name = "veervrattfstate"
    container_name       = "tfstate"
    key                  = "shared.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {
    key_vault {
      # Soft-deleted vaults still count against the name for 90 days by default;
      # this lets `terraform destroy` actually free the name back up if we ever
      # tear this environment down (not expected, but cheap to allow).
      purge_soft_delete_on_destroy = true
    }
  }
}

data "azurerm_resource_group" "shared" {
  name = "veervrat-shared"
}

data "azurerm_client_config" "current" {}
