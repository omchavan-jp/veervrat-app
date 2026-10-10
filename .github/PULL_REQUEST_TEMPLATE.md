## Purpose

What changes, why, and what will someone observe? Link the issue/spec or explain why neither applies.

## Verification

- Local checks performed and their results:
- Remaining verification or limitations:
- For runtime changes: UAT walkthrough occurs after merge; record evidence before production.

## Compatibility and recovery

If no database, infrastructure, or release-impacting changes are included, write "Not applicable."
Otherwise explain:

- Schema/data changes and compatibility with the current and previous app versions:
- Rollout ordering and transitional steps:
- Irreversible effects or potential data loss:
- Recovery if migration or application deployment fails:
- Whether the previous app can safely run against the resulting schema:

## Review and documentation

- [ ] Conventional PR title; small, complete scope.
- [ ] Applicable specs/docs updated; user-visible CHANGELOG entry added if needed.
- [ ] Review requested from `omchavan-jp`, or maintainer self-review exception identified.
- [ ] No credentials, personal data, or confidential security details included.

Merge controls and release requirements: [Git and Release Governance](../documentation/25_Git-and-Release-Governance.md).
