# suggestions

## Overview

Capture suggestion anchors, convert text bodies and resolve route entities.

## Interface

- Anchor/captureAnchor/blockElementFor expose page location capture [anchor.ts:Anchor] [anchor.ts:captureAnchor] [anchor.ts:blockElementFor].
- TiptapDoc, textToDoc and docToText convert suggestion bodies [body.ts:TiptapDoc] [body.ts:textToDoc] [body.ts:docToText].
- ResolvedEntity, resolveEntity and KNOWN_ENTITY_ROUTES expose route-to-entity lookup [entity-registry.ts:ResolvedEntity] [entity-registry.ts:resolveEntity] [entity-registry.ts:KNOWN_ENTITY_ROUTES].

## Invariants

- Anchor path is a positional hint, text and path are bounded; unknown routes or missing IDs return an empty entity [anchor.ts:findPath] [anchor.ts:findText] [entity-registry.ts:resolveEntity].
- Blank suggestion text yields undefined; paragraph boundaries are separated by blank lines [body.ts:textToDoc].

## Side Effects

- Anchor capture reads DOM and viewport dimensions [anchor.ts:captureAnchor].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
