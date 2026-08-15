# UAT environment — not yet built

Deliberately empty. This is Phase 2 of the Terraform rollout (see the root
`CLAUDE.md` working order): Postgres Flexible Server, Azure Cache for Redis,
Blob Storage, and the actual `web`/`api` Container Apps, in resource group
`veervrat-uat`.

Blocked on nothing technical — Phase 1 (`../shared`) just needs to land first
since this environment will reference its Key Vault and Container Registry.
