# Product design tooling

> **Map:** This directory contains optional presentation tooling and repository checks. It is separate from the end-user app packages. MDX and D2 remain the editable source of truth if this tooling is removed.

## Renderer

The standalone Fumadocs app reads the workspace MDX files directly through the documented Fumadocs MDX macro source. Its package and dependencies are isolated here and do not enter the end-user app workspace/runtime. From this directory, install its local dependencies once and run:

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000/product-docs` (or the port printed by Next.js). The
renderer has a `/product-docs` base path and opens the workspace `README.mdx`
there. MDX remains the source of truth; Fumadocs only presents it. D2 files
are authored as `.d2` source and rendered on demand by the D2 CLI; no checked-in
SVG copy is used. Links to the canonical governance JSON files are served from
the same source directory.

To verify the production renderer build from this directory, run:

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

When `.d2` files exist, validation requires the `d2` CLI. On macOS, install it with `brew install d2`; verify with `d2 version`. The official D2 install script also supports previewing its actions with `curl -fsSL https://d2lang.com/install.sh | sh -s -- --dry-run` before installation.

Render an authored diagram from `product-design` with `d2 path/to/diagram.d2 /tmp/diagram.svg`.

## UAT deployment

The Dockerfile here builds this renderer from the repository root context,
including canonical MDX, governance JSON, and D2 sources. Its runtime uses a
pinned D2 binary and Next standalone output. The UAT Container App has internal
ingress only. The existing Veervrat web app serves `/product-docs/*` through a
server-side gate and checks `PRODUCT_DOCS_VIEW` against the API on each request.
The renderer has no public hostname. Production creates no docs Container App
and sets `PRODUCT_DOCS_MODE=off`.

For local gateway testing, run this renderer on port 3002, set the web app's
`PRODUCT_DOCS_INTERNAL_URL=http://localhost:3002` and `PRODUCT_DOCS_MODE=granted`,
and grant `PRODUCT_DOCS_VIEW` through `/admin/users/[id]`. The API must have
`PRODUCT_DOCS_MODE=granted` too. Otherwise the gateway responds with 404.
