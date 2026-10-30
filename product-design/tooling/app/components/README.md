# components

## Overview

Canonical D2 diagram renderer, interactive viewer and download support. [d2-diagram.tsx:D2Diagram] [diagram-view.tsx:DiagramView] [diagram-export.ts:downloadDiagram]

## Interface

- D2Diagram accepts src and alt; DiagramView offers expand, zoom, pan and SVG/PNG download. [d2-diagram.tsx:D2Diagram] [diagram-view.tsx:DiagramView]

## Invariants

- Unknown manifest keys throw; zoom is limited to 0.5–4; PNG scaling limits dimensions and pixel count. [d2-diagram.tsx:D2Diagram] [diagram-view.tsx:DiagramView] [diagram-export.ts:downloadDiagram]

## Side Effects

- Fetches SVG, creates canvas and object URLs for downloads; modal and focus state change in browser. [diagram-export.ts:downloadDiagram] [diagram-view.tsx:DiagramView]

## Verification

From `product-design/tooling`, run `pnpm validate` to check governance and D2 sources. This was not run during documentation generation.
