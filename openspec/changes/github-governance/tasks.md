## 1. Documentation PR

- [x] 1.1 Prepare authoritative governance policy and rollout status for review.
- [x] 1.2 Add contributor/security guidance, CODEOWNERS, and PR template to the proposal branch.
- [x] 1.3 Reconcile live Git, review, migration, release, and agent instructions in the proposal branch.
- [x] 1.4 Validate local links, obsolete-rule removal, whitespace, and new-file formatting.
      Local check: 18 Markdown files / 74 local links; exact CODEOWNERS pattern; no executable
      workflow/application changes. Existing CD classifier fixtures pass. CODEOWNERS is app-relevant
      under the unchanged classifier, so merging may deploy UAT.
- [ ] 1.5 Open the documentation PR and record CI results.
- [ ] 1.6 Owner reviews/merges the documentation PR; refresh rollout status.

## 2. Permissions and merge controls

- [ ] 2.1 Prepare/read back layered main protections, required checks, review freshness, owner-only merge, and owner approval exception.
- [ ] 2.2 Enable squash-only merge and post-merge source-branch deletion.
- [ ] 2.3 Verify allowed/denied cases without destructive main operations; update rollout status.

## 3. Security and authorization

- [ ] 3.1 Enable dependency updates, private reporting, code scanning, and reviewed security baseline/gates.
- [ ] 3.2 Pin allowed Actions and minimise token permissions; protect untrusted PR execution.
- [ ] 3.3 Separate production Azure identity/authority and verify actual grants and approval boundary.

## 4. Releases

- [ ] 4.1 Record UAT component digests and implement owner-authorized durable UAT acceptance.
- [ ] 4.2 Enforce immutable production tags, main ancestry, and exact-commit checks.
- [ ] 4.3 Implement promotion without rebuild, production approval, and cross-tag serialization.
- [ ] 4.4 Generate prerequisite release manifests and record success/failure evidence.
- [ ] 4.5 Implement deliberate schema-compatible rollback/recovery; verify safe non-production cases.

## 5. Cleanup and handoff

- [ ] 5.1 Refresh historical branch/open-PR targets and delete all validated historical branches except main, without backup; preserve production tags.
- [ ] 5.2 Verify effective settings, contributor flow, retained refs, and private-visibility prerequisites.
- [ ] 5.3 Record remaining unverified production behavior and archive only when implementation and review are complete.
