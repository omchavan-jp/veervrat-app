# STATE — GitHub Governance Rollout

Owner: `omchavan-jp`.
Last verified: 2026-10-10 for effective rules, owner bypass capabilities, merge settings,
CODEOWNERS validity and disposable branch/tag tests. Main remained at
`9529b60bc6c1451ec887b0c56c681ec38c6af57a` throughout those tests.
Refresh when: a governance PR merges, settings/cloud permissions change, a gate is tested,
or repository visibility/GitHub plan changes.

Policy: [Git and Release Governance](../documentation/25_Git-and-Release-Governance.md).
Implementation work: [OpenSpec tasks](../openspec/changes/github-governance/tasks.md).

## Distinguish policy from enforcement

| Area                                          | Evidence / implementation state                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Policy and contributor documentation          | Merged in [PR #315](https://github.com/omchavan-jp/veervrat-app/pull/315); post-merge CI, integration, E2E and UAT deployment passed |
| CODEOWNERS and PR template                    | Merged in #315; CODEOWNERS has no API-reported errors; required owner review is now active                                           |
| Main and production tag rulesets              | Five active rulesets verified by API read-back and disposable branch/tag tests; details below                                        |
| Merge method / branch deletion settings       | Squash only; automatic source-branch deletion enabled; squash commit uses PR title/body                                              |
| Historical branch purge                       | Owner authorized deletion without backup; execution pending; preserve main and production tags                                       |
| Existing automated checks / CD                | Consult workflow definitions; this PR does not change their executable behavior                                                      |
| UAT acceptance and release manifests          | Implementation and verification pending                                                                                              |
| Production reviewer gate and digest promotion | Implementation and verification pending; existing CD can deploy on a prod-\* tag                                                     |
| Separate production cloud authority           | Implementation/live-assignment verification pending                                                                                  |
| Dependency/code security controls             | Enablement, baseline triage, and verification are later implementation work                                                          |
| Private vulnerability reporting               | GET private-vulnerability-reporting returned enabled=false; SECURITY.md documents a contact-request fallback                         |

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
  temporary verification rulesets were removed. Final inventory contains only the five live rules above.

Limits: no collaborator account was impersonated; contributor denial follows the exact-user
allowlist read-back. Main force-push/deletion denial was verified from effective rules rather
than attempted destructively. Automatic post-merge deletion and successful merging with green
checks will also be exercised by subsequent approved PRs. Production was not deployed by these tests.
The owner exception cannot be limited automatically to owner-authored PRs; policy limits its use.
