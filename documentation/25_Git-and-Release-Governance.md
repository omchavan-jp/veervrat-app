# RULE — 25: Git and Release Governance

Policy agreed: 2026-10-10
Enforcer: `omchavan-jp`
Audience: contributors before opening a PR; maintainers before merging, releasing, or changing access.
Refresh when: responsibilities, delivery workflows, visibility, GitHub plan, or security controls change.

This is the authoritative delivery policy. Implementation evidence and remaining work live in
[governance rollout status](../ops/github-governance-status.md). A policy statement is not proof
that its corresponding GitHub or Azure control is active.

## 1. Scope and ownership

- Keep the repository public and owned by the personal account `omchavan-jp`.
- Organization transfer, teams/nested teams, and additional development or preview environments are outside this iteration.
- Keep the single-trunk model: `main` is the trunk and must remain releasable. Local development, shared UAT, and production remain the existing environment model.
- Preserve the existing product-development methodology. Reconcile its delivery checkpoints with the rules below rather than replacing it.
- Do not choose a license implicitly. Licensing remains a separate project-owner decision.

## 2. Responsibilities and permissions

| Responsibility                              | Authorized actor                                               |
| ------------------------------------------- | -------------------------------------------------------------- |
| Develop on working branches and propose PRs | Existing developers; public contributors may propose fork PRs  |
| Approve other developers' PRs               | `omchavan-jp`                                                  |
| Review the maintainer's own PRs             | Maintainer self-review, with the documented approval exception |
| Merge into `main`                           | `omchavan-jp` only                                             |
| Create `prod-*` release tags                | `omchavan-jp` only                                             |
| Record UAT acceptance                       | `omchavan-jp` only                                             |
| Approve production deployments              | `omchavan-jp` only for this iteration                          |
| Manage repository access and settings       | `omchavan-jp`                                                  |

- Other accounts controlled by the maintainer retain developer access; a second account is not an independent reviewer.
- Bots may open PRs but may not approve or merge them.
- Review quarterly and remove access promptly when a contributor leaves. Include integrations and cloud credentials in this review.

## 3. Branches and merging

1. Allow squash merging only.
2. Automatically delete a PR's source branch after successful merge, including feature, fix, documentation, and chore branches.
3. Start each subsequent change on a fresh branch from current `main`; do not reuse squash-merged branches.
4. Delete all existing remote branches except `main`, including retired `dev`, without creating a backup. The owner explicitly accepts the risk of losing readily accessible granular branch history.
5. Preserve existing production tags.

The historical purge is a separate implementation operation against a freshly enumerated, explicit target list. Implementation branches created for this governance work are not historical cleanup targets until their work is merged.

- Keep conventional commits and the existing meaningful branch prefixes. Use a conventional PR title suitable for the squash commit.
- Keep PRs small and complete. Incomplete work stays on its working branch or behind an appropriate flag.
- Retain the existing rebase-based approach for refreshing a working branch against `main`.
- Closing a PR without merging is not grounds for automatic branch deletion.

## 4. Review and merge gates

Every change to `main`, including a maintainer change, requires a PR.

Mandatory checks:

- CI: lint, typecheck, API/web unit tests, build, and the existing validation steps.
- API integration tests.
- E2E tests.

Require the PR to be up to date with `main` and all required checks to pass. Resolve all review threads before merging. Block direct pushes, force pushes, and deletion of `main`.

Require the maintainer's approval on other developers' PRs. Dismiss stale approval when new changes affect the reviewed diff. Set CODEOWNERS to `omchavan-jp` for the entire repository, including CODEOWNERS and workflow files themselves.

### Maintainer self-review exception

GitHub does not count a PR author's self-approval as an approving review. The maintainer may use an approval exception for their own PR after self-review. This exception must not waive the PR requirement, mandatory checks, resolved conversations, or `main` protections.

