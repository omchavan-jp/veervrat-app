# Terraform — Veervrat infra

If you've never used Terraform: you write `.tf` files describing the
infrastructure you want ("one container registry, one key vault"), and
Terraform figures out the Azure API calls needed to make reality match. It
keeps a **state file** (in `veervrattfstate`, see `bootstrap/`) recording what
it created, so the next run knows what changed instead of guessing.

Shared/UAT/production state now has dedicated container configuration:
`tfstate-shared`/`tfstate-uat`/`tfstate-prod`; the keys remain
`shared.tfstate`/`uat.tfstate`/`prod.tfstate`. Read
[cutover status and recovery checkpoints](../../ops/terraform-state-migration.md)
before backend initialization on an existing checkout. Do not use `-reconfigure` as a
substitute for copying an existing state. Separately scoped build/UAT/production identities
are active and legacy trust/grants were removed; see [identity evidence](../../ops/azure-identity-cutover.md).
UAT writes private acceptance records in `release-records`; production reads those and writes
private manifests/claims/outcomes in `production-release-records`. UAT has read-only access to
production history. Grants are at container scope; never broaden them to the storage account.

Routine production changes run through the protected-main `production-release.yml` controller
after recorded UAT acceptance and native owner approval; `prod-*` tags request promotion of
exact digests without rebuilding. The first live verification is recorded in
[release evidence](../../ops/release-controls-rollout.md). The command primer below is not
authorization for an ad hoc production apply. Bootstrap/IAM and exceptional recovery require
explicit maintainer review/authorization and must not bypass active release controls.

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
  shared/   Uses existing veervrat-shared resource group and tfstate storage
            account; manages registry, GitHub OIDC identities/credentials,
            state/record containers, scoped grants and cost guard.
            (No key vault: secrets are per-environment. The shared vault created
            in Phase 1 was a mistake and was deleted the same day.)
  uat/      Live since 2026-08-16. Calls modules/environment.
  prod/     Live since 2026-08-17. Calls the same module.
bootstrap/
  create-state-backend.sh   Legacy one-time setup, already run. Creates the
                             account and legacy tfstate container; current
                             scoped containers are managed by envs/shared.
```

The web image now includes a build-time Fumadocs static export outside its public
directory. The web route reads it only after the API grants `PRODUCT_DOCS_VIEW`.
UAT sets `PRODUCT_DOCS_MODE=granted` on web and API; production sets it to `off`.
Routine CD passes explicit `image_refs` for API/web/migration/backup; web-only product-docs
deployments preserve the other deployed component digests. Legacy tag variables remain for
compatibility, not release identity. There is no separate docs
Container App, image tag, managed identity, or registry pull grant.

## The one hard rule — for any DNS zone this project ever manages

**Never destroy and re-create a DNS zone that something is delegating to.**
Azure assigns nameservers per zone, so a re-created zone gets _different_
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

The former docs renderer required a temporary conditioned registry-scoped
RBAC Administrator grant for CI to assign `AcrPull` to its identity. After the
static cutover, environment Terraform removes that docs assignment and a
privileged shared-state apply removes the delegation. See the historical
rollout note in `DEPLOYMENT.md`.

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

## Subdirectories & Boundaries

- [Bootstrap](./bootstrap/README.md): state backend setup.
- [Environments](./envs/README.md): shared, UAT and production roots.
- [Modules](./modules/README.md): reusable environment resources.
