# One environment's stateful core: resource group, Key Vault, Postgres, Redis, and the
# Container Apps Environment those apps will later run inside. Called once per environment
# (envs/uat, envs/prod) with different `environment`/sizing — see variables.tf. Keeping this
# as a module means Phase 2B (prod) is "call this again," not a second hand-written copy that
# can quietly drift from uat's.

locals {
  tags = merge(var.tags, { environment = var.environment })
}

resource "azurerm_resource_group" "this" {
  name     = "veervrat-${var.environment}"
  location = var.location
  tags     = local.tags
}

data "azurerm_client_config" "current" {}
