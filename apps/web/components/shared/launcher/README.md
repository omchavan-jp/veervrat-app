# launcher

## Overview

Gated floating action launcher for feedback and content suggestions.

## Interface

- ActionLauncher composes feedback, suggest and my-suggestions actions [action-launcher.tsx:ActionLauncher].
- FloatingLauncher takes LauncherAction array and icon; LauncherAction provides key, label, icon and onSelect [floating-launcher.tsx:FloatingLauncher] [floating-launcher.tsx:LauncherAction].

## Invariants

- Feedback requires enabled runtime mode and FEEDBACK_WIDGET grant; suggestion actions require CONTENT_SUGGEST grant [action-launcher.tsx:ActionLauncher].
- No actions renders nothing; one action runs directly; multiple actions open a menu [floating-launcher.tsx:FloatingLauncher].

## Side Effects

- Stores snapped corner in localStorage, responds to resize and Escape, and runs action callbacks [floating-launcher.tsx:FloatingLauncher].
- My suggestions navigates to /suggestions [action-launcher.tsx:ActionLauncher].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
