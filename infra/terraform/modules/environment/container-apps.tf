# The api and web Container Apps. Created only when `deploy_apps = true` and an image tag is
# supplied — the environment (container-apps-env.tf) exists on its own so infra can be stood
# up before any image exists to run in it.
#
# Auth model: each app gets a user-assigned managed identity (see container-apps-identity.tf
# for why user-assigned), granted AcrPull on the shared
# registry and Key Vault Secrets User on this environment's vault. No registry password, no
# connection string in an env var — the platform fetches secrets at start using the identity.

data "azurerm_container_registry" "shared" {
  name                = var.container_registry_name
  resource_group_name = var.container_registry_resource_group
}

locals {
  # Apps are deployed only when asked for. Jobs exist as soon as there is an image to run,
  # INDEPENDENTLY of the apps — gating them on the same flag meant "apply infra without
  # touching the apps" also deleted the migration job that the very next step needs, and
  # deleted the running apps outright rather than leaving them alone.
  deploy = var.deploy_apps && var.image_tag != ""
  jobs   = var.image_tag != ""

  # Apps run `app_image_tag`, which normally equals `image_tag`. They differ for exactly one
  # window: while migrations run, jobs are on the NEW image and the apps are still serving the
  # OLD one. That is what enforces migrate-before-deploy without downtime.
  app_image = var.app_image_tag != "" ? var.app_image_tag : var.image_tag

  api_fqdn = "veervrat-${var.environment}-api.${azurerm_container_app_environment.this.default_domain}"
  web_fqdn = "veervrat-${var.environment}-web.${azurerm_container_app_environment.this.default_domain}"

  # What browsers actually address. The platform FQDN is the fallback for an environment that
  # has no custom domain yet; once one is bound, every origin-sensitive value (CORS, links,
  # the api base URL the browser calls) must use the public host instead — otherwise CORS
  # rejects the origin users arrive on.
  web_origin = var.public_web_host != "" ? "https://${var.public_web_host}" : "https://${local.web_fqdn}"
  api_origin = var.public_api_host != "" ? "https://${var.public_api_host}" : "https://${local.api_fqdn}"
}

# ─── api ──────────────────────────────────────────────────────────────────────

resource "azurerm_container_app" "api" {
  count = local.deploy ? 1 : 0

  name                         = "veervrat-${var.environment}-api"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  registry {
    server   = data.azurerm_container_registry.shared.login_server
    identity = azurerm_user_assigned_identity.api.id
  }

  secret {
    name                = "database-url"
    key_vault_secret_id = azurerm_key_vault_secret.postgres_connection_string.versionless_id
    identity            = azurerm_user_assigned_identity.api.id
  }

  secret {
    name                = "redis-url"
    key_vault_secret_id = azurerm_key_vault_secret.redis_url.versionless_id
    identity            = azurerm_user_assigned_identity.api.id
  }

  secret {
    name                = "session-secret"
    key_vault_secret_id = azurerm_key_vault_secret.session_secret.versionless_id
    identity            = azurerm_user_assigned_identity.api.id
  }

  ingress {
    external_enabled = true
    target_port      = 3001
    transport        = "auto" # enables HTTP/2 + WebSocket upgrades

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.api_min_replicas
    max_replicas = var.api_max_replicas

    container {
      name   = "api"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-api:${local.app_image}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "3001"
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }
      env {
        name        = "SESSION_SECRET"
        secret_name = "session-secret"
      }
      # Doubles as the CORS allow-list entry, so it must be the origin the browser actually
      # sends — the custom domain once one is bound, not the platform FQDN.
      env {
        name  = "FRONTEND_URL"
        value = local.web_origin
      }
      # `lax` once web and api share a registrable domain: stricter than `none`, and `none`
      # was only ever needed while the two tiers were cross-site.
      env {
        name  = "COOKIE_SAMESITE"
        value = var.cookie_samesite
      }
      # Sized against Postgres: DATABASE_POOL_MAX × max_replicas + headroom must stay under
      # the server's max_connections, which is low on Burstable tiers.
      env {
        name  = "DATABASE_POOL_MAX"
        value = tostring(var.database_pool_max)
      }
      # Must stay below the platform's SIGTERM→SIGKILL grace period so in-flight requests
      # actually drain instead of being killed mid-response.
      env {
        name  = "SHUTDOWN_TIMEOUT_MS"
        value = "10000"
      }
      # Google OAuth is read with getOrThrow and is NOT in the Joi schema — a missing value
      # crash-loops the container with no friendly error. Placeholders keep it bootable until
      # real credentials are put in the vault.
      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }
      env {
        name  = "GOOGLE_CLIENT_SECRET"
        value = var.google_client_secret
      }
      # ⚠️ Points at the API origin, not the web origin. It used to be the web host because the
      # Next rewrite proxy forwarded /api/v1/* to the api; with the proxy gone, that path on the
      # web origin is a 404 and the OAuth round trip would break at the callback — after the
      # user has already approved, which is the least debuggable place for it to fail.
      #
      # This exact string must also be registered in the Google console for the environment, or
      # Google rejects the request with redirect_uri_mismatch (O23).
      env {
        name  = "GOOGLE_CALLBACK_URL"
        value = "${local.api_origin}/api/v1/auth/google/callback"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 3001
        path      = "/health" # cheap — must not flap on a transient DB blip
      }

      readiness_probe {
        transport = "HTTP"
        port      = 3001
        path      = "/ready" # actually pings Postgres + Redis
      }
    }
  }

  tags = local.tags

  # Grants must land before the app tries to pull its image and read its secrets.
  depends_on = [
    azurerm_role_assignment.api_acr_pull,
    azurerm_role_assignment.api_kv_secrets,
  ]
}

# ─── web ──────────────────────────────────────────────────────────────────────

resource "azurerm_container_app" "web" {
  count = local.deploy ? 1 : 0

  name                         = "veervrat-${var.environment}-web"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.web.id]
  }

  registry {
    server   = data.azurerm_container_registry.shared.login_server
    identity = azurerm_user_assigned_identity.web.id
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.web_min_replicas
    max_replicas = var.web_max_replicas

    container {
      name   = "web"
      image  = "${data.azurerm_container_registry.shared.login_server}/veervrat-web:${local.app_image}"
      cpu    = 0.25
      memory = "0.5Gi"

      # Per-environment config, read at RUNTIME by apps/web/lib/runtime-config.ts.
      #
      # These are deliberately NOT NEXT_PUBLIC_* and NOT build args: one web image is promoted
      # from UAT to prod unchanged, so anything baked at build time carries UAT's values into
      # production. That defect shipped once — prod's web tier called UAT's api and would have
      # written to UAT's database. See documentation/21_Infrastructure-Conventions.md §17.
      #
      # The browser calls the api directly on its public hostname (the Next rewrite proxy is
      # gone), so this must be the custom domain once one is bound — it has to be an origin
      # the api's CORS admits and a browser can resolve.
      env {
        name  = "API_BASE_URL"
        value = "${local.api_origin}/api/v1"
      }
      env {
        name  = "SITE_URL"
        value = local.web_origin
      }
      # Environment-level toggle only — which *users* see the widget is per-user data (D20/B1),
      # not config.
      env {
        name  = "FEEDBACK_MODE"
        value = var.feedback_mode
      }
      env {
        name  = "PORT"
        value = "3000"
      }

      liveness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/"
      }
    }
  }

  tags = local.tags

  depends_on = [azurerm_role_assignment.web_acr_pull]
}
