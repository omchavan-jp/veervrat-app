# STATE — GitHub Governance Rollout

Owner: `omchavan-jp`.
Last verified: 2026-10-10 for repository owner/ruleset inventory/private-reporting API reads and
workflow definitions on `main` at `c1320923fc4632b7b1eacf903f215db33565ec51`.
Refresh when: a governance PR merges, settings/cloud permissions change, a gate is tested,
or repository visibility/GitHub plan changes.

Policy: [Git and Release Governance](../documentation/25_Git-and-Release-Governance.md).
Implementation work: [OpenSpec tasks](../openspec/changes/github-governance/tasks.md).

## Distinguish policy from enforcement

| Area                                          | Evidence / implementation state                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Policy and contributor documentation          | Proposed in this documentation PR; not yet merged                                                            |
| CODEOWNERS and PR template                    | Proposed in this PR; CODEOWNERS alone does not require approval                                              |
| Main and production tag rulesets              | API inventory returned no rulesets; activation and permission verification pending                           |
| Merge method / branch deletion settings       | Changes planned; not applied by this PR                                                                      |
| Historical branch purge                       | Owner authorized deletion without backup; execution pending; preserve main and production tags               |
| Existing automated checks / CD                | Consult workflow definitions; this PR does not change their executable behavior                              |
| UAT acceptance and release manifests          | Implementation and verification pending                                                                      |
| Production reviewer gate and digest promotion | Implementation and verification pending; existing CD can deploy on a prod-\* tag                             |
| Separate production cloud authority           | Implementation/live-assignment verification pending                                                          |
| Dependency/code security controls             | Enablement, baseline triage, and verification are later implementation work                                  |
| Private vulnerability reporting               | GET private-vulnerability-reporting returned enabled=false; SECURITY.md documents a contact-request fallback |

## Read-back commands

Run these with the authorized owner's gh account when updating the state. A failed API call is
not evidence that a setting is absent.

```bash
gh api repos/omchavan-jp/veervrat-app/rulesets
gh api repos/omchavan-jp/veervrat-app/branches/main/protection
gh api repos/omchavan-jp/veervrat-app/environments/prod
gh api repos/omchavan-jp/veervrat-app/private-vulnerability-reporting
gh api repos/omchavan-jp/veervrat-app/actions/permissions
gh api repos/omchavan-jp/veervrat-app/actions/permissions/workflow
```

Record each control's implementation PR, read-back evidence, allowed/denied test, and limitations
here when verified. Do not mark a gate verified only because documentation or configuration was
written. The current documentation PR runs ordinary CI; it is not a production-release test.
