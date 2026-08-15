variable "location" {
  description = "Azure region for shared resources."
  type        = string
  default     = "centralindia"
}

variable "tags" {
  description = "Applied to every resource this environment creates."
  type        = map(string)
  default = {
    project     = "veervrat"
    environment = "shared"
    managed-by  = "terraform"
  }
}

# Named explicitly rather than derived from whoever happens to run Terraform. Deriving it
# meant the assignment silently followed the operator: if Devavrat ever ran `apply`, his
# access would replace Om's. Object IDs are identifiers, not secrets (same class as the
# tenant/subscription IDs in azure-account-facts.md), so they belong in version control.
# Look one up with: az ad user show --id <upn> --query id -o tsv
variable "key_vault_administrators" {
  description = "Object ID per human who may read/write secrets in the shared vault, keyed by a short name."
  type        = map(string)
  default = {
    # Om Chavan — om.chavan@jppune.onmicrosoft.com
    om = "7941bf9f-456d-4050-8769-6e59b0a9e378"
  }
}
