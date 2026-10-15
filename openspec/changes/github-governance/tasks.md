# GitHub governance — implementation and verification tasks

Reconciled 2026-10-15 against merged PRs, current GitHub read-backs and the
`prod-2026-10-12` release records. Checked tasks mean their stated scope has evidence;
they do not certify every production flow or authorize further operations. This change
remains active and is **not archived**.

Reconciliation validation: 34 existing controller, release-record and digest-deployment
fixture tests passed locally on 2026-10-15. These tests perform no cloud deployment.

## 1. Documentation PR

- [x] 1.1 Prepare authoritative governance policy and rollout status for review.
- [x] 1.2 Add contributor/security guidance, CODEOWNERS, and PR template to the proposal branch.
- [x] 1.3 Reconcile live Git, review, migration, release, and agent instructions in the proposal branch.
- [x] 1.4 Validate local links, obsolete-rule removal, whitespace, and new-file formatting.
      Local check: 18 Markdown files / 74 local links; exact CODEOWNERS pattern; no executable
      workflow/application changes. Existing CD classifier fixtures pass. CODEOWNERS is app-relevant
      under the unchanged classifier, so merging may deploy UAT.
- [x] 1.5 Open the documentation PR and record CI results.
      [#315](https://github.com/omchavan-jp/veervrat-app/pull/315): CI, integration and
      E2E passed; merged 2026-10-10. Those results were read back during reconciliation.
- [x] 1.6 Owner reviews/merges the documentation PR; refresh rollout status.
      #315 was merged by `omchavan-jp`; #317 records subsequent controls verification.
      See [governance rollout](../../../ops/github-governance-status.md).

## 2. Permissions and merge controls

- [x] 2.1 Prepare/read back layered main protections, required checks, review freshness, owner-only merge, and owner approval exception.
      [#317](https://github.com/omchavan-jp/veervrat-app/pull/317) and the governance
      rollout record contain exact-rule verification. Fresh effective-main-rule read-back
      confirms required PR/check/review controls. The owner approval exception does not
      bypass mandatory checks; limiting its use to owner-authored PRs remains policy.
- [x] 2.2 Enable squash-only merge and post-merge source-branch deletion.
      #317 records successful merging/deletion; current repository settings confirm squash
      only and `delete_branch_on_merge=true`.
- [x] 2.3 Verify allowed/denied cases without destructive main operations; update rollout status.
      #317 records disposable-ref direct-update and missing-check merge denials, allowed
      tag creation and denied tag mutation/deletion. No collaborator was impersonated;
      destructive main operations were not attempted. See the rollout record for limits.

## 3. Security and authorization

- [x] 3.1 Enable dependency updates, private reporting, code scanning, and reviewed security baseline/gates.
      [#319](https://github.com/omchavan-jp/veervrat-app/pull/319) records activation;
      #337 records remediation. Current read-backs confirm private reporting and the
      effective CodeQL gate. Enabling controls is not equivalent to resolving every advisory;
      the upstream braces alert remains separate work. See
      [security status](../../../ops/security-remediation-status.md).
- [x] 3.2 Pin allowed Actions and minimise token permissions; protect untrusted PR execution.
      #319 shipped SHA pins, the allowlist, explicit permissions and negative fixtures.
      Fresh read-backs confirm native SHA pinning, selected Actions, read-only default
      workflow permissions and no workflow PR approvals. Fork-execution policy verification
      is recorded in the governance rollout; no new fork execution was induced here.
- [x] 3.3 Separate production Azure identity/authority and verify actual grants and approval boundary.
      #350/#352/#355/#357 record state separation, scoped identity verification and legacy
      retirement; #364/#365 establish the current main-only production controller boundary.
      [Identity cutover](../../../ops/azure-identity-cutover.md) and
      [release evidence](../../../ops/release-controls-rollout.md) record live scoped
      production writes and independent read-back. Native owner approval on production run
      38262172088/1 was freshly confirmed through GitHub approval history. No Azure mutation
      or fresh Azure grant read-back was performed for this reconciliation.

## 4. Releases

- [x] 4.1 Record UAT component digests and implement owner-authorized durable UAT acceptance.
      #359/#360 implement validated receipt/acceptance records; #361/#362 deploy verified
      UAT digests. Owner acceptance
      [38261941774/1](https://github.com/omchavan-jp/veervrat-app/actions/runs/38261941774)
      binds receipt 38231047598/1 and its exact image set. #363/#366/#367 record rollout.
- [x] 4.2 Enforce immutable production tags, main ancestry, and exact-commit checks.
      #317 records immutable-tag controls and safe denied-path tests; #359/#365 implement
      main-ancestry and exact-attempt/check/acceptance validation, with rejection fixtures.
      Actual accepted release provenance is attached to the release below.
- [x] 4.3 Implement promotion without rebuild, production approval, and cross-tag serialization.
      #365 implements the protected-main controller and shared non-cancelling concurrency
      group. [Tag request 38262150079](https://github.com/omchavan-jp/veervrat-app/actions/runs/38262150079)
      skipped builds; [controller 38262172088/1](https://github.com/omchavan-jp/veervrat-app/actions/runs/38262172088)
      promoted the accepted digests after native owner approval. Concurrency is configured
      and source-tested; no simultaneous production-release drill was induced.
- [x] 4.4 Generate prerequisite release manifests and record success/failure evidence.
      [Release prod-2026-10-12](https://github.com/omchavan-jp/veervrat-app/releases/tag/prod-2026-10-12)
      contains `manifest-38262172088-1.json` and `outcome-38262172088-1.json`; #367 records
      live/private verification. Public assets were read during reconciliation: accepted
      receipt and manifest image sets match; outcome records success, readiness and wiring.
      Failure/publication-denial handling is covered by controller fixtures, not a deliberately
      failed production deployment. No live failure-recovery certification is claimed.
- [x] 4.5 Implement deliberate schema-compatible rollback/recovery; verify safe non-production cases.
      #365 includes rollback history/schema-review requirements, no-migration recovery and
      a Terraform image/metadata-only guard. `production-release.test.mjs` and
      `release-record.test.mjs` exercise successful/denied fixture cases. This task calls
      for safe non-production verification; live production rollback remains unperformed.

## 5. Cleanup and handoff

- [x] 5.1 Refresh historical branch/open-PR targets and delete all validated historical branches except main, without backup; preserve production tags.
      #357/#358 and [cleanup evidence](../../../ops/focused-cleanup-2026-10-11.md) record
      186 inventoried historical remote refs removed with SHA leases, tag SHAs preserved,
      and active PR heads retained. Local historical branches were deliberately not purged.
- [ ] 5.2 Verify effective settings, contributor flow, retained refs, and private-visibility prerequisites.
      **Partial:** #317 and current read-backs support effective settings; #357/#358 support
      retained refs; governance policy documents private-visibility prerequisites (no visibility
      change is planned). No complete non-owner contributor walkthrough is established by these
      records: earlier tests did not impersonate collaborators. #370 is an open contributor PR,
      not proof of its full review/merge/UAT closeout. Record that verification or an explicitly
      scoped maintainer disposition before marking this composite task complete.
- [ ] 5.3 Record remaining unverified production behavior and archive only when implementation and review are complete.
      **Recording complete, archive gate open:** #367 and release rollout explicitly retain
      unverified live rollback, fresh production browser flows, WebSocket delivery, Sentry
      delivery and backup restoration. Web-only mixed-digest behavior has source tests, not
      a separately claimed live rollout. These limits are not all automatically blockers for
      this governance scope, but cannot be converted into passes. Finish/dispose of 5.2 and
      obtain final review of the reconciled change before considering archival. This update
      does not archive the change or authorize production verification.
