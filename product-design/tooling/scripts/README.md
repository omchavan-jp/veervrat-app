# scripts

## Overview

Governance inspection and themed D2 generation scripts. [decision-refs.mjs:id] [deferred-list.mjs:topics] [generate-diagrams.mjs:manifest]

## Interface

- decision:refs takes PD ID; deferred:list takes optional phase ID; shared helpers expose walk, registry loading and reference extraction. [decision-refs.mjs:id] [deferred-list.mjs:requestedPhase] [governance.mjs:findReferences]
- Run the Node validator directly; it prints warnings, errors and a validation summary and sets a failing exit code on errors. [validate.mjs:errors]

## Invariants

- Reference inspection fails for superseded decisions with live references; diagrams are hashed from source, theme and D2 version. Newly rendered SVGs are rejected for script/foreignObject tags or HTTP(S) href/src attributes; existing cached SVGs are reused without that check. [decision-refs.mjs:live] [generate-diagrams.mjs:digest] [generate-diagrams.mjs:cached]
- Decision and deferred IDs must be unique, correctly formed and retained from Git history; roadmap has exactly one current phase and phase reconciliation rules; references and internal links must resolve. [validate.mjs:validateRegistry] [validate.mjs:validateHistoricalIds] [validate.mjs:loadRoadmapPhases] [validate.mjs:validateDeferredTopics] [validate.mjs:validateLinks] [validate.mjs:validateReferences]
- If the D2 CLI is absent, validation warns and skips diagram rendering without failing solely for that reason. Diagram generation for development or build requires the CLI. [validate.mjs:validateD2] [generate-diagrams.mjs:version]

## Side Effects

- Scripts read governance and D2 files, print findings, invoke d2, write cached and public SVGs and manifest, and remove stale SVGs. [governance.mjs:loadRegistry] [deferred-list.mjs:roadmap] [generate-diagrams.mjs:sources] [generate-diagrams.mjs:active]
- Reads repository files and Git history, runs D2 if installed, and creates then removes a temporary rendering directory. [validate.mjs:validateHistoricalIds] [validate.mjs:validateD2]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
