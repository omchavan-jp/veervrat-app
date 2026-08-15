output "dns_zone_name_servers" {
  description = "Should exactly match the nameservers already published on jnanaprabodhini.org — confirms nothing changed."
  value       = azurerm_dns_zone.veervrat.name_servers
}

output "container_registry_login_server" {
  value = azurerm_container_registry.veervrat.login_server
}

output "key_vault_uri" {
  value = azurerm_key_vault.veervrat.vault_uri
}
