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

  # ⚠️ A hard ceiling on ingestion, because there was none and it cost ₹19,230 in about twelve
  # hours — 98% of a month's entire bill, against infrastructure that otherwise costs ₹306.
  #
  # On 2026-08-31 a BullMQ worker could not talk to a CLUSTERED Redis, failed several hundred times
  # a second, and every failure was logged. 3.3 million lines an hour, ~53 GB a day, billed by
  # volume. Both the connection bug and the unthrottled logging are fixed — this exists because the
  # NEXT such bug should cost a known amount instead of an unbounded one.
  #
  # 2 GB/day is roughly forty times a normal day here (measured: ~2,000 lines per six hours before
  # the fault, against 19 million during). Past the cap ingestion stops until midnight UTC and
  # queries still work, so the failure mode is losing logs — recoverable — rather than losing money.
  #
  # ⚠️ This is a CAP, not an alert. If logs go missing, look here first: `dailyQuotaGb` on the
  # workspace, and `_LogOperation | where Detail contains "daily limit"` for when it tripped.
  daily_quota_gb = 2

  tags = local.tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = "veervrat-${var.environment}-cae"
  resource_group_name        = azurerm_resource_group.this.name
  location                   = var.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  tags = local.tags
}
