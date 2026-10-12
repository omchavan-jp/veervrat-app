resource "azurerm_role_assignment" "uat_release_records" {
  scope                = azurerm_storage_container.staged_release["records"].resource_manager_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.staged_release["uat"].principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "prod_acceptance_reader" {
  scope                = azurerm_storage_container.staged_release["records"].resource_manager_id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.staged_release["prod"].principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "prod_release_records" {
  scope                = azurerm_storage_container.staged_release["production_records"].resource_manager_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.staged_release["prod"].principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "uat_production_history_reader" {
  scope                = azurerm_storage_container.staged_release["production_records"].resource_manager_id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.staged_release["uat"].principal_id
  principal_type       = "ServicePrincipal"
}
