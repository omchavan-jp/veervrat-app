# Brand assets

## Open Graph image (`app/opengraph-image.png`)

`opengraph-image.html` is the source of truth for the link-preview image. It is
rendered to a static PNG with a real browser (not Next's `ImageResponse`/satori,
which does not shape Devanagari conjuncts).

To regenerate after editing `opengraph-image.html`:

```bash
# any Chromium-based browser works (Chrome, Brave, Edge, or Playwright's chromium)
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --headless=new --disable-gpu --hide-scrollbars --force-color-profile=srgb \
  --window-size=1200,630 --virtual-time-budget=10000 \
  --screenshot="../app/opengraph-image.png" \
  "file://$(pwd)/opengraph-image.html"
```

The favicon (`app/icon.svg`) is a plain SVG rendered by the browser, so it needs
no build step.
