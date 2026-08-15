output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "key_vault_name" {
  value = azurerm_key_vault.this.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.this.vault_uri
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "redis_hostname" {
  value = azurerm_managed_redis.this.hostname
}

output "container_app_environment_id" {
  value = azurerm_container_app_environment.this.id
}