GitHub's native approval bypass is not conditional on PR authorship. Its availability to the maintainer on other PRs is a technical limitation; policy permits its use only for maintainer-authored changes. Keep the review exception in a separate ruleset from mandatory controls.

### Verification stages

- Before merge: code review and automated checks.
- After merge: deployment to UAT where applicable, runtime verification, and recorded UAT acceptance for a release.
- Before production changes: release eligibility checks and production approval.

Do not require a pre-merge UAT deployment under the current model, because UAT receives code from `main` after merge.

## 5. Production release eligibility and artifacts

- Only the maintainer creates `prod-*` tags. Preserve the date-based tag convention; standardize multiple-release suffixes consistently in the documentation and workflow validation.
- Tags target commits, not branches. Verify that the full tagged commit SHA belongs to `main` history. It need not be the latest `main` commit.
- Required automated checks must have succeeded for the exact tagged commit. A green PR check for a different SHA is insufficient.
- Promote the exact image digests tested on UAT; do not rebuild images for production.
- Production tags cannot be moved or deleted in routine operation. Create a new tag for each release.
- Serialize production deployments across all release tags; do not cancel an in-progress production deployment to start another.
- Restrict production deployment refs to authorized release refs. Keep all production-changing infrastructure, migration, and application steps behind approval.

### UAT acceptance

Provide an owner-authorized manual "Accept UAT release" workflow:

1. Select an identified successful UAT deployment.
2. Verify its required check results and deployed artifact identities.
3. Require the maintainer to provide a meaningful verification note describing what was exercised.
4. Record full commit SHA, the exact image set/digests, UAT deployment reference, actor, timestamp, and verification note.
5. Require production to find an acceptance record matching the release artifacts.

The record enforces an explicit decision, not proof of human testing. Automated smoke tests supplement it. A note or approval for a different deployment cannot authorize the requested release.

The current path-filtered deployment may update only the web image while leaving other images on older commits. Record the actual deployed set, including the migration image, rather than assuming all components share one SHA. Do not overwrite historical acceptance when UAT advances.

### Production approval

Creating a tag starts release preparation; it does not alone authorize production changes.

After eligibility validation, show a release summary and require approval through the existing `prod` environment. Configure the maintainer as reviewer, allow self-review for this iteration, and disable administrator bypass of the normal environment approval gate.

UAT acceptance means the artifact set was verified. Production approval means that accepted set may be deployed now. These are separate recorded decisions even while the same person makes both.

When another release approver is appointed, update the reviewer configuration and enable prevention of self-review. That future appointment is outside the current iteration.

### Release records

Automatically create a GitHub Release record and attached machine-readable manifest before production changes. Include:

- Release tag and full commit SHA.
- Exact image digests and artifact references.
- Included PRs/changes since the previous release.
- Required check evidence.
- UAT deployment, acceptance identity/time, and verification note.
- Production approval evidence and workflow run links.
- Deployment outcome and post-deployment health-check results.

The maintainer supplies UAT verification notes and optional additional release notes; automation supplies technical evidence. Refuse to start production changes if the prerequisite record cannot be created. Update the record after success/failure, and make a failure to update visible rather than reporting a completed audit record.

GitHub Release descriptions are editable, not an immutable audit ledger. Acceptance must use validated records from authorized workflows, not blindly trust editable release text. Select durable storage for acceptance/manifests during implementation; ordinary expiring workflow artifacts alone are insufficient for later releases and rollback.

## 6. Failure handling, migrations, and rollback

- Stop subsequent deployment stages on failure. A failed migration prevents the application rollout.
- Do not assume earlier infrastructure/database changes are automatically undone.
- Detect failures automatically; authorize rollback deliberately.
- Roll back application artifacts by selecting a previously verified exact image set. Do not rebuild images or move an existing production tag.
- Use a new release record/tag for the recovery operation, preserving original release history and recording the rollback target.
- Before rollback, assess whether the current database schema remains compatible with the previous application. If not, use a corrective migration or forward fix.
- Restoring a database backup is a separate recovery operation with data-loss implications, not a routine application rollback.

