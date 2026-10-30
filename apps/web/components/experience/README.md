# experience

## Overview

Client components for creating and editing experience logs, selecting entity tags, and extracting text previews.

## Interface

- EntityTagPicker accepts selected tags and onChange; SelectedTag exposes entityType, entityId and label [entity-tag-picker.tsx:EntityTagPicker] [entity-tag-picker.tsx:SelectedTag].
- ExperienceEditor accepts optional journeyId and existing log [experience-editor.tsx:ExperienceEditor].
- excerptFromDoc flattens Tiptap text into a bounded preview [experience-excerpt.ts:excerptFromDoc].

## Invariants

- Tag search begins at two trimmed characters and tags are unique by type and ID [entity-tag-picker.tsx:EntityTagPicker].
- Editor defaults to ONLY_ME, retains a visibility selection and disallows saving empty content [experience-editor.tsx:ExperienceEditor].

## Side Effects

- Searches entities; saves or publishes logs, uploads images, invalidates experience queries and navigates to /experiences [entity-tag-picker.tsx:EntityTagPicker] [experience-editor.tsx:ExperienceEditor].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
