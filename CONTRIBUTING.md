# RULE — Contributing to Veervrat

Enforcer: `omchavan-jp`. Read this before starting work or opening a PR.
The authoritative delivery rules are in [Git and Release Governance](documentation/25_Git-and-Release-Governance.md).
See [rollout status](ops/github-governance-status.md) for which controls are actually active.

## Start here

1. Read [AGENTS.md](AGENTS.md) and the relevant engineering conventions.
2. Follow the [Development Process](documentation/23_Development-Process.md): establish current behavior, size the change, and use the existing OpenSpec process where appropriate.
3. Follow [Local Development Setup](documentation/02_Local-Development-Setup.md). Use the Node/pnpm versions declared in [package.json](package.json), not a different global version.
4. Activate the tracked commit hook: `git config core.hooksPath .githooks`.
5. Obtain required local credentials through the maintainer's approved private channel. Never put credentials in a PR, issue, or committed file.

## Branch, implement, and open a PR

From a clean checkout, fetch current `main` and start a new working branch:

```bash
git fetch origin
git switch -c feat/descriptive-name origin/main
```

Use `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, or `spec/` as appropriate.
Never commit directly to `main`. Rebase a working branch on current `main` when it needs updating;
do not overwrite someone else's work or force-push a shared branch without coordination.

Keep the PR small and complete. Use conventional commits and a conventional PR title, such as
`fix(auth): reject expired invitations`. Explain the change, linked work, verification evidence,
and any migration or recovery implications in the PR template.

Verify locally first. The merge policy requires CI (lint/typecheck/unit/build), integration,
and E2E checks to pass against current `main`. See the [workflow definitions](.github/workflows/README.md)
for their exact scope. A docs-only PR should report its applicable documentation checks rather
than invent runtime verification; the repository workflows still run on PRs.

Do not change approved product decisions or add dependencies without following the existing
research and approval requirements. Update applicable specs with implementation changes.

## Review, merge, and close out

- Request review from `omchavan-jp`; only that account merges PRs.
- New changes invalidate stale approval. Resolve all review conversations and rerun affected checks.
- The maintainer may self-review their own PR and use only the documented approval exception.
  Their PR must still pass the mandatory checks. Another account belonging to the same person
  is not independent review.
- Use squash merge only. Delete the source branch after merging; automatic deletion is the
  agreed setting, with activation tracked in rollout status. Start subsequent work on a new
  branch from `main`.
- For runtime changes, record what was observed on UAT after merge. Other developers' changes
  receive the maintainer's walkthrough; maintainer changes use the explicit self-review exception.
- Update capability specs and CHANGELOG for user-visible behavior, and close linked work with evidence.
  Pure engineering documentation need not invent a user-visible changelog entry.

Merging does not authorize production. Release preparation, UAT acceptance, approval, and recovery
belong to the maintainer and follow [DEPLOYMENT.md](DEPLOYMENT.md) and the governance policy.
Until the planned gates are activated, do not use a production tag to experiment with them.

## Database and infrastructure changes

Migration PRs must explain backward compatibility, rollout order, irreversible effects,
and recovery steps. Do not run `migrate reset` on deployed data. A previous image may be unsafe
after a schema change; assess compatibility before rollback.

Read [Infrastructure Conventions](documentation/21_Infrastructure-Conventions.md) before changing
Terraform. Production-changing steps require release authorization; a green local test or
reviewed documentation is not authorization to mutate production.

## Security, access, and offboarding

Use [SECURITY.md](SECURITY.md) for confidential reporting. Dependabot and other bots propose
changes through PRs; they do not approve or merge them.

The maintainer reviews collaborator, integration, and cloud access quarterly and removes access
when someone leaves. Offboarding includes revoking unneeded tokens/keys and reviewing access to
shared local credentials. Only grant the access required for the person's responsibility.

Before changing repository visibility or buying GitHub products, review the governance policy's
cost/visibility requirements and preserve or replace every required control.
