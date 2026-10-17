# Governance and deployment documentation reconciliation — 2026-10-15

Owner: `omchavan-jp`. Scope: the GitHub governance, security, identity/state and release-control
rollout, including its implementation and verification limits. This is a documentation-only
consistency pass, not a fresh cloud audit, deployment, operational drill or product-wide QA pass.

## Evidence and authoritative references

| Subject | Current reference | Evidence / reconciliation |
| --- | --- | --- |
| Roles, reviews, squash/delete, immutable production requests | [Governance policy](../documentation/25_Git-and-Release-Governance.md), [rollout status](github-governance-status.md) | Main effective rules and squash/delete settings read back during review of #372; all seven checks passed before its merge. Owner-only merge and author-review exception remain separate from mandatory checks. |
| Security automation | [Security status](security-remediation-status.md), [workflow guide](../.github/workflows/README.md) | Selected nine Action patterns, read-only token defaults and disabled workflow PR approval read back on 2026-10-15. Existing dependency work is separate; the upstream `braces` advisory is not declared fixed. |
| State and scoped cloud authority | [State migration](terraform-state-migration.md), [identity cutover](azure-identity-cutover.md), [Azure facts](azure-account-facts.md) | Earlier exact-scope/apply/read-back evidence retained. Twelve base grants plus later private-record grants distinguished; legacy identity deleted, not retained as active authority. No fresh Azure mutation or grant recertification in this pass. |
| Receipt, human acceptance, release eligibility, promotion and audit | [Runbook](../DEPLOYMENT.md), [release evidence](release-controls-rollout.md), [controller](production-controller.md) | Actual `prod-2026-10-12` controller 38262172088/1 promoted the owner-accepted four digests, without rebuild, after native approval. Private/public success and closed claim were independently verified; follow-up exact-ref production plan was clean. |
| Native production admission | [Controller boundary](production-controller.md) | GitHub read-back on 2026-10-15 confirmed sole branch policy `main`, owner ID 317451750 reviewer and allowed owner self-review. Historical temporary-main/tag-only instructions are not current policy. |
| Human production confirmation | [Owner follow-up](release-controls-rollout.md#owner-production-confirmation-2026-10-15) | Maintainer reported "Everything is working in prod." Recorded as owner-reported production acceptance, not an invented browser matrix or separate delivery/restore/rollback drill. |
| Artifact selection and recovery | [Runbook](../DEPLOYMENT.md), [infra conventions](../documentation/21_Infrastructure-Conventions.md), [Terraform guide](../infra/terraform/README.md) | Current source uses explicit component references, held apps through migration, guarded plans and deliberate schema-reviewed rollback. Old tag-based manual-deployment/quota shortcuts are superseded, not authorized production fallbacks. |
| Superseded operational descriptions | [System status](../documentation/01_System-Decisions-and-Status.md), [observability](../documentation/18_Observability-Standard.md), [email](../documentation/19_Email-Strategy.md), [frontend conventions](../documentation/13_Frontend-Conventions.md) | Reconciled remaining placeholder, direct-S3, build-time editor and Application Insights contradictions against existing evidence and source. No new SMTP, Sentry, content-editing or WebSocket drill is claimed. |

## Coverage and preservation

Searched tracked Markdown outside historical OpenSpec archives/product specs for the superseded
release, identity, branch, storage, configuration and telemetry descriptions. Reconciled the
runbook, contributor/agent entry points, engineering index/status/conventions, workflow and
Terraform READMEs, project/Azure facts and identity/state/controller/rollout records. The original
foundation plan is explicitly historical, not a live action list. Dated financial, deployment
and session observations remain historical; this pass does not certify current costs or every
unrelated backlog issue. OpenSpec methodology is unchanged; #372 separately reconciles its
existing governance task record and leaves contributor-flow/final-disposition tasks open.

Historical bootstrap/maintenance examples explain mechanisms, not release authorization.
Exceptional production recovery still requires an explicit reviewed decision preserving the
active authorization boundary; a green endpoint or last-commit migration diff is not enough.
Terraform recovery state was not deleted. No credentials, plans or state contents were published.

## Validation of this documentation change

Existing controller/acceptance/record/digest-deployment/security/identity fixtures: 68 passed,
zero failed. Path-classifier fixtures passed, and the changed Markdown set classifies as
`app_changed=false`, `docs_changed=false` (no application or product-docs deployment).
Local Markdown file targets were checked for existence and whitespace checked with
`git diff --check`. Repository CI/integration/E2E/CodeQL remain mandatory before merge;
these local checks do not substitute for them or claim new runtime verification.

## Honest remaining limits

- No complete non-owner contributor review/merge/UAT walkthrough is claimed.
- No new standalone production WebSocket/Sentry-delivery/backup-restoration or live-rollback
  drill was performed. Live rollback is not required merely to manufacture a completion tick.
- Workflow-validated provenance is implemented; cryptographic attestations and WORM storage
  are not. Azure maintainer authority remains a separate trust boundary.
- A comprehensive registry-retention policy is not certified; preserve accepted/recovery digests.
- Dependency remediation, recurring access/secret reviews and licensing disposition remain
  separate work. Organization/teams/transfer and developer/preview environments remain deferred.

This record is evidence-bounded: future changes must refresh the relevant authoritative
document and its dated read-back, rather than treating this snapshot as a permanent guarantee.
