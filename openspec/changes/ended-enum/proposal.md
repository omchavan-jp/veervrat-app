## Why

`VmRelationshipState` has only `PENDING` and `ACTIVE`. Ending a relationship sets `endedAt`
while `state` stays `ACTIVE`, which forces every read query to double-check `endedAt: null`
alongside `state: ACTIVE`. This is error-prone — miss one and an ended relationship leaks
through — and was the root cause of the access-revocation bug found in the 2026-08-27 audit.

## What

Add `ENDED` to `VmRelationshipState`. A migration backfills existing rows where
`ended_at IS NOT NULL`. End methods now set `state: ENDED` alongside `endedAt`, and queries
filter on `state: ACTIVE` alone — `endedAt: null` guards removed.

## Decision

Approved by Om on 2026-08-27 (audit item 5).
