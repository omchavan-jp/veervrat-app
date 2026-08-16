# The execution context future `web`/`api` Container Apps will run inside — think of it as
# the empty building, before any tenants move in. Costs nothing by itself; only apps running
# inside it are billed. Deliberately created without any apps yet — those need a real image
# in ACR, which needs the CD pipeline (next in the working order after this).
#
# Container Apps requires a Log Analytics workspace for its logs — the only piece of this
# file with an ongoing cost, and a small one at this log volume.
resource "azurerm_log_analytics_workspace" "this" {
  name                = "veervrat-${var.environment}-logs"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location

  sku               = "PerGB2018"
  retention_in_days = 30

  tags = local.tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = "veervrat-${var.environment}-cae"
  resource_group_name        = azurerm_resource_group.this.name
  location                   = var.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  tags = local.tags
}
