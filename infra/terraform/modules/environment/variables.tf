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
