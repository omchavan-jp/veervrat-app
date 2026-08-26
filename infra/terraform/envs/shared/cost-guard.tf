# The hard stop the budget alerts could never be (#93).
#
# The subscription is a Microsoft Customer Agreement, which has NO spending limit — that exists
# only on legacy offers. So when the grant is exhausted or expires on 2027-08-14, usage does not
# suspend: it silently bills the card on file, which belongs to Ashutosh Barmukh personally.
#
# The existing control is a monthly budget alerting five people at 50/75/100%. An alert notifies;
# it stops nothing, and it depends on a billing email that is still unverified (O4) — so it may
# not even arrive. This adds the part that acts.
#
# ⚠️ THE THRESHOLD IS A SPIKE DETECTOR, NOT INSOLVENCY. The grant is ₹1,91,300 valid to
# 2027-08-14 and the forecast is ~₹5,600/month, so crossing ₹13,000 in a month means something
# went wrong, not that the money ran out. Stopping production on that signal is a deliberate
# decision (Om, 2026-08-25): a platform that is down and cheap can be restarted in minutes, and
# an unbounded meter against an individual's card cannot be undone.

# `data.azurerm_subscription.current` is already declared in github-oidc.tf.

resource "azurerm_automation_account" "cost_guard" {
  name                = "veervrat-cost-guard"
  location            = data.azurerm_resource_group.shared.location
  resource_group_name = data.azurerm_resource_group.shared.name
  sku_name            = "Basic" # free tier covers 500 job-minutes/month; this runs approximately never

  identity {
    type = "SystemAssigned"
  }

  tags = {
    project     = "veervrat"
    environment = "shared"
  }
}

# A custom role, not Contributor.
#
# Contributor would be one line and would let this identity do anything to anything — a standing
# credential able to delete every resource, existing solely to run once in an emergency. #90
# already records that state access is broader than it should be; adding a second over-broad
# principal to fix a cost problem trades one risk for another.
#
# These are the only operations the runbook performs. It cannot delete, cannot read secrets, and
# cannot restart what it stopped — restarting is deliberately a human action.
resource "azurerm_role_definition" "cost_guard" {
  name        = "Veervrat Cost Guard"
  scope       = data.azurerm_subscription.current.id
  description = "Stop compute and databases in a cost emergency. Cannot delete, read secrets, or restart."

  permissions {
    actions = [
      "Microsoft.App/containerApps/read",
      "Microsoft.App/containerApps/write",
      "Microsoft.DBforPostgreSQL/flexibleServers/read",
      "Microsoft.DBforPostgreSQL/flexibleServers/stop/action",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]
    not_actions = []
  }

  assignable_scopes = [data.azurerm_subscription.current.id]
}

resource "azurerm_role_assignment" "cost_guard" {
  scope              = data.azurerm_subscription.current.id
  role_definition_id = azurerm_role_definition.cost_guard.role_definition_resource_id
  principal_id       = azurerm_automation_account.cost_guard.identity[0].principal_id
}

resource "azurerm_automation_runbook" "stop_veervrat" {
  name                    = "stop-veervrat"
  location                = azurerm_automation_account.cost_guard.location
  resource_group_name     = data.azurerm_resource_group.shared.name
  automation_account_name = azurerm_automation_account.cost_guard.name
  runbook_type            = "PowerShell72"
  log_progress            = true
  log_verbose             = true
  description             = "Scales Container Apps to zero and stops Postgres in both environments. See #93."

  content = file("${path.module}/runbooks/stop-veervrat.ps1")

  # No tags here on purpose. Setting any updatable field triggers an update call that resends
  # runbook_type, and Azure rejects that outright ("Runbook Type cannot be modified") — so a
  # cosmetic tag would make every apply fail. The account carries the tags instead.
  #
  # ⚠️ CHANGING THIS RUNBOOK'S CONTENT REQUIRES `-replace`:
  #
  #     terraform apply -replace=azurerm_automation_runbook.stop_veervrat
  #
  # An ordinary update fails with 400 "Runbook Type cannot be modified". The provider records the
  # type as "PowerShell" in state while Azure holds "PowerShell72", so every update PUT carries a
  # type mismatch and is rejected — the resource is effectively immutable in place. Replacing it
  # is harmless: a runbook holds no state, and creation with PowerShell72 works correctly.
  #
  # Azure reports this runbook as PowerShell72 (`az automation runbook show` → PowerShell72,
  # Published), but the provider reads it back as plain "PowerShell", so every plan wanted to
  # replace it forever. Ignoring the field keeps plans honest about real drift instead of
  # normalising a permanent false positive — which is how a genuine change would get scrolled
  # past. Re-check on a provider upgrade.
  lifecycle {
    ignore_changes = [runbook_type]
  }
}

