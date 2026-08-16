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

output "api_url" {
  value = local.deploy ? "https://${local.api_fqdn}" : null
}

output "web_url" {
  value = local.deploy ? "https://${local.web_fqdn}" : null
}

output "container_app_environment_default_domain" {
  description = "Lets the image build know the URLs before the apps exist — NEXT_PUBLIC_* are baked in at build time."
  value       = azurerm_container_app_environment.this.default_domain
}
