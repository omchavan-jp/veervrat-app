# STATE — GitHub Governance Rollout

Owner: `omchavan-jp`.
Latest scoped identity/state/approval evidence: 2026-10-12; see the identity cutover and production controller records.
Initial baseline: 2026-10-10 for permission read-back, security settings and CodeQL.
Main remained at `9529b60bc6c1451ec887b0c56c681ec38c6af57a` during the permission tests;
PR #317 then merged at `cb9eaadab2c5cb48eff6df33f911448a098574de`, which the CodeQL baseline analyzed.
Refresh when: a governance PR merges, settings/cloud permissions change, a gate is tested,
or repository visibility/GitHub plan changes.

Policy: [Git and Release Governance](../documentation/25_Git-and-Release-Governance.md).
Implementation work: [OpenSpec tasks](../openspec/changes/github-governance/tasks.md).

## Distinguish policy from enforcement

| Area                                    | Evidence / implementation state                                                                                                                                                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy and contributor documentation    | Merged in [PR #315](https://github.com/omchavan-jp/veervrat-app/pull/315); post-merge CI, integration, E2E and UAT deployment passed                                                                                                                                                               |
| CODEOWNERS and PR template              | Merged in #315; CODEOWNERS has no API-reported errors; required owner review is now active                                                                                                                                                                                                         |
| Main and production tag rulesets        | Five permission rulesets verified; sixth CodeQL security ruleset is active after baseline triage                                                                                                                                                                                                   |
| Merge method / branch deletion settings | Squash only; automatic source-branch deletion enabled; squash commit uses PR title/body                                                                                                                                                                                                            |
| Historical branch purge                 | Completed 2026-10-11: 186 historical remote refs removed with SHA leases; main, all tags, 16 open Dependabot heads and active cleanup work preserved; no extra Git backup                                                                                                                          |
| Existing automated checks / CD          | PR #317 post-merge checks passed; security PR stages Action pins and job-scoped permissions without changing deployment ordering                                                                                                                                                                   |
| UAT acceptance and release manifests | #365 UAT rollout 38231047598/1 and authenticated controller read-back 38232797117 passed; digest receipt and recorded check evidence verified. Owner human acceptance remains deliberately pending. [Evidence/sequence](release-controls-rollout.md) |
| Production reviewer gate                | #364 boundary activated/read back 2026-10-12: protected main only; owner required, self-approval allowed, admin bypass disabled. Earlier read-only approval probe passed; production-changing approval remains for a planned release                                                               |
| Digest promotion | #365 merged protected-main promotion/rollback with exact acceptance, native approval, private manifests/claims/outcomes and no rebuilding. 68 source tests and real read-only allowed/denied checks passed; first production write and rollback execution remain deliberate release checkpoints. |
| Separate production cloud authority     | Three identity probes passed; environment clients switched, scoped UAT publishing/deploy passed (38124662672), six legacy grants/three FICs removed and fresh old federation rejected (38133195235). Production writes intentionally await a planned release                                       |
| Dependency/code security controls       | Dependabot alerts/security updates and CodeQL are enabled; existing findings recorded; grouped version-update config merged in #319; remaining remediation is tracked separately                                                                                                                   |
| Private vulnerability reporting         | Enabled and verified by API; SECURITY.md links to the confidential GitHub reporting form                                                                                                                                                                                                           |

## Read-back commands

Run these with the authorized owner's gh account when updating the state. A failed API call is
not evidence that a setting is absent.

```bash
gh api repos/omchavan-jp/veervrat-app/rulesets
gh api repos/omchavan-jp/veervrat-app/rules/branches/main
gh api repos/omchavan-jp/veervrat-app/branches/main
gh api repos/omchavan-jp/veervrat-app/environments/prod
gh api repos/omchavan-jp/veervrat-app/private-vulnerability-reporting
gh api repos/omchavan-jp/veervrat-app/actions/permissions
gh api repos/omchavan-jp/veervrat-app/actions/permissions/workflow
```

Record each control's implementation PR, read-back evidence, allowed/denied test, and limitations
here when verified. Do not mark a gate verified only because documentation or configuration was
written. This status update records permission verification; it is not a production-release test.

## Applied rules and permission evidence

| Ruleset                                                                                   | Enforced behavior                                                                                                     | Owner bypass                                         |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [main-required-controls](https://github.com/omchavan-jp/veervrat-app/rules/24830029)      | PR, resolved conversations, current-base CI/integration/E2E from GitHub Actions; block main deletion and force pushes | Never                                                |
| [main-owner-merge](https://github.com/omchavan-jp/veervrat-app/rules/24830023)            | Only user ID 317451750 (`omchavan-jp`) may update main through a PR                                                   | PR-only                                              |
| [main-review-policy](https://github.com/omchavan-jp/veervrat-app/rules/24830030)          | One approval, CODEOWNERS review and stale-approval dismissal                                                          | Owner PR-only approval exception                     |
| [production-tag-creation](https://github.com/omchavan-jp/veervrat-app/rules/24830031)     | Only the named owner may create prod-\* tags                                                                          | Owner creation only; immutable-tag rules still apply |
| [production-tag-immutability](https://github.com/omchavan-jp/veervrat-app/rules/24830032) | Block updates and deletion of prod-\* tags                                                                            | Never                                                |

Effective main rules and repository settings were asserted against the exact payloads. GitHub
reports main protected, no CODEOWNERS errors, and no owner bypass of mandatory checks.
Creation authority is bound to the user, not every account with an administrator role.

Safe behavioral checks copied the exact rules to disposable refs, changing only rule names and
target refs; the live main branch and production tags were not mutated:

- Owner direct update rejected with HTTP 422: PR required and all three checks expected.
- [Verification PR #316](https://github.com/omchavan-jp/veervrat-app/pull/316) targeted a disposable
  branch. Owner squash merge rejected with HTTP 405 because all three checks were missing.
  This also exercised the approval exception: it did not waive the mandatory checks.
- Owner could create a disposable non-production tag; updating and deleting it were each
  rejected with HTTP 422 under copies of the immutable-tag rules.
- The test PR was closed without merge. Both disposable branches, the test tag, and all five
  temporary verification rulesets were removed. At the permission-batch check, inventory contained only those five rules; the security batch adds the CodeQL rule below.

Limits: no collaborator account was impersonated; contributor denial follows the exact-user
allowlist read-back. Main force-push/deletion denial was verified from effective rules rather
than attempted destructively. PR #317 then exercised successful owner merging with green checks and automatic source-branch deletion. Production was not deployed by these tests.
The owner exception cannot be limited automatically to owner-authored PRs; policy limits its use.

## Security automation activation

- Dependabot alerts and automatic security-update PRs are enabled. The initial baseline is
  [recorded separately](audit/github-security-baseline-2026-10-10.md); subsequent assessments and
  candidate fixes are tracked in [remediation status](security-remediation-status.md).
- GitHub-managed CodeQL default setup is configured and its initial Actions, JavaScript/TypeScript
  and Python analyses succeeded. [main-codeql-security](https://github.com/omchavan-jp/veervrat-app/rules/24831677)
  requires CodeQL results and rejects new high/critical security findings, with no owner bypass.
- Secret scanning and push protection remain enabled. Private vulnerability reporting is enabled.
- All external fork contributors require workflow-run approval. The default token remains read-only
  and workflows cannot approve PR reviews.
- The selected-Action allowlist is active: no broad GitHub-owned or Marketplace-verified allowance;
  only the nine reviewed patterns in `.github/actions-policy.json` are permitted.
- Full-SHA Action pins, explicit workflow/job permissions, the CI security-policy checker and
  grouped Dependabot configuration merged in [PR #319](https://github.com/omchavan-jp/veervrat-app/pull/319).
- Native `sha_pinning_required` is enabled. Post-merge CI, integration, E2E, GitHub-managed CodeQL
  and UAT CD passed under the enforced policy; the three workflow-permission alerts are fixed.
- [Security remediation status](security-remediation-status.md) records tested dependency/code
  fixes, one evidence-backed false-positive disposition and the unresolved upstream braces alert.
- Separate build/UAT/production authority is active; production release-controller rollout is
  tracked in [release controls](release-controls-rollout.md). No production tag/deployment was part of the security batch.

Read-back commands for security activation:

```bash
gh api repos/omchavan-jp/veervrat-app/vulnerability-alerts
gh api repos/omchavan-jp/veervrat-app/automated-security-fixes
gh api repos/omchavan-jp/veervrat-app/code-scanning/default-setup
gh api repos/omchavan-jp/veervrat-app/rulesets/24831677
gh api repos/omchavan-jp/veervrat-app/actions/permissions/selected-actions
gh api repos/omchavan-jp/veervrat-app/actions/permissions/fork-pr-contributor-approval
```
