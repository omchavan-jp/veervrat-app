# Product design tooling

> **Map:** This directory contains optional presentation tooling and repository checks. It is separate from the end-user app packages. MDX and D2 remain the editable source of truth if this tooling is removed.

## Renderer

The Fumadocs app reads the workspace MDX files directly through the documented Fumadocs MDX macro source. It is an isolated build-time renderer; its static export is packaged inside the Veervrat web image outside `apps/web/public`. From this directory, install its local dependencies once and run:

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000/product-docs` (or the port printed by Next.js). The
renderer has a `/product-docs` base path and opens the workspace `README.mdx`
there. MDX remains the source of truth; Fumadocs only presents it. D2 files
are authored as `.d2` source and rendered at build time by a pinned D2 CLI into
light and dark SVG files; no checked-in SVG copy is used. Search indexing and
governance JSON are also generated during the static build.

To verify the static export from this directory, run:

```sh
pnpm build --webpack
```

## Validator

From this directory:

```sh
pnpm validate
pnpm decision:refs PD-014
```

`pnpm validate` checks registry shape and IDs, canonical homes, supersession links and cycles, live and historical references, relative MDX links and headings, and D2 parsing/rendering. Bare `PD-*` references are LIVE dependencies. The exact historical syntax is `PD-014 (historical)`; see `../00-governance/working-method.mdx`.

`pnpm decision:refs PD-014` lists the decision's backlinks across MDX and D2, grouped into LIVE dependencies and HISTORICAL references. Its LIVE list is the set of artifacts to revisit if that decision is superseded. From the repository root, equivalent commands are:

```sh
node product-design/tooling/scripts/validate.mjs
node product-design/tooling/scripts/decision-refs.mjs PD-014
```

## Deferred topics

The phase roadmap is `../00-governance/design-roadmap.mdx`; its stable `PH-*` IDs are the allowed targets for `../00-governance/deferred-topics.json`. The register uses immutable `DT-*` IDs and records open questions separately from decisions. Its schema is `../00-governance/deferred-topics.schema.json`.

From this directory, list open deferred topics with:

```sh
pnpm deferred:list
pnpm deferred:list PH-004
```

The validator checks phase IDs and statuses, move-history phase references and chain consistency, required drop rationale, resolved artifacts, decision dependencies, and historical `DT-*` IDs in Git history. A move keeps a topic open at its new `target_phase`; `pnpm deferred:list [PH-###]` therefore includes moved topics under their current target. From the repository root, run `node product-design/tooling/scripts/deferred-list.mjs [PH-004]`.

## D2 prerequisite

See [DIAGRAMS.md](DIAGRAMS.md) for the diagram styling and review workflow.

When `.d2` files exist, validation requires the `d2` CLI. On macOS, install it with `brew install d2`; verify with `d2 version`. The official D2 install script also supports previewing its actions with `curl -fsSL https://d2lang.com/install.sh | sh -s -- --dry-run` before installation.

`pnpm build --webpack` generates the diagram assets and manifest automatically. The
palette and semantic D2 classes live in `scripts/diagram-theme.mjs`; apply a class
to each node/edge in canonical `.d2` source, then inspect both themes and the
expanded viewer. The viewer provides zoom/pan and PNG/SVG downloads. Keep
Devanagari labels short enough to fit the rendered boxes; D2's text measurements
can differ from browser glyph layout. Use `d2 path/to/diagram.d2 /tmp/diagram.svg`
for a quick source check.

## UAT deployment

The web Dockerfile builds this renderer as a separate build stage from canonical
MDX/D2/JSON. Its export is copied to `/app/product-docs-export`, outside the
web public directory. The web route serves each file after a server-side
`PRODUCT_DOCS_MODE` gate and an API check for the current `PRODUCT_DOCS_VIEW`
grant. Production sets `PRODUCT_DOCS_MODE=off` even though its web image contains
the static bytes. No separate renderer server or Container App is deployed.

For local gateway testing, run `pnpm build --webpack` here, run the normal web
and API apps, set `PRODUCT_DOCS_MODE=granted` in both app environments, and grant
`PRODUCT_DOCS_VIEW` through `/admin/users/[id]`. The web route reads the local
export from `product-design/tooling/out` unless `PRODUCT_DOCS_STATIC_ROOT` is
set. No separate renderer server is needed.