# The action group calls the runbook through a webhook, so one has to exist. Its URI is a
# credential — anyone holding it can trigger the stop — and Azure returns it only at creation,
# never again. It therefore lives in Terraform state, which §5 of the conventions already treats
# as secret-bearing; that is not a new exposure, but it is one more reason state access matters
# (#90).
#
# `expiry_time` is far out on purpose: a webhook that quietly expires would leave the budget
# calling nothing, and the failure would be invisible until the month it mattered.
resource "azurerm_automation_webhook" "stop_veervrat" {
  name                    = "stop-veervrat-hook"
  resource_group_name     = data.azurerm_resource_group.shared.name
  automation_account_name = azurerm_automation_account.cost_guard.name
  expiry_time             = "2030-01-01T00:00:00Z"
  enabled                 = true
  runbook_name            = azurerm_automation_runbook.stop_veervrat.name
}

# The action group is what the budget can actually call. It both runs the stop AND emails the
# same people — being stopped without being told is its own kind of outage.
resource "azurerm_monitor_action_group" "cost_guard" {
  name                = "veervrat-cost-guard"
  resource_group_name = data.azurerm_resource_group.shared.name
  short_name          = "vvcostgrd"

  dynamic "email_receiver" {
    for_each = var.budget_alert_emails
    content {
      name                    = "email-${email_receiver.key}"
      email_address           = email_receiver.value
      use_common_alert_schema = true
    }
  }

  automation_runbook_receiver {
    name                    = "stop-veervrat"
    automation_account_id   = azurerm_automation_account.cost_guard.id
    runbook_name            = azurerm_automation_runbook.stop_veervrat.name
    webhook_resource_id     = azurerm_automation_runbook.stop_veervrat.id
    is_global_runbook       = false
    service_uri             = azurerm_automation_webhook.stop_veervrat.uri
    use_common_alert_schema = true
  }

  tags = {
    project     = "veervrat"
    environment = "shared"
  }
}

# The budget that calls it.
#
# ⚠️ This resource already EXISTS — hand-created, like the state storage account, before there was
# Terraform to make it with. It must be IMPORTED, never created: applying without importing would
# fail on a name conflict, and a budget recreated under a new name loses its accrued month.
#
#   terraform import azurerm_consumption_budget_subscription.monthly \
#     /subscriptions/<subscription-id>/providers/Microsoft.Consumption/budgets/veervrat-monthly
#
# Thresholds: 50 and 75 notify, as before. 95 notifies AND stops — 95 rather than 100 because a
# meter crossing 95% mid-month is already going to cross 100%, and stopping five percent early
# costs nothing while stopping late costs whatever the overshoot was.
resource "azurerm_consumption_budget_subscription" "monthly" {
  name            = "veervrat-monthly"
  subscription_id = data.azurerm_subscription.current.id

  amount     = 13000
  time_grain = "Monthly"

  time_period {
    # Must not be in the future and cannot be changed after creation for an existing budget;
    # this matches what was created by hand.
    start_date = var.budget_start_date
  }

  notification {
    enabled        = true
    threshold      = 50
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = var.budget_alert_emails
  }

  notification {
    enabled        = true
    threshold      = 75
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = var.budget_alert_emails
  }

  # The one that acts.
  notification {
    enabled        = true
    threshold      = 95
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = var.budget_alert_emails
    contact_groups = [azurerm_monitor_action_group.cost_guard.id]
  }
}