Migration PRs must explicitly document:

1. Schema/data changes and affected application versions.
2. Backward compatibility with the currently deployed and previous application.
3. Rollout ordering and any transitional deployment needs.
4. Recovery steps if migration or application rollout fails.
5. Any irreversible changes or data-loss implications.

Migrations may run in authorized, ordered deployment jobs. Preserve deliberate recovery and forward-only migration discipline.

## 7. Security and automation

- Enable Dependabot vulnerability alerts and security-update PRs.
- Configure weekly grouped routine dependency-update PRs, keeping major upgrades separate. Urgent security updates do not wait for the weekly routine.
- Enable CodeQL and review the existing findings. After establishing a reviewed baseline, block newly introduced high/critical findings. Track existing findings and reasoned dismissals explicitly.
- Keep secret scanning and push protection enabled. Never commit credentials; rotate/revoke real leaked credentials rather than merely deleting their text.
- Allow reviewed third-party Actions, pin them to full commit SHAs, and propose updates through reviewed PRs.
- Keep GitHub token permissions read-only by default. Grant additional permissions only to the specific jobs that need them.
- Separate build/UAT Azure authority from production authority. Production-capable access must be obtained only through approved production jobs.
- Keep deployment authority out of untrusted PR checks. Require approval for outside-contributor workflow runs. Approval to execute tests is not merge or release approval.
- Protect workflow and infrastructure changes through review. Do not run untrusted PR code in privileged workflow contexts.
- Add SECURITY.md with a private reporting route; confirm the route before publishing it.
- Bots do not approve or merge their own changes; normal review and merge controls apply.
- Review contributors, integrations, and cloud access quarterly and on offboarding.

Do not add mandatory commit signing, coverage-percentage gates, paid security platforms, or enterprise compliance machinery in this iteration.

### Cost and visibility

Keep the repository public for now and use eligible features without buying additional GitHub products. Standard public GitHub-hosted execution is free; storage/runner exceptions and Azure charges remain separate considerations.

Before any future conversion to private, review the current GitHub plan, Actions quotas, and control availability. Private personal repositories require Pro for branch/tag rulesets; native environment reviewer gates and advanced private-repository security have additional limitations. Preserve each policy goal through supported replacements before changing visibility. Do not silently disable required controls or purchase subscriptions.

## 8. Documentation and onboarding

- Maintain one authoritative repository policy document for these decisions. Other documents link to it rather than reproduce the entire policy.
- Add CONTRIBUTING.md for setup, branch/PR/review flow, mandatory checks, and the maintainer exception.
- Update DEPLOYMENT.md with executable UAT acceptance/release/rollback procedures.
- Add a concise PR template covering purpose, issue/spec links, testing, and applicable migration/recovery requirements.
- Add CODEOWNERS and SECURITY.md.
- Reconcile AGENTS.md, CLAUDE.md, workflow documentation, development-process guidance, and infrastructure conventions. Remove or mark obsolete contradictory instructions.
- Retain short essential reminders in agent instructions while linking to authoritative policy.
- Document onboarding/offboarding, hook activation, local verification, and responsibility assignment.
- Change policy through reviewed PRs and update associated settings/workflows together.
- Distinguish agreed policy, implemented controls, verified controls, and remaining work.

## 9. Implementation boundary

Adopting this policy in a documentation PR does not activate GitHub rules, cloud permissions,
release workflows, or historical branch deletion. Track each separately in rollout status.

Use [the OpenSpec implementation tasks](../openspec/changes/github-governance/tasks.md) to prepare
and verify incremental changes. The historical branch purge is authorized without a backup but
is a later implementation operation, not a side effect of this documentation PR.
Production-impacting tests require an explicitly coordinated release; they must not happen
implicitly as a side effect of testing governance controls.
