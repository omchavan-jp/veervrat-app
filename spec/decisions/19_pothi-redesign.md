# Pothi Redesign
_Last updated: 2026-06-02 | Round: R1_

## Context

The Veervrat Pothi is a physical ceremonial booklet (ref: `00 Veervrat Pothi - August 2023 final 10 Aug.pdf`). It is a structured ceremony guide — not a shloka collection. The digital app must reflect this distinction:

- **Pothi page** = digital version of the ceremonial booklet — structured sections, each with context, shlokas, and commentary
- **Shlokas page** = broader reference collection of shlokas that can be referenced in Veervrat but are not necessarily in the Pothi
- **Resources page** = reference materials: PDFs, videos, articles, links — anything that supports study and practice

These are three distinct entities. The previous spec conflated them.

---

## Confirmed Decisions

### Pothi Page Structure

The Pothi is organized into **sections**. Each section contains:
- **Section intro/commentary** — contextual explanation (the "Adhvaryu speech" equivalent)
- **One or more shlokas** — each with: Devanagari text, transliteration, English meaning, source citation (e.g. Gita 6.5, Yajurveda 19/30)
- **Congregation response text** (where applicable)
- **Post-shloka commentary** — explanation of the shloka's meaning in the context of Veervrat
- **Optional resource links** — reference to Resources page items

**Sections of the Veervrat Pothi (from source document):**
1. Shri Hanuman va Mathrubhumi Stavan
2. Veervrat mhanje kaay? (What is Veervrat?)
3. Veervratachi Sadhana — with 6 sub-sections:
   - 3.1 Swavalamban (Self-reliance)
   - 3.2 Sanghatana va Netrutva (Organisation & Leadership)
   - 3.3 Udyamshilata (Initiative/Enterprise)
   - 3.4 Sangharsha (Struggle/Conflict)
   - 3.5 Dhyeyabhimukha (Goal-orientation)
   - 3.6 Dainadin Upasana (Daily Practice)
4. Gadya Prarthana (Prose Prayer)
5. Yagnaagnichya Sakshine (In the Witness of Sacred Fire)
6. Vratchinha Dharana (Taking the Vrat Symbol)

The final section of the physical pothi ("Veervratachya Upvratanchi va Tyatil Gunachi Yadi") is a reference list of the 6 upvrats and their qualities — displayed as an appendix/reference, not a ceremony section.

### Shlokas Page (separate from Pothi)
- Broader reference collection of shlokas that relate to Veervrat but may not be in the Pothi.
- Searchable, filterable by source (Gita, Upanishad, Vivekachudamani, Subhashita, Dasabodh, etc.).
- Each shloka: Devanagari + transliteration + meaning + source citation.
- Tags: formal entity tags (virtue/subvirtue/weakness/sentence) + loose theme labels.
- Each shloka can link to Resources page items.
- Accessible to guests.
- Nav section shows a few shlokas + "See more" → full Shlokas page.

### Resources Page (separate from both)
- Reference materials that support Pothi sections, shlokas, and broader Veervrat study.
- **Entry types:** file uploads (PDFs, images) + external links (articles, blogs, social media posts, YouTube videos, books).
- **Per resource entry:**
  - Thumbnail (auto-generated from OG data for links; uploaded or generated for files)
  - Title
  - Optional one-two liner: what this resource is and when/how/why to use it
  - Optional detailed description (free-form rich text): e.g. author background, why the book matters, what to read/watch first, context
  - Tags: formal entity tags (virtue, subvirtue, weakness, sentence, ERC) + loose theme labels
- Resources are referenced from: Pothi sections, Shlokas page entries, Shlokas detail modal, and inline during admin/mod content editing.
- New resources can be created from within Pothi/Shloka editing flows (add existing or create new).

### Shloka Detail Modal (updated)
- 5 sections as in current prototype + one additional:
  - **Section 6:** virtue-first tags (virtues/subvirtues) + loose theme labels
- From this modal: link to "See more shlokas" → Shlokas page; link to "Why we study shlokas" modal
- "Why we study shlokas" modal accessible from: Shlokas page, right sidebar

### Pothi Modal ("What and why we created the Pothi")
- Explains what the Pothi is, its history, and its role in Veervrat practice
- Accessible from: Pothi page, right sidebar (alongside shloka philosophy link)

### Navigation Between the Three
- Pothi page → Shlokas page: via nav section showing preview shlokas + "See more" CTA
- Pothi/Shlokas → Resources: via inline resource tags on sections/shlokas + Resources page link
- Resources → back to referring entity: contextual back link

## Open Questions (area-specific)
- Pothi sections — are they admin-only editable or also moderator-editable? (Assumed admin-only given they are core ceremony content)
- Can new Pothi sections be added (beyond the 6 in the physical booklet) for digital-only content?
- Resources page — is it publicly accessible (guests) or auth-required?
- Loose theme tags on resources — managed taxonomy or fully free-form?

## Flags
- ⚠ Pothi ≠ Shlokas ≠ Resources — three distinct pages with distinct purposes. Must not conflate in implementation or navigation.
- ⚠ Resource thumbnails for YouTube/social links require server-side OG metadata fetch — same system as chat link previews (already specced in integrations).
