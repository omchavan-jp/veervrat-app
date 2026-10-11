resource "azurerm_role_assignment" "uat_release_records" {
  scope                = azurerm_storage_container.staged_release["records"].resource_manager_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.staged_release["uat"].principal_id
  principal_type       = "ServicePrincipal"
}
