# suggestions

## Overview

Anchored suggestion creation, route normalization and status display. Client-side selection and in-page markers for content suggestions.

## Interface

- routePattern reconstructs route parameter placeholders; SuggestionMode accepts active/onExit [suggestion-mode.tsx:routePattern] [suggestion-mode.tsx:SuggestionMode].
- SuggestionPanel accepts PanelContext, onClose and onCreated; StatusPill accepts SuggestionStatus [suggestion-panel.tsx:SuggestionPanel] [suggestion-panel.tsx:PanelContext] [status-pill.tsx:StatusPill].
- SuggestionPicker accepts onPick(Element) and onCancel callbacks [suggestion-picker.tsx:SuggestionPicker].
- SuggestionPins accepts ContentSuggestion[] and renders positioned markers [suggestion-pins.tsx:SuggestionPins].

## Invariants

- Route parameter values are replaced longest first [suggestion-mode.tsx:routePattern].
- Panel requires nonblank title, supports five kinds and both en/mr bodies; EDIT_COPY includes current anchored text [suggestion-panel.tsx:SuggestionPanel] [suggestion-panel.tsx:KINDS].
- Picker catches clicks before they reach underlying page and targets blockElementFor; Escape cancels [suggestion-picker.tsx:SuggestionPicker].
- Pin lookup prefers exact data-suggest anchor key, then first matching text prefix; unresolved suggestions are omitted [suggestion-pins.tsx:locate].

## Side Effects

- Queries the author’s suggestions for route/entity and invalidates their query after creation [suggestion-mode.tsx:SuggestionMode].
- Captures selected element anchor and current URL; submits suggestion to API and displays success/error toast [suggestion-mode.tsx:SuggestionMode] [suggestion-panel.tsx:SuggestionPanel].
- Picker temporarily hides its overlay for elementFromPoint and registers mouse, keyboard and click handlers with cleanup [suggestion-picker.tsx:SuggestionPicker].
- Pins measure DOM after animation frame and on scroll/resize; handlers and frame are cleaned up [suggestion-pins.tsx:SuggestionPins].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
