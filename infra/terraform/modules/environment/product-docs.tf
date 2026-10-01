resource "azurerm_container_app" "docs" {
  count = local.deploy && var.product_docs_enabled && var.docs_image_tag != "" ? 1 : 0

  name                         = "veervrat-${var.environment}-docs"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.docs[0].id]
  }

  registry {
    server   = data.azurerm_container_registry.shared.login_server
    identity = azurerm_user_assigned_identity.docs[0].id
  }

  ingress {
    external_enabled = false
    target_port      = 3000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "docs"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-docs:${var.docs_image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = "3000"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/product-docs"
      }
    }
  }

  depends_on = [azurerm_role_assignment.docs_acr_pull]

  tags = local.tags
}
