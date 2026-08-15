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
