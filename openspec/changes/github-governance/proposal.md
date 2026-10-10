# GitHub governance

## Why

The repository is becoming a team project, but retained branches, unenforced review rules,
tag-only production authorization, and contradictory instructions reflect earlier solo work.
The owner agreed six policy chunks covering responsibilities, branches, merge gates, releases,
security, and documentation on 2026-10-10.

## What changes

Implement [the agreed governance policy](../../../documentation/25_Git-and-Release-Governance.md)
incrementally, starting with documentation and contribution entry points. Later batches enforce
permissions, security automation, UAT acceptance, approved artifact promotion, and recovery;
then purge historical branches without backup as explicitly authorized.

## Scope

Keep public personal ownership, single main trunk, and existing local/UAT/prod environments.
No organization transfer, extra environments, implicit license, paid subscription, or production
drill is included. Track enforcement evidence in [rollout status](../../../ops/github-governance-status.md).
