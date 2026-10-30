# shared

## Overview

Shared localization, navigation, CMS information, consent and browser-cache helpers. Shared language, policy and pre-app controls. Shared theme control.

## Interface

- Exports BfcacheGuard, BilingualText and ContentText [bfcache-guard.tsx:BfcacheGuard] [bilingual-text.tsx:BilingualText] [bilingual-text.tsx:ContentText].
- Exports Crumb, Breadcrumbs, BackLink, CmsInfoModal and ConsentGate [breadcrumbs.tsx:Crumb] [breadcrumbs.tsx:Breadcrumbs] [breadcrumbs.tsx:BackLink] [cms-info-modal.tsx:CmsInfoModal] [consent-gate.tsx:ConsentGate].
- LanguageToggle supports label, icon and reveal displays [language-toggle.tsx:LanguageToggle].
- PolicyDocument takes terms/privacy CMS key and fallback title [policy-document.tsx:PolicyDocument].
- PreAppControls supports optional logout and custom class [pre-app-controls.tsx:PreAppControls].
- ThemeToggle accepts an optional className and exposes a translated theme-switch button [theme-toggle.tsx:ThemeToggle].
- [content-editor](./content-editor/README.md): Dialog for editing staged bilingual content overrides.
- [feedback](./feedback/README.md): Feedback entry widget, observation list and submission dialog.
- [launcher](./launcher/README.md): Gated floating action launcher for feedback and content suggestions.
- [suggestions](./suggestions/README.md): Anchored suggestion creation, route normalization and status display.

## Invariants

- Bilingual content orders the active locale first; compact ContentText selects Marathi when available in Marathi locale [bilingual-text.tsx:BilingualText] [bilingual-text.tsx:ContentText].
- Breadcrumb current item is unlinked; CMS modal falls back to supplied copy; consent gate renders nothing when no outstanding data [breadcrumbs.tsx:Breadcrumbs] [cms-info-modal.tsx:CmsInfoModal] [consent-gate.tsx:ConsentGate].
- Language toggle displays the target language and switches between en and mr [language-toggle.tsx:LanguageToggle].
- In Marathi locale, policy body and title prefer available Marathi content and otherwise fall back to English; other locales use English. Although PolicyDocument has separate error and unpublished branches, cmsApi.getByKey catches all request failures and returns null, so those failures reach the unpublished branch [policy-document.tsx:PolicyDocument] [../../lib/api/cms.ts:cmsApi.getByKey].
- Uses resolved theme after mounting; label is neutral before mount [theme-toggle.tsx:ThemeToggle].

## Side Effects

- Refreshes router on persisted pageshow and removes listener on cleanup [bfcache-guard.tsx:BfcacheGuard].
- Fetches CMS content when modal opens and invokes consent acceptance mutation [cms-info-modal.tsx:CmsInfoModal] [consent-gate.tsx:ConsentGate].
- Language toggle sets locale cookie, refreshes route and attempts authenticated user preference update [language-toggle.tsx:LanguageToggle].
- PolicyDocument fetches CMS page; optional logout invokes logout mutation [policy-document.tsx:PolicyDocument] [pre-app-controls.tsx:PreAppControls].
- Click calls next-themes setTheme with light or dark [theme-toggle.tsx:ThemeToggle].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
