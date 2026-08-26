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

# Who hears about spend. Identifiers, not credentials — these belong in version control (§5).
variable "budget_alert_emails" {
  description = "Recipients of budget notifications at every threshold."
  type        = list(string)
  default = [
    "om.chavan@jnanaprabodhini.org",
    "devavrat.munagekar@jnanaprabodhini.org",
    "ashutosh.barmukh@jnanaprabodhini.org",
    "rahul.dharmadhikari@jnanaprabodhini.org",
    "om.chavan501@gmail.com",
  ]
}

# The existing budget's start date. Immutable after creation, so this must match what was
# hand-created or the import will show a permanent diff.
variable "budget_start_date" {
  description = "Start of the budget period, matching the hand-created budget being imported."
  type        = string
  default     = "2026-08-01T00:00:00Z"
}
