# Rate-limit counters, lockout state, cache, Socket.IO pub/sub — all disposable (sessions
# live in Postgres). Managed Redis is used anyway because a self-hosted one needs
# min-replicas=1 to avoid losing that state on every scale-to-zero, which costs the same
# without the operational burden. See infra-budget-log.md target architecture.
#
# NOTE (2026-08-16): the target architecture doc says "Azure Cache Basic C0" — that SKU no
# longer exists. Azure retired "Azure Cache for Redis" mid-Phase-2A; the first `apply` failed
# with "Azure Cache for Redis is retiring, create Azure Managed Redis instance instead."
# Its immediate replacement resource in the provider, `azurerm_redis_enterprise_cluster`, is
# ALSO deprecated and rejects the new SKU names outright — `azurerm_managed_redis` (below) is
# the actual current resource. Confirmed via Azure's live retail pricing API that the
# smallest tier, Balanced B0, is $0.017/hr (~$12/mo) in centralindia — no SLA/replica, same
# tradeoff as the old Basic tier, and actually cheaper than the ~$16/mo this was budgeted at.
resource "azurerm_managed_redis" "this" {
  name                = "veervrat-${var.environment}-redis"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location

  sku_name = var.redis_sku # "Balanced_B0"

  # No VNet integration yet (D15), so identity/TLS + firewall is the interim control rather
  # than network isolation — same reasoning as Postgres.
  public_network_access     = "Enabled"
  high_availability_enabled = false # matches the old Basic tier's "no SLA/replica" tradeoff

  default_database {
    client_protocol = "Encrypted" # TLS
    # `allkeys-lru`, deliberately NOT `NoEviction`. Under NoEviction a full cache starts
    # failing writes, and auth.service.ts fails OPEN on Redis errors ("Redis error on
    # lockout check, failing open") — so a full Redis would silently disable brute-force
    # protection rather than preserve counters. LRU evicts cold cache entries instead and
    # keeps the small, hot rate-limit/lockout counters alive. Everything here is
    # reconstructible (sessions live in Postgres), so eviction is safe by design.
    eviction_policy                    = "AllKeysLRU"
    access_keys_authentication_enabled = true # ioredis connects via REDIS_URL + key, not Entra tokens
  }

  tags = local.tags
}

resource "azurerm_key_vault_secret" "redis_url" {
  name = "redis-url"
  # ioredis (used throughout apps/api) reads this directly as REDIS_URL.
  value        = "rediss://:${azurerm_managed_redis.this.default_database[0].primary_access_key}@${azurerm_managed_redis.this.hostname}:${azurerm_managed_redis.this.default_database[0].port}"
  key_vault_id = azurerm_key_vault.this.id
  depends_on   = [azurerm_role_assignment.key_vault_admins]
}
