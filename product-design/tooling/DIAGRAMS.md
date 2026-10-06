# Product-design diagrams

Canonical diagrams live as `.d2` files under `product-design/`. Edit the D2 source,
not generated SVG or PNG. The renderer builds both light and dark SVGs from that
source and emits a manifest that maps document references to the generated assets.

## Visual approach

- Use semantic classes (`core`, `outcome`, `process`, `platform`, `growth`,
  `weakness`) to show the role of each node. Use `progression` for a primary
  sequence and `support` for a secondary relationship.
- Keep shared colors, dimensions, typography, borders, and ELK layout settings in
  `scripts/diagram-theme.mjs`. The generator applies this theme to both modes;
  avoid one-off colors in canonical diagrams unless the meaning requires them.
- Write short labels and make edge direction meaningful. Check that Devanagari
  glyphs fit in the rendered boxes; D2 and browsers can measure them differently.
- Inspect both light and dark output at page width and in the expanded viewer.
  The viewer supports pan, zoom, and SVG/PNG download. Use the browser print
  view for a static handout.

## Add or change a diagram

1. Edit the canonical `.d2` file and its MDX reference.
2. Run `pnpm validate` in this directory to check references and D2 syntax.
3. Run `pnpm build --webpack` to generate the static assets and search index.
4. Open the affected page locally and inspect both themes, links, labels, and
   expanded-view controls at desktop and mobile widths.

CI and the web Docker build install D2 v0.9.0. Keep that version aligned when
updating either build. Generated assets are packaged with the protected static
export in the web image; the server authorizes each `/product-docs` request before
reading them.
