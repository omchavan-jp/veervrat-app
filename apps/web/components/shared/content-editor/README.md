# content-editor

## Overview

Dialog for editing staged bilingual content overrides. In-context translation editing toolbar and staged override history.

## Interface

- ContentEditPanel accepts a nullable selection of keys and onClose callback [content-edit-panel.tsx:ContentEditPanel].
- ContentEditor opens edit and staged panels and publishes overrides [content-editor.tsx:ContentEditor].
- ContentStagedList accepts open/onOpenChange and displays staged edits [content-staged-list.tsx:ContentStagedList].

## Invariants

- Selected keys default checked; fields seed once per selection; divergent values and missing translations are indicated [content-edit-panel.tsx:ContentEditPanel].
- Save is disabled for ICU placeholder mismatch; empty and unchanged values are skipped [content-edit-panel.tsx:ContentEditPanel].
- The caller must gate editor rendering by environment and CONTENT_EDIT grant [content-editor.tsx:ContentEditor].
- Alt-click matches text to translation keys and uses dialog and route context to disambiguate [content-editor.tsx:ContentEditorInner].
- Staged list combines en and mr and sorts newest first [content-staged-list.tsx:LOCALES].

## Side Effects

- Lists staged overrides, upserts changed values or discards staged entries; success invalidates query, refreshes router and closes dialog [content-edit-panel.tsx:ContentEditPanel].
- Sets ve_ce cookie, captures document clicks while editing, changes cursor and saves toolbar position in localStorage [content-editor.tsx:ContentEditorInner].
- Publishes and discards overrides; discard invalidates staged query and refreshes router [content-editor.tsx:ContentEditorInner] [content-staged-list.tsx:ContentStagedList].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
