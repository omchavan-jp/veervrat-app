# Terraform — Veervrat infra

If you've never used Terraform: you write `.tf` files describing the
infrastructure you want ("one container registry, one key vault"), and
Terraform figures out the Azure API calls needed to make reality match. It
keeps a **state file** (in `veervrattfstate`, see `bootstrap/`) recording what
it created, so the next run knows what changed instead of guessing.

Three commands you'll use, always in this order, always from inside an
`envs/<name>/` directory:

- `terraform init` — downloads the Azure provider plugin, connects to the
  state backend. Run this once per environment, and again if the backend
  config changes.
- `terraform plan` — **read-only.** Shows what would change, changes nothing.
  Always run this and read the output before `apply`.
- `terraform apply` — asks for confirmation, then makes the changes shown in
  the plan.

## Layout

```
envs/
  shared/   Resource group veervrat-shared — DNS zone (imported, not created),
            container registry, key vault. Cross-environment resources.
  uat/      Not yet built — see envs/uat/README.md
  prod/     Not yet built — see envs/prod/README.md
bootstrap/
  create-state-backend.sh   One-time setup, already run. Re-running is safe
                             (every step is create-if-not-exists) but should
                             not be necessary again.
```

## The one hard rule

**Never let Terraform create or destroy the DNS zone
(`veervrat.jnanaprabodhini.org`).** It was hand-created before Terraform
existed for this project and is imported into state, not managed from
scratch. A new zone gets different nameservers, which means re-doing the NS
delegation with JP's DNS operator. If `terraform plan` ever shows a change to
`azurerm_dns_zone.veervrat`, stop and figure out why before applying.

## Running `envs/shared` for the first time

```
cd envs/shared
terraform init

# Bring the existing DNS zone under management — get the exact resource ID first:
az network dns zone show \
  --resource-group veervrat-shared \
  --name veervrat.jnanaprabodhini.org \
  --query id -o tsv

terraform import azurerm_dns_zone.veervrat <the-id-from-above>

terraform plan   # must show 0 changes for the DNS zone — if not, stop
terraform apply  # creates the container registry + key vault only
```
