# Pothi, Shlokas, and Resources are three distinct pages and data entities

The Pothi (ceremonial guide), Shlokas (reference collection), and Resources (external materials) are separate pages with separate data models — not a single unified content library.

An earlier spec conflated these into a single "Pothi" content area. This was incorrect because: the Veervrat Pothi is a structured ceremonial booklet with a fixed section structure (ceremony guide, not a shloka collection); the Shlokas page is a broader browsable reference that includes texts not in the Pothi; the Resources page holds external materials (PDFs, videos, articles) that support study across both.

## Considered Options
- **Unified content library** — rejected: conflates ceremonial structure (Pothi) with reference material (Shlokas) and external media (Resources); would require awkward filtering and lose the semantic meaning of each.
- **Three separate entities** — chosen: each has a distinct purpose, distinct data model, and distinct user mental model. They reference each other via links, not by merging.
