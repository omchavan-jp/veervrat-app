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
  shared/   Resource group veervrat-shared — container registry, GitHub OIDC
            federated credentials, tfstate storage account. Cross-environment.
            (No key vault: secrets are per-environment. The shared vault created
            in Phase 1 was a mistake and was deleted the same day.)
  uat/      Live since 2026-08-16. Calls modules/environment.
  prod/     Live since 2026-08-17. Calls the same module.
bootstrap/
  create-state-backend.sh   One-time setup, already run. Re-running is safe
                             (every step is create-if-not-exists) but should
                             not be necessary again.
```

## The one hard rule — for any DNS zone this project ever manages

**Never destroy and re-create a DNS zone that something is delegating to.**
Azure assigns nameservers per zone, so a re-created zone gets *different*
ones — invalidating any published NS delegation and requiring the whole
request to the DNS operator again. Where a zone is in use, import it rather
than letting Terraform create it, and give it
`lifecycle { prevent_destroy = true }`.

This project currently manages **no** DNS zone. The one it had
(`veervrat.jnanaprabodhini.org`, hand-created 2026-08-15) was decommissioned
2026-08-24 — see below.

## Running `envs/shared` for the first time

```
cd envs/shared
terraform init
terraform plan   # review before applying, as always
terraform apply  # container registry + GitHub OIDC federated credentials
```

### The DNS zone that used to live here

Created 2026-08-15 for a planned **NS delegation** of
`veervrat.jnanaprabodhini.org` to Azure, and imported into state 2026-08-16.
Decision D14 then superseded that approach: JP's DNS operator publishes
**per-record** CNAMEs on `jnanaprabodhini.org` directly, so nothing ever
delegated to the zone and no record was ever added to it.

Destroyed 2026-08-24 (issue #80) after verifying it was genuinely orphaned:
`dig NS veervrat.jnanaprabodhini.org` showed no delegation to the Azure
nameservers, the zone held only its auto-created NS and SOA pair, and all four
live hostnames resolved — and still resolve — via CNAMEs that never touched it.
Removing it required deleting the `prevent_destroy` lifecycle block; that
friction was working as intended.
