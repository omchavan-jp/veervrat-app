# Auto-grow (postgres.tf) prevents a full disk from becoming an outage, but storage never
# shrinks back — so runaway growth quietly and permanently raises the bill. This alert makes
# that visible as a warning rather than as a surprise on an invoice. It replaces "remember to
# check the storage graph", which nobody does.
#
# Metric alert rules are ~$0.10/month each.

resource "azurerm_monitor_action_group" "ops" {
  name                = "veervrat-${var.environment}-ops"
  resource_group_name = azurerm_resource_group.this.name
  short_name          = "vv${var.environment}ops" # max 12 chars

  dynamic "email_receiver" {
    for_each = var.alert_email_recipients
    content {
      name          = email_receiver.key
      email_address = email_receiver.value
      # Azure's own formatting, not ours — avoids a second template to maintain.
      use_common_alert_schema = true
    }
  }

  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "postgres_storage" {
  name                = "veervrat-${var.environment}-psql-storage"
  resource_group_name = azurerm_resource_group.this.name
  scopes              = [azurerm_postgresql_flexible_server.this.id]
  description         = "Postgres storage above 80% — auto-grow will expand it (and the bill) unless something is cleaned up."

  # Evaluate hourly over a 1h window: storage moves slowly, so anything tighter is noise.
  frequency   = "PT1H"
  window_size = "PT1H"
  severity    = 2 # warning — action needed, but nothing is broken yet

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "storage_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }

  tags = local.tags
}
