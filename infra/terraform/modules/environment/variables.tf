variable "environment" {
  description = "Short environment name — becomes part of every resource name (e.g. \"uat\", \"prod\")."
  type        = string
  validation {
    condition     = contains(["uat", "prod"], var.environment)
    error_message = "environment must be \"uat\" or \"prod\" — these are the only two per D10/D11 in root CLAUDE.md."
  }
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "centralindia"
}

variable "tags" {
  description = "Base tags; `environment` is added automatically so callers don't repeat it."
  type        = map(string)
  default = {
    project    = "veervrat"
    managed-by = "terraform"
  }
}

# Object ID per human who may read/write secrets in this environment's vault. Named
# explicitly rather than derived from whoever runs Terraform — see
# documentation/21_Infrastructure-Conventions.md §5 for why that matters.
# Look one up with: az ad user show --id <upn> --query id -o tsv
variable "key_vault_administrators" {
  description = "Object ID per human, keyed by a short name."
  type        = map(string)
  default = {
    # Om Chavan — om.chavan@jppune.onmicrosoft.com
    om = "7941bf9f-456d-4050-8769-6e59b0a9e378"
  }
}

variable "postgres_sku_name" {
  description = "Confirmed available in centralindia via `az postgres flexible-server list-skus`."
  type        = string
  default     = "B_Standard_B1ms" # Burstable, 1 vCore — ~$13/mo, per infra-budget-log.md target architecture
}

variable "postgres_version" {
  description = "Matches the source data (Neon, PG 18.4) — confirmed available in centralindia."
  type        = string
  default     = "18"
}

variable "postgres_storage_mb" {
  description = "32768 (32 GiB) is the Flexible Server minimum — plenty of headroom for beta scale."
  type        = number
  default     = 32768
}

variable "postgres_admin_username" {
  type    = string
  default = "veervrat_admin"
}

variable "redis_sku" {
  description = "Azure Managed Redis SKU (cluster-level; size and tier are baked into the name, unlike the old capacity/family fields). Confirmed available and priced ~$12/mo in centralindia via the retail pricing API."
  type        = string
  default     = "Balanced_B0" # smallest tier — no SLA/replica, acceptable for beta; revisit (higher tier) at launch
}

variable "postgres_backup_retention_days" {
  description = "7 is fine for a disposable UAT; prod should raise this (Azure allows up to 35)."
  type        = number
  default     = 7
}

# @jnanaprabodhini.org (Google Workspace) only — the @jppune.onmicrosoft.com mailboxes exist
# but nobody monitors them, so an alert landing there is functionally lost.
# See azure-account-facts.md §6.
variable "alert_email_recipients" {
  description = "Who gets infrastructure alerts for this environment, keyed by a short name."
  type        = map(string)
  default = {
    om = "om.chavan@jnanaprabodhini.org"
  }
}

# ─── Container Apps ───────────────────────────────────────────────────────────

variable "deploy_apps" {
  description = "Create the api/web Container Apps. False leaves just the (free) environment, which is how infra can exist before any image does."
  type        = bool
  default     = false
}

variable "image_tag" {
  description = "Git SHA of the image to run. The SAME tag is promoted from UAT to prod — never rebuilt, so what shipped is what was tested."
  type        = string
  default     = ""
}

variable "container_registry_name" {
  type    = string
  default = "veervratacr"
}

variable "container_registry_resource_group" {
  type    = string
  default = "veervrat-shared"
}

# Scale-to-zero (min 0) is free but adds a cold start on the first request after idle.
# Keep 1 for prod once real users arrive; 0 is fine for UAT.
variable "api_min_replicas" {
  type    = number
  default = 0
}

variable "api_max_replicas" {
  type    = number
  default = 2
}

variable "web_min_replicas" {
  type    = number
  default = 0
}

variable "web_max_replicas" {
  type    = number
  default = 2
}

variable "database_pool_max" {
  description = "Per-replica pg connections. The ceiling that matters is this × api_max_replicas + headroom ≤ the server's max_connections (low on Burstable)."
  type        = number
  default     = 5
}

# Read via getOrThrow and absent from the Joi schema, so an empty value crash-loops the api
# with no useful error. Placeholders keep UAT bootable until real credentials are issued for
# the UAT callback URL.
variable "google_client_id" {
  type    = string
  default = "placeholder-not-configured"
}

variable "google_client_secret" {
  type      = string
  sensitive = true
  default   = "placeholder-not-configured"
}

# Normally `migrate deploy`. Override to recover a failed migration, e.g.
#   -var='migrate_command=migrate resolve --rolled-back 20260614090133_add_trgm_entity_search_indexes'
# Prisma records a failed migration and blocks every later deploy until a human states
# whether it was rolled back or should count as applied — deliberately not automatic.
variable "migrate_command" {
  description = "Prisma CLI subcommand the migration job runs."
  type        = string
  default     = "migrate deploy"
}

# Image the APPS run. Normally identical to image_tag; set to the currently-running tag during
# the migrate step so migrations execute on the new build while the apps still serve the old
# one. Empty = follow image_tag.
variable "app_image_tag" {
  type    = string
  default = ""
}

# Public hostnames bound to the Container Apps (custom domain + managed TLS). Empty falls back
# to the platform's `*.azurecontainerapps.io` FQDN, which is what a brand-new environment has
# before DNS exists.
#
# These are what users and browsers actually address, so they — not the platform FQDNs — are
# what CORS must admit and what links must be built from.
variable "public_web_host" {
  description = "Custom hostname serving the web app, e.g. veervrat.jnanaprabodhini.org. Empty = use the platform FQDN."
  type        = string
  default     = ""
}

variable "public_api_host" {
  description = "Custom hostname serving the api, e.g. api.veervrat.jnanaprabodhini.org. Empty = use the platform FQDN."
  type        = string
  default     = ""
}

# `lax` is correct wherever web and api share a registrable domain; `none` exists only for the
# cross-site case and is weaker. See documentation/21_Infrastructure-Conventions.md §17.
variable "cookie_samesite" {
  description = "SameSite policy for auth cookies: lax | strict | none."
  type        = string
  default     = "lax"

  validation {
    condition     = contains(["lax", "strict", "none"], var.cookie_samesite)
    error_message = "cookie_samesite must be one of: lax, strict, none."
  }
}
