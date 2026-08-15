# Where built app/api container images will be pushed by the future CD pipeline, and
# pulled from by Container Apps in Phase 2. Basic tier is a flat ~$5/mo (not per-push),
# and pulls from the same region are free — see infra-budget-log.md target architecture.
resource "azurerm_container_registry" "veervrat" {
  name                = "veervratacr"
  resource_group_name = data.azurerm_resource_group.shared.name
  location            = var.location
  sku                 = "Basic"
  admin_enabled       = false # CD pipeline will authenticate via managed identity, not a static admin password

  tags = var.tags
}
