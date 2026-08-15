# This zone already exists — hand-created 2026-08-15, before Terraform existed for this
# project. It is IMPORTED into Terraform state, never created by it: a new zone gets
# different nameservers, which would mean re-doing the NS delegation with JP's DNS
# operator. See azure-account-facts.md §5 for the full story.
#
# After `terraform import` (see infra/terraform/README.md), `terraform plan` must show
# ZERO changes for this resource. If it doesn't, stop and figure out why before applying —
# do not let Terraform "fix" a diff here by recreating the zone.
resource "azurerm_dns_zone" "veervrat" {
  name                = "veervrat.jnanaprabodhini.org"
  resource_group_name = data.azurerm_resource_group.shared.name

  tags = {
    project     = "veervrat"
    environment = "shared"
    managed-by  = "manual-bootstrap"
  }
}
